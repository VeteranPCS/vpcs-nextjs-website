// scripts/v2/migrate-lenders-v2.ts
// Migrates lenders from cleaned CSV to Attio
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-lenders.csv (pre-merged, pre-filtered)
// - No RecordTypeId filtering needed
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

interface CleanedLenderRow {
  SalesforceId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  State: string;
  City: string;
  Individual_NMLS_ID__c: string;
  Company_NMLS_ID__c: string;
  Brokerage_Name__c: string;
  State_s_Licensed_in__c: string;
  Military_Service__c: string;
  Military_Status__c: string;
  Active_on_Website__c: string;
  Date_Active__c: string;
  Agent_Bio__c: string;
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

function normalizeMilitaryService(value: string | undefined): string | null {
  if (!value) return null;
  const firstValue = value.split(';')[0].trim();
  return MILITARY_SERVICE_MAP[firstValue] || null;
}

function normalizeMilitaryStatus(value: string | undefined): string | null {
  if (!value) return null;
  const firstValue = value.split(';')[0].trim();
  return MILITARY_STATUS_MAP[firstValue] || null;
}

async function migrateLendersV2() {
  console.log('='.repeat(60));
  console.log('Migrate Lenders V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Read cleaned CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-lenders.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lenders: CleanedLenderRow[] = parse(csvData, { columns: true });

  console.log(`Loaded ${lenders.length} lenders from cleaned CSV`);
  console.log();

  // Track mappings
  const sfMapping: Record<string, string> = {};
  const contactMapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const lender of lenders) {
    if (!lender.Email) {
      skipped.push(`${lender.FirstName} ${lender.LastName} (${lender.SalesforceId}): No email`);
      continue;
    }

    try {
      const record = await attio.createRecord('lenders', {
        name: `${lender.FirstName} ${lender.LastName}`,
        salesforce_id: lender.SalesforceId,
        first_name: lender.FirstName,
        last_name: lender.LastName,
        email: lender.Email,
        phone: lender.Phone || null,
        individual_nmls: lender.Individual_NMLS_ID__c || null,
        company_nmls: lender.Company_NMLS_ID__c || null,
        brokerage_name: lender.Brokerage_Name__c || null,
        // Note: states_licensed skipped - select options not configured in Attio
        // states_licensed: lender.State_s_Licensed_in__c ? lender.State_s_Licensed_in__c.split(';').map(s => s.trim()).filter(Boolean) : null,
        military_service: normalizeMilitaryService(lender.Military_Service__c),
        military_status: normalizeMilitaryStatus(lender.Military_Status__c),
        bio: lender.Agent_Bio__c || null,
        active_on_website: lender.Active_on_Website__c === '1' || lender.Active_on_Website__c === '1.0',
        added_to_website_date: lender.Date_Active__c || null,
      });

      const attioId = record.data.id.record_id;
      sfMapping[lender.SalesforceId] = attioId;
      if (lender.ContactId) {
        contactMapping[lender.ContactId] = attioId;
      }
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount} lenders...`);
      }
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('409')) {
        skipped.push(`${lender.FirstName} ${lender.LastName}: Duplicate email ${lender.Email}`);
      } else {
        errorCount++;
        errors.push(`${lender.FirstName} ${lender.LastName} (${lender.SalesforceId}): ${error.message}`);
      }
    }
  }

  // Save mappings
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  const sfMappingPath = path.join(mappingsDir, 'lenders.json');
  const contactMappingPath = path.join(mappingsDir, 'lenders-by-contact.json');
  fs.writeFileSync(sfMappingPath, JSON.stringify(sfMapping, null, 2));
  fs.writeFileSync(contactMappingPath, JSON.stringify(contactMapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} lenders`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 5).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 5) console.log(`   ... and ${skipped.length - 5} more`);
  }
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => console.log(`   ❌ ${e}`));
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }
  console.log();
  console.log(`📁 Mapping saved to: ${sfMappingPath}`);
  console.log(`📁 Contact mapping saved to: ${contactMappingPath}`);
}

migrateLendersV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
