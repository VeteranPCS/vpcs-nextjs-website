// scripts/add-state-options.ts
// Adds state options to the lenders.states_licensed multiselect attribute

import { config } from 'dotenv';
config({ path: '.env.local' });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const apiKey = process.env.ATTIO_API_KEY!;

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'Washington D.C.', 'West Virginia', 'Wisconsin', 'Wyoming'
];

async function addStateOptions() {
  console.log('Adding state options to lenders.states_licensed...\n');

  // First check existing options
  const existingRes = await fetch(
    `${ATTIO_API_URL}/objects/lenders/attributes/states_licensed/options`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  const existing = await existingRes.json();
  const existingTitles = new Set((existing.data || []).map((o: any) => o.title));
  console.log(`Found ${existingTitles.size} existing options`);

  let added = 0;
  let skipped = 0;

  for (const state of STATES) {
    if (existingTitles.has(state)) {
      skipped++;
      continue;
    }

    const res = await fetch(
      `${ATTIO_API_URL}/objects/lenders/attributes/states_licensed/options`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { title: state } }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error(`❌ Failed to add "${state}": ${error}`);
    } else {
      console.log(`✓ Added "${state}"`);
      added++;
    }
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped (already exist)`);
}

addStateOptions().catch(console.error);
