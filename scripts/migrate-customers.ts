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

// Customer RecordTypeId from Salesforce (15-char version as exported in CSV)
const CUSTOMER_RECORD_TYPE_ID = '0124x000000Z83F';

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
  // Fields that have data (unlike x-prefixed Account fields which are empty)
  Military_Service__c: string;
  Military_Status__c: string;
  Current_location__c: string;
  City_and_or_Base_you_are_moving_to__c: string;
}

// Map military service values from Salesforce to Attio options
const MILITARY_SERVICE_MAP: Record<string, string> = {
  'Army': 'Army',
  'Navy': 'Navy',
  'Air Force': 'Air Force',
  'Marines': 'Marines',
  'Marine Corps': 'Marines',
  'Coast Guard': 'Coast Guard',
  'Space Force': 'Space Force',
};

// Map military status values from Salesforce to Attio options
const MILITARY_STATUS_MAP: Record<string, string> = {
  'Active Duty': 'Active Duty',
  'Active': 'Active Duty',
  'Veteran': 'Veteran',
  'Retired': 'Retired',  // 20+ years service - distinct from Veteran
  'Reserves': 'Reserves',
  'Reserve': 'Reserves',
  'National Guard': 'National Guard',
  'Spouse': 'Spouse',
};

// Normalize military service - handle semicolon-separated multi-values
function normalizeMilitaryService(value: string | undefined): string | null {
  if (!value) return null;
  const firstValue = value.split(';')[0].trim();
  return MILITARY_SERVICE_MAP[firstValue] || null;
}

// Normalize military status - handle semicolon-separated multi-values
function normalizeMilitaryStatus(value: string | undefined): string | null {
  if (!value) return null;
  const firstValue = value.split(';')[0].trim();
  return MILITARY_STATUS_MAP[firstValue] || null;
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

  // Return null if can't normalize - allows record creation without phone
  // (phone is optional in Attio schema, but malformed phones cause API errors)
  return null;
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

  // Agents who also used VeteranPCS service as customers - need Customer records too
  // These agents have customer deals but were never migrated as customers
  const agentsWhoAreAlsoCustomers = [
    '0014x00000KAObBAAX',  // Ricardo Garcia - 1 deal, $125k
    '0014x00000KSLaeAAH',  // Elisa Amusu - 1 deal, $300k
    '0014x00000OtW5iAAF',  // Steven Paulk - 3 deals, $1.94M
    '0014x00000OtUi9AAF',  // Jeremy Armijo - 1 deal, $445k
    '0014x00000W8w2cAAB',  // Rosa Maria Robertson - 1 deal, $195k
  ];

  // Filter to customer accounts + agents who are also customers
  const customerAccounts = accounts.filter(a =>
    (a.RecordTypeId === CUSTOMER_RECORD_TYPE_ID || agentsWhoAreAlsoCustomers.includes(a.Id)) &&
    a.IsDeleted === '0'
  );
  console.log(`Found ${customerAccounts.length} customer accounts (includes ${agentsWhoAreAlsoCustomers.length} agents who are also customers)`);
  console.log();

  // Mapping: Salesforce ID → Attio ID
  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const account of customerAccounts) {
    // Get contact for email
    const contact = contactMap[account.PersonContactId];

    // Use Gmail '+' alias for placeholder emails when email is missing
    // Format: tech+{firstname}_{lastname}_{sf_id}@veteranpcs.com
    // Gmail ignores everything after '+' and delivers to tech@veteranpcs.com
    let email = contact?.Email;
    if (!email) {
      const firstName = (account.FirstName || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
      const lastName = (account.LastName || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `tech+${firstName}_${lastName}_${account.Id}@veteranpcs.com`;
      console.log(`   Using placeholder email for ${account.FirstName} ${account.LastName}`);
    }

    // Get best phone number (prefer mobile)
    const phone = normalizePhone(contact?.MobilePhone || contact?.Phone || account.Phone);

    // Build current location from billing address
    const currentLocation = [account.BillingCity, account.BillingState]
      .filter(Boolean)
      .join(', ') || null;

    try {
      const record = await attio.createRecord('customers', {
        name: `${account.FirstName} ${account.LastName}`,  // Human-readable display name
        salesforce_id: account.Id,
        first_name: account.FirstName,
        last_name: account.LastName,
        email: email,
        phone: phone,
        current_location: contact?.Current_location__c || currentLocation || null,
        destination_city: contact?.City_and_or_Base_you_are_moving_to__c || account.Destination_City__c || null,
        military_service: normalizeMilitaryService(contact?.Military_Service__c || account.xMilitary_Service__c),
        military_status: normalizeMilitaryStatus(contact?.Military_Status__c || account.xMilitary_Status__c),
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
