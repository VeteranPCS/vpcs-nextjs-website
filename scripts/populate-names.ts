// Populate name field for existing agents and lenders
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Attio API error: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function populateNames(objectSlug: string) {
  console.log(`=`.repeat(60));
  console.log(`Populating names for ${objectSlug}`);
  console.log(`=`.repeat(60));
  console.log();

  let offset = 0;
  const limit = 100;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    // Query for records
    const response = await request(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const records = response.data || [];
    if (records.length === 0) {
      hasMore = false;
      continue;
    }

    console.log(`Processing batch at offset ${offset} (${records.length} records)...`);

    // Update each record with name
    for (const record of records) {
      const recordId = record.id?.record_id;
      if (!recordId) continue;

      // Extract first_name and last_name
      const firstName = record.values?.first_name?.[0]?.value || '';
      const lastName = record.values?.last_name?.[0]?.value || '';
      const name = `${firstName} ${lastName}`.trim();

      if (!name) {
        console.log(`⚠️  Skipping ${recordId}: No name components`);
        continue;
      }

      try {
        await request(`/objects/${objectSlug}/records/${recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              values: { name }
            }
          })
        });
        totalUpdated++;

        if (totalUpdated % 50 === 0) {
          console.log(`   Updated ${totalUpdated} records...`);
        }
      } catch (error: any) {
        console.error(`❌ Error updating ${recordId}: ${error.message}`);
      }
    }

    offset += limit;
    if (records.length < limit) {
      hasMore = false;
    }
  }

  console.log();
  console.log(`✓ Updated ${totalUpdated} ${objectSlug} with names`);
  console.log();
}

async function main() {
  const target = process.argv[2] || 'both';

  if (target === 'agents' || target === 'both') {
    await populateNames('agents');
  }
  if (target === 'lenders' || target === 'both') {
    await populateNames('lenders');
  }

  console.log('Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
