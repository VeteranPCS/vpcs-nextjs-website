// scripts/migrate-agents.ts
// Migrates agents from Salesforce Account records to Attio
//
// Key behaviors:
// 1. Filters to Agent RecordType only (0124x000000YzFsAAK)
// 2. Joins with Contact records to get email addresses
// 3. Normalizes phone numbers to E.164 format
//
// Prerequisites: None - can run after setup-attio-schema.ts

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Agent RecordTypeId from Salesforce (15-char version as exported in CSV)
const AGENT_RECORD_TYPE_ID = '0124x000000YzFs';

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
  Website: string;  // Used for brokerage name
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
}

interface ContactRow {
  Id: string;
  Email: string;
  MobilePhone: string;
  Phone: string;
  // Fields that have data (unlike x-prefixed Account fields which are empty)
  Military_Service__c: string;
  Military_Status__c: string;
  Agent_Bio__c: string;
  License_Number__c: string;  // Agent's personal RE license number
  // Brokerage and managing broker fields (Contact has 81%+ population vs Account at 0-12%)
  Brokerage_Name__c: string;
  Active_on_Website__c: string;  // '1' or '0'
  Managing_Broker_Name__c: string;
  Managing_Broker_Email__c: string;
  Managing_Broker_Phone__c: string;
}

// Map military service values from Salesforce to Attio options
const MILITARY_SERVICE_MAP: Record<string, string> = {
  'Army': 'Army',
  'Navy': 'Navy',
  'Air Force': 'Air Force',
  'Marines': 'Marines',
  'Marine Corps': 'Marines',  // Salesforce uses "Marine Corps", Attio uses "Marines"
  'Coast Guard': 'Coast Guard',
  'Space Force': 'Space Force',
};

// Map military status values from Salesforce to Attio options
const MILITARY_STATUS_MAP: Record<string, string> = {
  'Active Duty': 'Active Duty',
  'Active': 'Active Duty',  // Normalize "Active" to "Active Duty"
  'Veteran': 'Veteran',
  'Retired': 'Retired',  // 20+ years service - distinct from Veteran
  'Reserves': 'Reserves',
  'Reserve': 'Reserves',  // Normalize singular
  'National Guard': 'National Guard',
  'Spouse': 'Spouse',
};

// Normalize military service - handle semicolon-separated multi-values
function normalizeMilitaryService(value: string | undefined): string | null {
  if (!value) return null;
  // Take first value if multi-select (e.g., "Army;Navy")
  const firstValue = value.split(';')[0].trim();
  return MILITARY_SERVICE_MAP[firstValue] || null;
}

// Normalize military status - handle semicolon-separated multi-values
function normalizeMilitaryStatus(value: string | undefined): string | null {
  if (!value) return null;
  // Take first value if multi-select (e.g., "Spouse;Veteran")
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

  // Return as-is if can't normalize (might be international)
  return phone;
}

async function migrateAgents() {
  console.log('='.repeat(60));
  console.log('Migrate Agents');
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

  // Filter to agent accounts only
  const agentAccounts = accounts.filter(a =>
    a.RecordTypeId === AGENT_RECORD_TYPE_ID && a.IsDeleted === '0'
  );
  console.log(`Found ${agentAccounts.length} agent accounts`);
  console.log();

  // Mapping: Salesforce ID → Attio ID
  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const account of agentAccounts) {
    // Get contact for email
    const contact = contactMap[account.PersonContactId];
    const email = contact?.Email;

    if (!email) {
      skipped.push(`${account.FirstName} ${account.LastName} (${account.Id}): No email found`);
      continue;
    }

    // Get best phone number (prefer mobile)
    const phone = normalizePhone(contact?.MobilePhone || contact?.Phone || account.Phone);

    // Determine if active on website (Contact.Active_on_Website__c is 98.5% populated as '1'/'0')
    // Fallback to Account.Added_to_Website_Date__c if Contact field not available
    const activeOnWebsite = contact?.Active_on_Website__c
      ? contact.Active_on_Website__c === '1'
      : !!account.Added_to_Website_Date__c;

    try {
      const record = await attio.createRecord('agents', {
        name: `${account.FirstName} ${account.LastName}`,  // Human-readable display name
        salesforce_id: account.Id,
        first_name: account.FirstName,
        last_name: account.LastName,
        email: email,
        phone: phone,
        // Brokerage info: Contact has 81% vs Account at 12%
        brokerage_name: contact?.Brokerage_Name__c || account.Website || null,
        brokerage_license: account.Brokerage_License_Number__c || null,
        license_number: contact?.License_Number__c || null,  // Agent's personal RE license
        // Managing broker: Contact has 35-41% vs Account at 0%
        managing_broker_name: contact?.Managing_Broker_Name__c || account.Managing_Broker__c || null,
        managing_broker_email: contact?.Managing_Broker_Email__c || account.Managing_Broker_Email__c || null,
        managing_broker_phone: normalizePhone(contact?.Managing_Broker_Phone__c || account.Managing_Broker_Phone__c),
        military_service: normalizeMilitaryService(contact?.Military_Service__c || account.xMilitary_Service__c),
        military_status: normalizeMilitaryStatus(contact?.Military_Status__c || account.xMilitary_Status__c),
        bio: contact?.Agent_Bio__c || account.xAgent_Bio__c || null,
        commission_split: account.Commission_Split__c ? parseFloat(account.Commission_Split__c) : null,
        active_on_website: activeOnWebsite,
        contract_signed_date: account.Contract_Signed_Date__c || null,
        contract_url: account.Contract_URL__c || null,
        added_to_website_date: account.Added_to_Website_Date__c || null,
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
  const mappingPath = path.join(mappingsDir, 'agents.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} agents`);
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
migrateAgents().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
