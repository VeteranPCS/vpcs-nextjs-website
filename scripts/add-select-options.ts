// scripts/add-select-options.ts
// One-time script to add all select options for military_service and military_status
// to agents, lenders, and customers objects

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';

async function request(path: string, options: RequestInit = {}) {
  const apiKey = process.env.ATTIO_API_KEY!;
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

async function addSelectOption(objectSlug: string, attributeSlug: string, title: string) {
  try {
    await request(`/objects/${objectSlug}/attributes/${attributeSlug}/options`, {
      method: 'POST',
      body: JSON.stringify({ data: { title } }),
    });
    console.log(`✓ Added ${title} to ${objectSlug}.${attributeSlug}`);
  } catch (error: any) {
    if (error.message.includes('409') || error.message.includes('already exists')) {
      console.log(`⏭️  ${title} already exists in ${objectSlug}.${attributeSlug}`);
    } else {
      console.error(`❌ Failed to add ${title} to ${objectSlug}.${attributeSlug}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('Adding select options to Attio...\n');

  const objects = ['agents', 'lenders', 'customers'];

  const militaryServiceOptions = [
    'Army',
    'Navy',
    'Air Force',
    'Marines',
    'Coast Guard',
    'Space Force',
  ];

  const militaryStatusOptions = [
    'Active Duty',
    'Veteran',
    'Retired',  // Already added previously
    'Reserves',
    'National Guard',
    'Spouse',
  ];

  // Add military_service options to all objects
  console.log('=== Adding military_service options ===\n');
  for (const obj of objects) {
    for (const option of militaryServiceOptions) {
      await addSelectOption(obj, 'military_service', option);
    }
    console.log();
  }

  // Add military_status options to all objects
  console.log('=== Adding military_status options ===\n');
  for (const obj of objects) {
    for (const option of militaryStatusOptions) {
      await addSelectOption(obj, 'military_status', option);
    }
    console.log();
  }

  console.log('Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
