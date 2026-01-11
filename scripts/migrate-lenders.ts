// scripts/migrate-lenders.ts
// Migrates lenders from Salesforce Account records to Attio
//
// Key behaviors:
// 1. Filters to Lender RecordType only (0124x000000ZGGZAA4)
// 2. Joins with Contact records to get email addresses
// 3. Includes lender-specific fields (NMLS, company info)
//
// Prerequisites: None - can run after setup-attio-schema.ts

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Lender RecordTypeId from Salesforce
const LENDER_RECORD_TYPE_ID = '0124x000000ZGGZAA4';

interface AccountRow {
  Id: string;
  RecordTypeId: string;
  IsDeleted: string;
  FirstName: string;
  LastName: string;
  PersonContactId: string;
  Phone: string;
  BillingState: string;
  BillingStateCode: string;
  Website: string;
  Brokerage_License_Number__c: string;
  Managing_Broker__c: string;
  Managing_Broker_Email__c: string;
  Managing_Broker_Phone__c: string;
  xMilitary_Service__c: string;
  xMilitary_Status__c: string;
  xAgent_Bio__c: string;
  Added_to_Website_Date__c: string;
  Commission_Split__c: string;
  Contract_Signed_Date__c: string;
  Contract_URL__c: string;
  // Lender-specific fields
  Individual_NMLS__c: string;
  Company_NMLS__c: string;
  Company_Name__c: string;
  States_Licensed__c: string;  // Semicolon-separated list
  Annual_Fee__c: string;
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

// Parse states licensed from semicolon-separated string
function parseStatesLicensed(statesStr: string | undefined): string[] | null {
  if (!statesStr) return null;
  return statesStr.split(';').map(s => s.trim()).filter(Boolean);
}

async function migrateLenders() {
  console.log('='.repeat(60));
  console.log('Migrate Lenders');
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

  // Filter to lender accounts only
  const lenderAccounts = accounts.filter(a =>
    a.RecordTypeId === LENDER_RECORD_TYPE_ID && a.IsDeleted === '0'
  );
  console.log(`Found ${lenderAccounts.length} lender accounts`);
  console.log();

  // Mapping: Salesforce ID → Attio ID
  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const account of lenderAccounts) {
    // Get contact for email
    const contact = contactMap[account.PersonContactId];
    const email = contact?.Email;

    if (!email) {
      skipped.push(`${account.FirstName} ${account.LastName} (${account.Id}): No email found`);
      continue;
    }

    // Get best phone number (prefer mobile)
    const phone = normalizePhone(contact?.MobilePhone || contact?.Phone || account.Phone);

    // Determine if active on website
    const activeOnWebsite = !!account.Added_to_Website_Date__c;

    // Parse states licensed
    const statesLicensed = parseStatesLicensed(account.States_Licensed__c);

    try {
      const record = await attio.createRecord('lenders', {
        salesforce_id: account.Id,
        first_name: account.FirstName,
        last_name: account.LastName,
        email: email,
        phone: phone,
        brokerage_name: account.Website || null,
        brokerage_license: account.Brokerage_License_Number__c || null,
        managing_broker_name: account.Managing_Broker__c || null,
        managing_broker_email: account.Managing_Broker_Email__c || null,
        managing_broker_phone: normalizePhone(account.Managing_Broker_Phone__c),
        military_service: account.xMilitary_Service__c || null,
        military_status: account.xMilitary_Status__c || null,
        bio: account.xAgent_Bio__c || null,
        commission_split: account.Commission_Split__c ? parseFloat(account.Commission_Split__c) : null,
        active_on_website: activeOnWebsite,
        contract_signed_date: account.Contract_Signed_Date__c || null,
        contract_url: account.Contract_URL__c || null,
        added_to_website_date: account.Added_to_Website_Date__c || null,
        // Lender-specific fields
        individual_nmls: account.Individual_NMLS__c || null,
        company_nmls: account.Company_NMLS__c || null,
        company_name: account.Company_Name__c || null,
        states_licensed: statesLicensed,
        annual_fee: account.Annual_Fee__c ? parseFloat(account.Annual_Fee__c) : null,
      });

      const attioId = record.data.id.record_id;
      mapping[account.Id] = attioId;
      successCount++;

      console.log(`✓ ${account.FirstName} ${account.LastName} -> ${attioId}`);
    } catch (error: any) {
      // Check for duplicate email
      if (error.message.includes('unique') || error.message.includes('409')) {
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
  const mappingPath = path.join(mappingsDir, 'lenders.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} lenders`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 10).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 10) {
      console.log(`   ... and ${skipped.length - 10} more`);
    }
  }
  console.log(`📁 Mapping saved to: ${mappingPath}`);
  console.log();
  console.log('Next step: Run migrate-state-lenders.ts to populate State.lenders');
}

// Run migration
migrateLenders().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
