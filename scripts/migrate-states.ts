// scripts/migrate-states.ts
// Creates State records in Attio for all US states + DC + Puerto Rico
//
// States are created programmatically rather than from Salesforce data
// because Salesforce only has Area records, not explicit State objects
//
// No prerequisites - this runs first in the migration order

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// State definitions
interface StateDefinition {
  name: string;
  state_code: string;
  state_slug: string;
}

// Generate slug from state name (lowercase, hyphens for spaces)
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// All US states + DC + Puerto Rico
const STATES: StateDefinition[] = [
  { name: 'Alabama', state_code: 'AL', state_slug: 'alabama' },
  { name: 'Alaska', state_code: 'AK', state_slug: 'alaska' },
  { name: 'Arizona', state_code: 'AZ', state_slug: 'arizona' },
  { name: 'Arkansas', state_code: 'AR', state_slug: 'arkansas' },
  { name: 'California', state_code: 'CA', state_slug: 'california' },
  { name: 'Colorado', state_code: 'CO', state_slug: 'colorado' },
  { name: 'Connecticut', state_code: 'CT', state_slug: 'connecticut' },
  { name: 'Delaware', state_code: 'DE', state_slug: 'delaware' },
  { name: 'Washington D.C.', state_code: 'DC', state_slug: 'washington-dc' },
  { name: 'Florida', state_code: 'FL', state_slug: 'florida' },
  { name: 'Georgia', state_code: 'GA', state_slug: 'georgia' },
  { name: 'Hawaii', state_code: 'HI', state_slug: 'hawaii' },
  { name: 'Idaho', state_code: 'ID', state_slug: 'idaho' },
  { name: 'Illinois', state_code: 'IL', state_slug: 'illinois' },
  { name: 'Indiana', state_code: 'IN', state_slug: 'indiana' },
  { name: 'Iowa', state_code: 'IA', state_slug: 'iowa' },
  { name: 'Kansas', state_code: 'KS', state_slug: 'kansas' },
  { name: 'Kentucky', state_code: 'KY', state_slug: 'kentucky' },
  { name: 'Louisiana', state_code: 'LA', state_slug: 'louisiana' },
  { name: 'Maine', state_code: 'ME', state_slug: 'maine' },
  { name: 'Maryland', state_code: 'MD', state_slug: 'maryland' },
  { name: 'Massachusetts', state_code: 'MA', state_slug: 'massachusetts' },
  { name: 'Michigan', state_code: 'MI', state_slug: 'michigan' },
  { name: 'Minnesota', state_code: 'MN', state_slug: 'minnesota' },
  { name: 'Mississippi', state_code: 'MS', state_slug: 'mississippi' },
  { name: 'Missouri', state_code: 'MO', state_slug: 'missouri' },
  { name: 'Montana', state_code: 'MT', state_slug: 'montana' },
  { name: 'Nebraska', state_code: 'NE', state_slug: 'nebraska' },
  { name: 'Nevada', state_code: 'NV', state_slug: 'nevada' },
  { name: 'New Hampshire', state_code: 'NH', state_slug: 'new-hampshire' },
  { name: 'New Jersey', state_code: 'NJ', state_slug: 'new-jersey' },
  { name: 'New Mexico', state_code: 'NM', state_slug: 'new-mexico' },
  { name: 'New York', state_code: 'NY', state_slug: 'new-york' },
  { name: 'North Carolina', state_code: 'NC', state_slug: 'north-carolina' },
  { name: 'North Dakota', state_code: 'ND', state_slug: 'north-dakota' },
  { name: 'Ohio', state_code: 'OH', state_slug: 'ohio' },
  { name: 'Oklahoma', state_code: 'OK', state_slug: 'oklahoma' },
  { name: 'Oregon', state_code: 'OR', state_slug: 'oregon' },
  { name: 'Pennsylvania', state_code: 'PA', state_slug: 'pennsylvania' },
  { name: 'Puerto Rico', state_code: 'PR', state_slug: 'puerto-rico' },
  { name: 'Rhode Island', state_code: 'RI', state_slug: 'rhode-island' },
  { name: 'South Carolina', state_code: 'SC', state_slug: 'south-carolina' },
  { name: 'South Dakota', state_code: 'SD', state_slug: 'south-dakota' },
  { name: 'Tennessee', state_code: 'TN', state_slug: 'tennessee' },
  { name: 'Texas', state_code: 'TX', state_slug: 'texas' },
  { name: 'Utah', state_code: 'UT', state_slug: 'utah' },
  { name: 'Vermont', state_code: 'VT', state_slug: 'vermont' },
  { name: 'Virginia', state_code: 'VA', state_slug: 'virginia' },
  { name: 'Washington', state_code: 'WA', state_slug: 'washington' },
  { name: 'West Virginia', state_code: 'WV', state_slug: 'west-virginia' },
  { name: 'Wisconsin', state_code: 'WI', state_slug: 'wisconsin' },
  { name: 'Wyoming', state_code: 'WY', state_slug: 'wyoming' },
];

async function migrateStates() {
  console.log('='.repeat(60));
  console.log('Migrate States');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  console.log(`Creating ${STATES.length} states...`);
  console.log();

  // Mapping: state_code → Attio ID
  const mapping: Record<string, string> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const state of STATES) {
    try {
      const record = await attio.createRecord('states', {
        name: state.name,
        state_code: state.state_code,
        state_slug: state.state_slug,
      });

      const attioId = record.data.id.record_id;
      mapping[state.state_code] = attioId;
      successCount++;

      console.log(`✓ Created: ${state.name} (${state.state_code}) -> ${attioId}`);
    } catch (error: any) {
      // Check if it's a duplicate (state already exists)
      if (error.message.includes('409') || error.message.includes('unique')) {
        // Try to find existing record
        try {
          const existing = await attio.queryRecords('states', {
            filter: {
              state_code: { $eq: state.state_code }
            }
          });
          if (existing.length > 0) {
            mapping[state.state_code] = existing[0].id;
            console.log(`⏭️  Already exists: ${state.name} (${state.state_code}) -> ${existing[0].id}`);
            successCount++;
            continue;
          }
        } catch {
          // Ignore query errors
        }
      }

      errorCount++;
      console.error(`❌ Error creating ${state.name}:`, error instanceof Error ? error.message : error);
    }
  }

  // Ensure mappings directory exists
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }

  // Save mapping file (state_code → Attio ID)
  const mappingPath = path.join(mappingsDir, 'states.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} states`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Mapping saved to: ${mappingPath}`);
  console.log();
  console.log('Next step: Run migrate-agents.ts and migrate-lenders.ts');
}

// Run migration
migrateStates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
