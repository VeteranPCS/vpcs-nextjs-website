// scripts/v2/migrate-areas-v2.ts
// Migrates areas from cleaned CSV to Attio
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-areas.csv
// - Filters out state-level areas (where AreaName === State)
// - State lookups use existing states in Attio
//
// Prerequisites: States must exist in Attio

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface CleanedAreaRow {
  AreaId: string;
  AreaName: string;
  State: string;
  Country: string;
  CoverageTarget: string;
  CoverageAssigned: string;
  CoverageActive: string;
  CoverageWaitlist: string;
}

// Map state names to state codes for lookup
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  'Puerto Rico': 'PR', 'Guam': 'GU', 'Virgin Islands': 'VI',
};

async function migrateAreasV2() {
  console.log('='.repeat(60));
  console.log('Migrate Areas V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Read cleaned CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-areas.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const areas: CleanedAreaRow[] = parse(csvData, { columns: true });

  console.log(`Loaded ${areas.length} areas from cleaned CSV`);

  // Filter out state-level areas (where AreaName === State)
  const cityAreas = areas.filter(a => a.AreaName !== a.State);
  console.log(`Filtered to ${cityAreas.length} city/base areas (excluded ${areas.length - cityAreas.length} state-level areas)`);
  console.log();

  // Get all states from Attio to build lookup map
  console.log('Fetching states from Attio...');
  const states = await attio.queryRecords('states', { limit: 100 });
  const stateMap: Record<string, string> = {};  // state_code → Attio record ID
  for (const state of states) {
    if (state.state_code) {
      stateMap[state.state_code] = state.id;
    }
  }
  console.log(`Found ${Object.keys(stateMap).length} states in Attio`);
  console.log();

  // Track mappings
  const mapping: Record<string, string> = {};  // AreaId → Attio ID
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const area of cityAreas) {
    // Convert state name to code
    const stateCode = STATE_NAME_TO_CODE[area.State];
    if (!stateCode) {
      skipped.push(`${area.AreaName} (${area.AreaId}): Unknown state "${area.State}"`);
      continue;
    }

    // Look up state in Attio
    const stateAttioId = stateMap[stateCode];
    if (!stateAttioId) {
      skipped.push(`${area.AreaName} (${area.AreaId}): State ${stateCode} not found in Attio`);
      continue;
    }

    try {
      const record = await attio.createRecord('areas', {
        name: area.AreaName,
        salesforce_id: area.AreaId,
        state: { target_object: 'states', target_record_id: stateAttioId },
        coverage_target: area.CoverageTarget ? parseInt(area.CoverageTarget) : null,
        coverage_active: area.CoverageActive ? parseInt(area.CoverageActive) : null,
      });

      const attioId = record.data.id.record_id;
      mapping[area.AreaId] = attioId;
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount} areas...`);
      }
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('409')) {
        skipped.push(`${area.AreaName}: Duplicate area`);
      } else {
        errorCount++;
        errors.push(`${area.AreaName} (${area.AreaId}): ${error.message}`);
      }
    }
  }

  // Save mapping
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  const mappingPath = path.join(mappingsDir, 'areas.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} areas`);
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
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

migrateAreasV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
