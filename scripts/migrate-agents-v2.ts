// scripts/v2/migrate-agents-v2.ts
// Migrates agents from cleaned CSV to Attio
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-agents.csv (pre-merged, pre-filtered)
// - No RecordTypeId filtering needed
// - No Contact join needed (data already merged)
// - Phone numbers already in E.164 format
// - Both SalesforceId and ContactId available
//
// Prerequisites: None - can run after states exist

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface CleanedAgentRow {
  SalesforceId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  State: string;
  City: string;
  State_s_Licensed_in__c: string;
  License_Number__c: string;
  Brokerage_Name__c: string;
  Agent_Bio__c: string;
  Military_Service__c: string;
  Military_Status__c: string;
  Active_on_Website__c: string;
  Cities_Serviced__c: string;
  Bases_Serviced__c: string;
  Real_Estate_Expertise__c: string;
  Managing_Broker_Name__c: string;
  Managing_Broker_Email__c: string;
  Date_Active__c: string;
  Referral_Contract_2024_Date__c: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Source: string;
  ContactId: string;
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
  'Retired': 'Retired',
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

async function migrateAgentsV2() {
  console.log('='.repeat(60));
  console.log('Migrate Agents V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Read cleaned CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-agents.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const agents: CleanedAgentRow[] = parse(csvData, { columns: true });

  console.log(`Loaded ${agents.length} agents from cleaned CSV`);
  console.log();

  // Track mappings: SalesforceId → AttioId and ContactId → AttioId
  const sfMapping: Record<string, string> = {};
  const contactMapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const agent of agents) {
    // Skip if no email
    if (!agent.Email) {
      skipped.push(`${agent.FirstName} ${agent.LastName} (${agent.SalesforceId}): No email`);
      continue;
    }

    try {
      const record = await attio.createRecord('agents', {
        name: `${agent.FirstName} ${agent.LastName}`,
        salesforce_id: agent.SalesforceId,
        first_name: agent.FirstName,
        last_name: agent.LastName,
        email: agent.Email,
        phone: agent.Phone || null,  // Already E.164 formatted
        brokerage_name: agent.Brokerage_Name__c || null,
        license_number: agent.License_Number__c || null,
        managing_broker_name: agent.Managing_Broker_Name__c || null,
        managing_broker_email: agent.Managing_Broker_Email__c || null,
        military_service: normalizeMilitaryService(agent.Military_Service__c),
        military_status: normalizeMilitaryStatus(agent.Military_Status__c),
        bio: agent.Agent_Bio__c || null,
        active_on_website: agent.Active_on_Website__c === '1' || agent.Active_on_Website__c === '1.0',
        added_to_website_date: agent.Date_Active__c || null,
        contract_signed_date: agent.Referral_Contract_2024_Date__c || null,
      });

      const attioId = record.data.id.record_id;
      sfMapping[agent.SalesforceId] = attioId;
      if (agent.ContactId) {
        contactMapping[agent.ContactId] = attioId;
      }
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount} agents...`);
      }
    } catch (error: any) {
      // Check for duplicate email
      if (error.message.includes('unique') || error.message.includes('409')) {
        skipped.push(`${agent.FirstName} ${agent.LastName}: Duplicate email ${agent.Email}`);
      } else {
        errorCount++;
        errors.push(`${agent.FirstName} ${agent.LastName} (${agent.SalesforceId}): ${error.message}`);
      }
    }
  }

  // Ensure mappings directory exists
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  // Save mapping files
  const sfMappingPath = path.join(mappingsDir, 'agents.json');
  const contactMappingPath = path.join(mappingsDir, 'agents-by-contact.json');
  fs.writeFileSync(sfMappingPath, JSON.stringify(sfMapping, null, 2));
  fs.writeFileSync(contactMappingPath, JSON.stringify(contactMapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} agents`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 5).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 5) {
      console.log(`   ... and ${skipped.length - 5} more`);
    }
  }
  if (errors.length > 0) {
    console.log();
    console.log('Errors:');
    errors.slice(0, 10).forEach(e => console.log(`   ❌ ${e}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }
  console.log();
  console.log(`📁 Mapping saved to: ${sfMappingPath}`);
  console.log(`📁 Contact mapping saved to: ${contactMappingPath}`);
}

// Run migration
migrateAgentsV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
