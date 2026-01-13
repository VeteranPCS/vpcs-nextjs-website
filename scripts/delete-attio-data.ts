// scripts/delete-attio-data.ts
// Deletes records from Attio objects and list entries
//
// Usage:
//   npx ts-node scripts/delete-attio-data.ts <object-type>
//
// Object types:
//   customer_deals  - Delete all customer deal entries (list)
//   customers       - Delete all customer records (object)
//   agents          - Delete all agent records (object)
//   lenders         - Delete all lender records (object)
//
// IMPORTANT: Run deletions in this order to avoid reference errors:
//   1. customer_deals (depends on customers)
//   2. customers (depends on agents/lenders)
//   3. agents, lenders (independent)

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
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

  // DELETE requests may return empty body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function deleteListEntries(listSlug: string) {
  console.log(`=`.repeat(60));
  console.log(`Deleting all entries from list: ${listSlug}`);
  console.log(`=`.repeat(60));
  console.log();

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Query for entries (get batch of 100)
    const response = await request(`/lists/${listSlug}/entries/query`, {
      method: 'POST',
      body: JSON.stringify({ limit: 100 }),
    });

    const entries = response.data || [];
    if (entries.length === 0) {
      hasMore = false;
      continue;
    }

    console.log(`Found ${entries.length} entries to delete...`);

    // Delete each entry
    for (const entry of entries) {
      const entryId = entry.id?.entry_id;
      if (!entryId) {
        console.log(`⚠️  Skipping entry with no ID`);
        continue;
      }

      try {
        await request(`/lists/${listSlug}/entries/${entryId}`, {
          method: 'DELETE',
        });
        totalDeleted++;
        if (totalDeleted % 50 === 0) {
          console.log(`   Deleted ${totalDeleted} entries...`);
        }
      } catch (error: any) {
        console.error(`❌ Error deleting entry ${entryId}: ${error.message}`);
      }
    }
  }

  console.log();
  console.log(`✓ Deleted ${totalDeleted} entries from ${listSlug}`);
}

async function deleteObjectRecords(objectSlug: string) {
  console.log(`=`.repeat(60));
  console.log(`Deleting all records from object: ${objectSlug}`);
  console.log(`=`.repeat(60));
  console.log();

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Query for records (get batch of 100)
    const response = await request(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify({ limit: 100 }),
    });

    const records = response.data || [];
    if (records.length === 0) {
      hasMore = false;
      continue;
    }

    console.log(`Found ${records.length} records to delete...`);

    // Delete each record
    for (const record of records) {
      const recordId = record.id?.record_id;
      if (!recordId) {
        console.log(`⚠️  Skipping record with no ID`);
        continue;
      }

      try {
        await request(`/objects/${objectSlug}/records/${recordId}`, {
          method: 'DELETE',
        });
        totalDeleted++;
        if (totalDeleted % 50 === 0) {
          console.log(`   Deleted ${totalDeleted} records...`);
        }
      } catch (error: any) {
        console.error(`❌ Error deleting record ${recordId}: ${error.message}`);
      }
    }
  }

  console.log();
  console.log(`✓ Deleted ${totalDeleted} records from ${objectSlug}`);
}

async function main() {
  const objectType = process.argv[2];

  if (!objectType) {
    console.log('Usage: npx ts-node scripts/delete-attio-data.ts <object-type>');
    console.log();
    console.log('Object types:');
    console.log('  customer_deals  - Delete all customer deal entries (list)');
    console.log('  customers       - Delete all customer records (object)');
    console.log('  agents          - Delete all agent records (object)');
    console.log('  lenders         - Delete all lender records (object)');
    console.log();
    console.log('Run deletions in order: customer_deals -> customers -> agents/lenders');
    process.exit(1);
  }

  if (!process.env.ATTIO_API_KEY) {
    console.error('Error: ATTIO_API_KEY not set');
    process.exit(1);
  }

  console.log();
  console.log(`⚠️  WARNING: This will permanently delete all ${objectType} data from Attio!`);
  console.log();

  // Wait 3 seconds to allow cancellation
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  switch (objectType) {
    case 'customer_deals':
      await deleteListEntries('customer_deals');
      break;
    case 'customers':
      await deleteObjectRecords('customers');
      break;
    case 'agents':
      await deleteObjectRecords('agents');
      break;
    case 'lenders':
      await deleteObjectRecords('lenders');
      break;
    case 'area_assignments':
      await deleteObjectRecords('area_assignments');
      break;
    default:
      console.error(`Unknown object type: ${objectType}`);
      console.log('Valid types: customer_deals, customers, agents, lenders');
      process.exit(1);
  }

  console.log();
  console.log('Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
