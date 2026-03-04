// scripts/add-person-attribute.ts
// Adds a "person" record-reference attribute (→ People) to all 4 custom objects.
// Run: npx tsx scripts/add-person-attribute.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const apiKey = process.env.ATTIO_API_KEY!;

if (!apiKey) {
  console.error('ATTIO_API_KEY is not set. Make sure .env.local exists.');
  process.exit(1);
}

async function request(apiPath: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Attio API error: ${res.status} ${error}`);
  }

  return res.json();
}

const OBJECTS = ['customers', 'agents', 'lenders', 'interns'];

async function main() {
  console.log('=== Adding "person" attribute to custom objects ===\n');

  for (const objectSlug of OBJECTS) {
    console.log(`Adding to ${objectSlug}...`);
    try {
      await request(`/objects/${objectSlug}/attributes`, {
        method: 'POST',
        body: JSON.stringify({
          data: {
            title: 'Person',
            api_slug: 'person',
            type: 'record-reference',
            description: 'Linked People record for sequence enrollment',
            is_required: false,
            is_unique: false,
            is_multiselect: false,
            config: {
              record_reference: { allowed_objects: ['people'] },
            },
          },
        }),
      });
      console.log(`  ✓ Added person attribute to ${objectSlug}`);
    } catch (err: any) {
      if (err.message.includes('409') || err.message.includes('already exists')) {
        console.log(`  ⊘ Already exists on ${objectSlug}`);
      } else {
        console.error(`  ✗ Failed on ${objectSlug}: ${err.message}`);
      }
    }
  }

  console.log('\n=== Done! Verify in Attio UI that "Person" field appears on all 4 objects. ===');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
