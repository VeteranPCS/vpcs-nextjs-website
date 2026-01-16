// scripts/backfill-agent-brokerage-info.ts
// Backfills brokerage name, managing broker info, and active_on_website from Contact.csv
//
// Contact.csv has the populated fields (Account.csv x-prefixed fields are empty):
//   - Brokerage_Name__c (81.4% populated vs Account.Website at 12.6%)
//   - Active_on_Website__c (98.5% as '1'/'0' vs Added_to_Website_Date__c at 49.6%)
//   - Managing_Broker_Name__c (41.3%)
//   - Managing_Broker_Email__c (40.2%)
//   - Managing_Broker_Phone__c (35.4%)
//
// Prerequisites: migrate-agents.ts must have been run (agents.json mapping exists)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface AccountRow {
  Id: string;
  PersonContactId: string;
}

interface ContactRow {
  Id: string;
  AccountId: string;
  Brokerage_Name__c: string;
  Active_on_Website__c: string;  // '1' or '0'
  Managing_Broker_Name__c: string;
  Managing_Broker_Email__c: string;
  Managing_Broker_Phone__c: string;
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

  // Return null if can't normalize (avoid API errors)
  return null;
}

async function backfillBrokerageInfo() {
  console.log('='.repeat(60));
  console.log('Backfill Agent Brokerage & Managing Broker Info');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Load agents mapping (Salesforce Account.Id → Attio record ID)
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const mappingPath = path.join(mappingsDir, 'agents.json');

  if (!fs.existsSync(mappingPath)) {
    console.error('ERROR: agents.json mapping not found. Run migrate-agents.ts first.');
    process.exit(1);
  }

  const agentsMapping: Record<string, string> = JSON.parse(
    fs.readFileSync(mappingPath, 'utf-8')
  );
  console.log(`Loaded ${Object.keys(agentsMapping).length} agent mappings`);

  // Read CSVs
  const dataDir = path.join(process.cwd(), 'data/salesforce');

  const accountsCsv = fs.readFileSync(path.join(dataDir, 'Account.csv'), 'utf-8');
  const accounts: AccountRow[] = parse(accountsCsv, { columns: true });

  const contactsCsv = fs.readFileSync(path.join(dataDir, 'Contact.csv'), 'utf-8');
  const contacts: ContactRow[] = parse(contactsCsv, { columns: true });

  console.log(`Loaded ${accounts.length} accounts`);
  console.log(`Loaded ${contacts.length} contacts`);

  // Build contact lookup: Contact.Id → ContactRow
  const contactById: Record<string, ContactRow> = {};
  for (const contact of contacts) {
    contactById[contact.Id] = contact;
  }

  // Build account lookup: Account.Id → Account (to get PersonContactId)
  const accountById: Record<string, AccountRow> = {};
  for (const account of accounts) {
    accountById[account.Id] = account;
  }

  console.log();

  // Update each agent in Attio
  let updatedCount = 0;
  let skippedNoContact = 0;
  let skippedNoData = 0;
  let errorCount = 0;

  const accountIds = Object.keys(agentsMapping);
  console.log(`Processing ${accountIds.length} agents...`);
  console.log();

  for (const accountId of accountIds) {
    const attioId = agentsMapping[accountId];
    const account = accountById[accountId];

    if (!account?.PersonContactId) {
      skippedNoContact++;
      continue;
    }

    const contact = contactById[account.PersonContactId];
    if (!contact) {
      skippedNoContact++;
      continue;
    }

    // Build update payload with available data
    const updates: Record<string, any> = {};

    // Brokerage name
    if (contact.Brokerage_Name__c?.trim()) {
      updates.brokerage_name = contact.Brokerage_Name__c.trim();
    }

    // Active on website (from '1'/'0' to boolean)
    if (contact.Active_on_Website__c) {
      updates.active_on_website = contact.Active_on_Website__c === '1';
    }

    // Managing broker info
    if (contact.Managing_Broker_Name__c?.trim()) {
      updates.managing_broker_name = contact.Managing_Broker_Name__c.trim();
    }
    if (contact.Managing_Broker_Email__c?.trim()) {
      updates.managing_broker_email = contact.Managing_Broker_Email__c.trim();
    }
    if (contact.Managing_Broker_Phone__c?.trim()) {
      const normalizedPhone = normalizePhone(contact.Managing_Broker_Phone__c);
      if (normalizedPhone) {
        updates.managing_broker_phone = normalizedPhone;
      }
    }

    // Skip if no updates
    if (Object.keys(updates).length === 0) {
      skippedNoData++;
      continue;
    }

    try {
      await attio.updateRecord('agents', attioId, updates);
      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`  Updated ${updatedCount} agents...`);
      }
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Error updating ${attioId}: ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Updated: ${updatedCount} agents`);
  console.log(`⏭️  Skipped (no contact found): ${skippedNoContact}`);
  console.log(`⏭️  Skipped (no data to update): ${skippedNoData}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run backfill
backfillBrokerageInfo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
