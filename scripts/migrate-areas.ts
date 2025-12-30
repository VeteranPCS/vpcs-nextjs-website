// scripts/migrate-areas.ts

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
  console.log('Starting Area migration...\n');

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'data/salesforce/Area__c.csv');
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const areas: AreaRow[] = parse(csv, { columns: true });

  console.log(`Found ${areas.length} total areas in CSV`);

  // Filter out deleted records
  const activeAreas = areas.filter(row => row.IsDeleted === '0');
  console.log(`Filtered to ${activeAreas.length} active areas\n`);

  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const row of activeAreas) {
    try {
      // Convert state name to code
      const stateCode = STATE_NAME_TO_CODE[row.State__c];
      if (!stateCode) {
        console.error(`❌ Unknown state: "${row.State__c}" for area "${row.Name}"`);
        errorCount++;
        continue;
      }

      // Create record in Attio
      const record = await attio.createRecord('areas', {
        salesforce_id: row.Id,
        name: row.Name,
        state: stateCode,
        coverage_target: parseInt(row.Coverage_Target__c) || 0,
        coverage_active: parseInt(row.Coverage_Active__c) || 0,
      });

      const attioId = record.data.id.record_id;
      mapping[row.Id] = attioId;
      successCount++;

      console.log(`✓ Migrated: ${row.Name}, ${stateCode} -> ${attioId}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrating ${row.Name}:`, error instanceof Error ? error.message : error);
    }
  }

  // Save mapping file
  const mappingPath = path.join(process.cwd(), 'data/mappings/areas.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  console.log(`\n=== Migration Complete ===`);
  console.log(`✓ Successfully migrated: ${successCount} areas`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

// Run migration
migrateAreas().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
