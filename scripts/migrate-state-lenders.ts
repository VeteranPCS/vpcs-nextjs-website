// scripts/migrate-state-lenders.ts
// Converts lender area assignments from Salesforce to State.lenders in Attio
//
// In Salesforce, lenders were assigned to "state-level areas" (areas where name = state name)
// In Attio, lenders are assigned directly to States via State.lenders multi-ref
//
// Prerequisites:
// - States must be migrated first (data/mappings/states.json)
// - Lenders must be migrated first (data/mappings/lenders.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Lender RecordTypeId from Salesforce (15-char version as exported in CSV)
const LENDER_RECORD_TYPE_ID = '0124x000000ZGGZ';

// State name to code mapping (for looking up state from area name)
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'District of Columbia': 'DC',
  'Florida': 'FL',
  'Georgia': 'GA',
  'Hawaii': 'HI',
  'Idaho': 'ID',
  'Illinois': 'IL',
  'Indiana': 'IN',
  'Iowa': 'IA',
  'Kansas': 'KS',
  'Kentucky': 'KY',
  'Louisiana': 'LA',
  'Maine': 'ME',
  'Maryland': 'MD',
  'Massachusetts': 'MA',
  'Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT',
  'Nebraska': 'NE',
  'Nevada': 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  'Ohio': 'OH',
  'Oklahoma': 'OK',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Puerto Rico': 'PR',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  'Tennessee': 'TN',
  'Texas': 'TX',
  'Utah': 'UT',
  'Vermont': 'VT',
  'Virginia': 'VA',
  'Washington': 'WA',
  'West Virginia': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
};

interface AccountRow {
  Id: string;
  RecordTypeId: string;
  FirstName: string;
  LastName: string;
}

interface AreaRow {
  Id: string;
  Name: string;
  State__c: string;
}

interface AreaAssignmentRow {
  Id: string;
  IsDeleted: string;
  Agent__c: string;  // Actually can be Agent OR Lender (Account ID)
  Area__c: string;
  Status__c: string;
}

async function migrateStateLenders() {
  console.log('='.repeat(60));
  console.log('Migrate State Lenders');
  console.log('Converting lender area assignments to State.lenders');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const statesMapPath = path.join(mappingsDir, 'states.json');
  const lendersMapPath = path.join(mappingsDir, 'lenders.json');

  if (!fs.existsSync(statesMapPath)) {
    console.error('❌ Missing states mapping file. Run migrate-states.ts first.');
    process.exit(1);
  }
  if (!fs.existsSync(lendersMapPath)) {
    console.error('❌ Missing lenders mapping file. Run migrate-lenders.ts first.');
    process.exit(1);
  }

  // Load mapping files (Salesforce ID → Attio ID)
  const statesMap: Record<string, string> = JSON.parse(fs.readFileSync(statesMapPath, 'utf-8'));
  const lendersMap: Record<string, string> = JSON.parse(fs.readFileSync(lendersMapPath, 'utf-8'));

  console.log(`Loaded ${Object.keys(statesMap).length} state mappings`);
  console.log(`Loaded ${Object.keys(lendersMap).length} lender mappings`);
  console.log();

  // Read Salesforce CSVs
  const dataDir = path.join(process.cwd(), 'data/salesforce');

  const accountsCsv = fs.readFileSync(path.join(dataDir, 'Account.csv'), 'utf-8');
  const accounts: AccountRow[] = parse(accountsCsv, { columns: true });

  const areasCsv = fs.readFileSync(path.join(dataDir, 'Area__c.csv'), 'utf-8');
  const areas: AreaRow[] = parse(areasCsv, { columns: true });

  const assignmentsCsv = fs.readFileSync(path.join(dataDir, 'Area_Assignment__c.csv'), 'utf-8');
  const assignments: AreaAssignmentRow[] = parse(assignmentsCsv, { columns: true });

  console.log(`Loaded ${accounts.length} accounts`);
  console.log(`Loaded ${areas.length} areas`);
  console.log(`Loaded ${assignments.length} area assignments`);
  console.log();

  // Build lookup maps
  const lenderAccountIds = new Set(
    accounts
      .filter(a => a.RecordTypeId === LENDER_RECORD_TYPE_ID)
      .map(a => a.Id)
  );
  console.log(`Found ${lenderAccountIds.size} lender accounts`);

  const areaIdToName: Record<string, string> = {};
  const areaIdToState: Record<string, string> = {};
  for (const area of areas) {
    areaIdToName[area.Id] = area.Name;
    areaIdToState[area.Id] = area.State__c;
  }

  // Filter to lender assignments only
  const lenderAssignments = assignments.filter(a =>
    a.IsDeleted === '0' && lenderAccountIds.has(a.Agent__c)
  );
  console.log(`Found ${lenderAssignments.length} lender area assignments`);
  console.log();

  // Group lenders by state
  // Key: state code, Value: Set of Attio lender IDs
  const stateLenders: Record<string, Set<string>> = {};
  const skipped: string[] = [];

  for (const assignment of lenderAssignments) {
    const areaName = areaIdToName[assignment.Area__c];
    const stateName = areaIdToState[assignment.Area__c];

    if (!areaName || !stateName) {
      skipped.push(`Assignment ${assignment.Id}: Area ${assignment.Area__c} not found`);
      continue;
    }

    // For lenders, the area name IS the state name (e.g., "Alabama" area in "Alabama" state)
    // Get state code from the state name
    const stateCode = STATE_NAME_TO_CODE[stateName];
    if (!stateCode) {
      skipped.push(`Assignment ${assignment.Id}: Unknown state "${stateName}"`);
      continue;
    }

    // Get Attio lender ID
    const attioLenderId = lendersMap[assignment.Agent__c];
    if (!attioLenderId) {
      skipped.push(`Assignment ${assignment.Id}: Lender ${assignment.Agent__c} not in Attio mapping`);
      continue;
    }

    // Add to state
    if (!stateLenders[stateCode]) {
      stateLenders[stateCode] = new Set();
    }
    stateLenders[stateCode].add(attioLenderId);
  }

  // Log summary
  console.log('State → Lender distribution:');
  console.log('-'.repeat(40));
  for (const [stateCode, lenderSet] of Object.entries(stateLenders).sort()) {
    console.log(`  ${stateCode}: ${lenderSet.size} lenders`);
  }
  console.log();

  if (skipped.length > 0) {
    console.log(`⚠️  Skipped ${skipped.length} assignments:`);
    skipped.slice(0, 10).forEach(s => console.log(`  - ${s}`));
    if (skipped.length > 10) {
      console.log(`  ... and ${skipped.length - 10} more`);
    }
    console.log();
  }

  // Update each State in Attio
  console.log('Updating State.lenders in Attio...');
  console.log('-'.repeat(40));

  let successCount = 0;
  let errorCount = 0;

  for (const [stateCode, lenderSet] of Object.entries(stateLenders)) {
    const attioStateId = statesMap[stateCode];
    if (!attioStateId) {
      console.error(`❌ State ${stateCode} not in Attio mapping`);
      errorCount++;
      continue;
    }

    const lenderIds = Array.from(lenderSet);

    try {
      // Update State.lenders with array of record references
      // Attio requires both target_object (object slug) and target_record_id
      await attio.updateRecord('states', attioStateId, {
        lenders: lenderIds.map(id => ({ target_object: 'lenders', target_record_id: id }))
      });

      console.log(`✓ ${stateCode}: Updated with ${lenderIds.length} lenders`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${stateCode}: ${error instanceof Error ? error.message : error}`);
      errorCount++;
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ States updated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️  Total lender assignments processed: ${lenderAssignments.length}`);
  console.log(`📊 States with lenders: ${Object.keys(stateLenders).length}`);
}

// Run migration
migrateStateLenders().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
