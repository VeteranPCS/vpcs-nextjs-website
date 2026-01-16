// scripts/backfill-agent-license-numbers.ts
// Backfills license_number for existing agents from Contact.License_Number__c
//
// Join path:
//   Contact.AccountId → Account.Id → agents.json mapping → Attio record ID
//
// Prerequisites: migrate-agents.ts must have been run (agents.json mapping exists)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface ContactRow {
  Id: string;
  AccountId: string;
  License_Number__c: string;
}

async function backfillLicenseNumbers() {
  console.log('='.repeat(60));
  console.log('Backfill Agent License Numbers');
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

  // Read Contact.csv
  const dataDir = path.join(process.cwd(), 'data/salesforce');
  const contactsCsv = fs.readFileSync(path.join(dataDir, 'Contact.csv'), 'utf-8');
  const contacts: ContactRow[] = parse(contactsCsv, { columns: true });
  console.log(`Loaded ${contacts.length} contacts`);

  // Build lookup: AccountId → License_Number__c
  const licenseByAccountId: Record<string, string> = {};
  let contactsWithLicense = 0;

  for (const contact of contacts) {
    if (contact.License_Number__c && contact.License_Number__c.trim()) {
      licenseByAccountId[contact.AccountId] = contact.License_Number__c.trim();
      contactsWithLicense++;
    }
  }
  console.log(`Found ${contactsWithLicense} contacts with license numbers`);
  console.log();

  // Update each agent in Attio
  let updatedCount = 0;
  let skippedNoLicense = 0;
  let skippedNotInMapping = 0;
  let errorCount = 0;

  // Iterate through agents mapping
  const accountIds = Object.keys(agentsMapping);
  console.log(`Processing ${accountIds.length} agents...`);
  console.log();

  for (const accountId of accountIds) {
    const attioId = agentsMapping[accountId];
    const licenseNumber = licenseByAccountId[accountId];

    if (!licenseNumber) {
      skippedNoLicense++;
      continue;
    }

    try {
      await attio.updateRecord('agents', attioId, {
        license_number: licenseNumber,
      });
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
  console.log(`✓ Updated: ${updatedCount} agents with license numbers`);
  console.log(`⏭️  Skipped (no license in Contact): ${skippedNoLicense}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Run backfill
backfillLicenseNumbers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
