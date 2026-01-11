// scripts/migrate-areas.ts
// Migrates areas from Salesforce to Attio
//
// Key behaviors:
// 1. Filters out "state-level" placeholder areas (where area name = state name)
// 2. Creates Area records with state reference
// 3. Updates State.areas bidirectionally for efficient state page queries
//
// Prerequisites:
// - States must be migrated first (data/mappings/states.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// State name to code mapping
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

interface AreaRow {
  Id: string;
  IsDeleted: string;
  Name: string;
  State__c: string;
  Coverage_Target__c: string;
  Coverage_Active__c: string;
}

async function migrateAreas() {
  console.log('='.repeat(60));
  console.log('Migrate Areas');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const statesMapPath = path.join(mappingsDir, 'states.json');

  if (!fs.existsSync(statesMapPath)) {
    console.error('❌ Missing states mapping file. Run migrate-states.ts first.');
    process.exit(1);
  }

  // Load state mapping (state code → Attio ID)
  const statesMap: Record<string, string> = JSON.parse(fs.readFileSync(statesMapPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(statesMap).length} state mappings`);

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'data/salesforce/Area__c.csv');
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const areas: AreaRow[] = parse(csv, { columns: true });

  console.log(`Found ${areas.length} total areas in CSV`);

  // Filter out deleted records
  const activeAreas = areas.filter(row => row.IsDeleted === '0');
  console.log(`Filtered to ${activeAreas.length} active areas`);

  // Filter out "state-level" placeholder areas (where area name = state name)
  // These are used in Salesforce for lender assignments but we handle that differently in Attio
  const cityAreas = activeAreas.filter(row => {
    const isStateLevelArea = row.Name === row.State__c;
    return !isStateLevelArea;
  });

  const skippedCount = activeAreas.length - cityAreas.length;
  console.log(`Filtered out ${skippedCount} state-level placeholder areas`);
  console.log(`Migrating ${cityAreas.length} city/base areas`);
  console.log();

  const mapping: Record<string, string> = {};
  // Track areas by state for bidirectional update
  const areasByState: Record<string, string[]> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const row of cityAreas) {
    try {
      // Convert state name to code
      const stateCode = STATE_NAME_TO_CODE[row.State__c];
      if (!stateCode) {
        console.error(`❌ Unknown state: "${row.State__c}" for area "${row.Name}"`);
        errorCount++;
        continue;
      }

      // Get Attio state ID for record reference
      const attioStateId = statesMap[stateCode];
      if (!attioStateId) {
        console.error(`❌ State ${stateCode} not in Attio mapping`);
        errorCount++;
        continue;
      }

      // Create record in Attio with state as record reference
      const record = await attio.createRecord('areas', {
        salesforce_id: row.Id,
        name: row.Name,
        state: { target_record_id: attioStateId },
        coverage_target: parseInt(row.Coverage_Target__c) || 0,
        coverage_active: parseInt(row.Coverage_Active__c) || 0,
      });

      const attioId = record.data.id.record_id;
      mapping[row.Id] = attioId;
      successCount++;

      // Track for bidirectional update
      if (!areasByState[stateCode]) {
        areasByState[stateCode] = [];
      }
      areasByState[stateCode].push(attioId);

      console.log(`✓ Migrated: ${row.Name}, ${stateCode} -> ${attioId}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrating ${row.Name}:`, error instanceof Error ? error.message : error);
    }
  }

  // Save mapping file
  const mappingPath = path.join(mappingsDir, 'areas.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  console.log();
  console.log(`✓ Successfully migrated: ${successCount} areas`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Mapping saved to: ${mappingPath}`);

  // Phase 2: Update State.areas bidirectionally
  console.log();
  console.log('Updating State.areas (bidirectional references)...');
  console.log('-'.repeat(40));

  let stateUpdateSuccess = 0;
  let stateUpdateError = 0;

  for (const [stateCode, areaIds] of Object.entries(areasByState)) {
    const attioStateId = statesMap[stateCode];
    if (!attioStateId) {
      console.error(`❌ State ${stateCode} not found in mapping`);
      stateUpdateError++;
      continue;
    }

    try {
      await attio.updateRecord('states', attioStateId, {
        areas: areaIds.map(id => ({ target_record_id: id }))
      });
      console.log(`✓ ${stateCode}: Updated with ${areaIds.length} areas`);
      stateUpdateSuccess++;
    } catch (error) {
      console.error(`❌ ${stateCode}: ${error instanceof Error ? error.message : error}`);
      stateUpdateError++;
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Areas created: ${successCount}`);
  console.log(`Areas errored: ${errorCount}`);
  console.log(`States updated: ${stateUpdateSuccess}`);
  console.log(`States errored: ${stateUpdateError}`);
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

// Run migration
migrateAreas().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
