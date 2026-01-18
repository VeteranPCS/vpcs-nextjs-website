// scripts/v2/migrate-customers-v2.ts
// Migrates customers from cleaned CSV to Attio
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-customers.csv (pre-merged, pre-filtered)
// - No RecordTypeId filtering needed
// - Phone numbers already in E.164 format
// - Both SalesforceId and ContactId available
//
// Prerequisites: None - can run independently

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface CleanedCustomerRow {
  SalesforceId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  State: string;
  City: string;
  Military_Service__c: string;
  Military_Status__c: string;
  Are_you_pre_approved_for_a_mortgage__c: string;
  How_Did_You_Hear_About_Us__c: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Source: string;
  ContactId: string;
}

// Map military service values
const MILITARY_SERVICE_MAP: Record<string, string> = {
  'Army': 'Army',
  'Navy': 'Navy',
  'Air Force': 'Air Force',
  'Marines': 'Marines',
  'Marine Corps': 'Marines',
  'Coast Guard': 'Coast Guard',
  'Space Force': 'Space Force',
};

// Map military status values
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

async function migrateCustomersV2() {
  console.log('='.repeat(60));
  console.log('Migrate Customers V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Read cleaned CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-customers.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const customers: CleanedCustomerRow[] = parse(csvData, { columns: true });

  console.log(`Loaded ${customers.length} customers from cleaned CSV`);
  console.log();

  // Track mappings: SalesforceId → AttioId and ContactId → AttioId
  const sfMapping: Record<string, string> = {};
  const contactMapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const customer of customers) {
    if (!customer.Email) {
      skipped.push(`${customer.FirstName} ${customer.LastName} (${customer.SalesforceId}): No email`);
      continue;
    }

    // Build current_location from City and State
    let currentLocation: string | null = null;
    if (customer.City && customer.State) {
      currentLocation = `${customer.City}, ${customer.State}`;
    } else if (customer.State) {
      currentLocation = customer.State;
    } else if (customer.City) {
      currentLocation = customer.City;
    }

    try {
      const record = await attio.createRecord('customers', {
        name: `${customer.FirstName} ${customer.LastName}`,
        salesforce_id: customer.SalesforceId,
        first_name: customer.FirstName,
        last_name: customer.LastName,
        email: customer.Email,
        phone: customer.Phone || null,
        current_location: currentLocation,
        military_service: normalizeMilitaryService(customer.Military_Service__c),
        military_status: normalizeMilitaryStatus(customer.Military_Status__c),
      });

      const attioId = record.data.id.record_id;
      sfMapping[customer.SalesforceId] = attioId;
      if (customer.ContactId) {
        contactMapping[customer.ContactId] = attioId;
      }
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount} customers...`);
      }
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('409')) {
        skipped.push(`${customer.FirstName} ${customer.LastName}: Duplicate email ${customer.Email}`);
      } else {
        errorCount++;
        errors.push(`${customer.FirstName} ${customer.LastName} (${customer.SalesforceId}): ${error.message}`);
      }
    }
  }

  // Save mappings
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  const sfMappingPath = path.join(mappingsDir, 'customers.json');
  const contactMappingPath = path.join(mappingsDir, 'customers-by-contact.json');
  fs.writeFileSync(sfMappingPath, JSON.stringify(sfMapping, null, 2));
  fs.writeFileSync(contactMappingPath, JSON.stringify(contactMapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} customers`);
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

migrateCustomersV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
