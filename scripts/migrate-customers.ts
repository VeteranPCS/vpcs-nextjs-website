// scripts/migrate-customers.ts
// Migrates customers from Salesforce Account records to Attio
//
// Key behaviors:
// 1. Filters to Customer RecordType only (0124x000000Z83FAAS)
// 2. Joins with Contact records to get email addresses
// 3. Links to agents/lenders via references (populated during deal migration)
//
// Prerequisites:
// - Agents migrated (for buying_agent/selling_agent references)
// - Lenders migrated (for lender references)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Customer RecordTypeId from Salesforce
const CUSTOMER_RECORD_TYPE_ID = '0124x000000Z83FAAS';

interface AccountRow {
  Id: string;
  RecordTypeId: string;
  IsDeleted: string;
  FirstName: string;
  LastName: string;
  PersonContactId: string;
  Phone: string;
  BillingCity: string;
  BillingState: string;
  xMilitary_Service__c: string;
  xMilitary_Status__c: string;
  Rank__c: string;
  Destination_City__c: string;
}

interface ContactRow {
  Id: string;
  Email: string;
  MobilePhone: string;
  Phone: string;
}

// Normalize phone to E.164 format
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // US numbers: add +1 prefix if 10 digits
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as-is if can't normalize (might be international)
  return phone;
}

async function migrateCustomers() {
  console.log('='.repeat(60));
  console.log('Migrate Customers');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Read Salesforce CSVs
  const dataDir = path.join(process.cwd(), 'data/salesforce');

  const accountsCsv = fs.readFileSync(path.join(dataDir, 'Account.csv'), 'utf-8');
  const accounts: AccountRow[] = parse(accountsCsv, { columns: true });

  const contactsCsv = fs.readFileSync(path.join(dataDir, 'Contact.csv'), 'utf-8');
  const contacts: ContactRow[] = parse(contactsCsv, { columns: true });

  console.log(`Loaded ${accounts.length} accounts`);
  console.log(`Loaded ${contacts.length} contacts`);

  // Build contact lookup map (Contact.Id → Contact)
  const contactMap: Record<string, ContactRow> = {};
  for (const contact of contacts) {
    contactMap[contact.Id] = contact;
  }

  // Filter to customer accounts only
  const customerAccounts = accounts.filter(a =>
    a.RecordTypeId === CUSTOMER_RECORD_TYPE_ID && a.IsDeleted === '0'
  );
  console.log(`Found ${customerAccounts.length} customer accounts`);
  console.log();

  // Mapping: Salesforce ID → Attio ID
  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const account of customerAccounts) {
    // Get contact for email
    const contact = contactMap[account.PersonContactId];
    const email = contact?.Email;

    if (!email) {
      skipped.push(`${account.FirstName} ${account.LastName} (${account.Id}): No email found`);
      continue;
    }

    // Get best phone number (prefer mobile)
    const phone = normalizePhone(contact?.MobilePhone || contact?.Phone || account.Phone);

    // Build current location from billing address
    const currentLocation = [account.BillingCity, account.BillingState]
      .filter(Boolean)
      .join(', ') || null;

    try {
      const record = await attio.createRecord('customers', {
        salesforce_id: account.Id,
        first_name: account.FirstName,
        last_name: account.LastName,
        email: email,
        phone: phone,
        current_location: currentLocation,
        destination_city: account.Destination_City__c || null,
        military_service: account.xMilitary_Service__c || null,
        military_status: account.xMilitary_Status__c || null,
        rank: account.Rank__c || null,
        // Note: buying_agent, selling_agent, lender refs are populated during deal migration
      });

      const attioId = record.data.id.record_id;
      mapping[account.Id] = attioId;
      successCount++;

      console.log(`✓ ${account.FirstName} ${account.LastName} -> ${attioId}`);
    } catch (error: any) {
      // Check for duplicate email (customers can have non-unique emails)
      if (error.message.includes('unique') || error.message.includes('409')) {
        // Try to find existing and use that
        try {
          const existing = await attio.queryRecords('customers', {
            filter: { email: { $eq: email } }
          });
          if (existing.length > 0) {
            mapping[account.Id] = existing[0].id;
            console.log(`⏭️  Using existing: ${account.FirstName} ${account.LastName} -> ${existing[0].id}`);
            successCount++;
            continue;
          }
        } catch {
          // Ignore query errors
        }
        skipped.push(`${account.FirstName} ${account.LastName}: Duplicate email ${email}`);
      } else {
        errorCount++;
        console.error(`❌ ${account.FirstName} ${account.LastName}: ${error.message}`);
      }
    }
  }

  // Ensure mappings directory exists
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  // Save mapping file
  const mappingPath = path.join(mappingsDir, 'customers.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} customers`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 10).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 10) {
      console.log(`   ... and ${skipped.length - 10} more`);
    }
  }
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

// Run migration
migrateCustomers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
