// scripts/backfill-people-records.ts
// Creates People records for all existing agents, lenders, customers, and interns,
// then links them via the `person` attribute.
// Idempotent: skips records that already have a `person` link.
// Run: npx tsx scripts/backfill-people-records.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const apiKey = process.env.ATTIO_API_KEY!;

if (!apiKey) {
  console.error('ATTIO_API_KEY is not set. Make sure .env.local exists.');
  process.exit(1);
}

// ---------- API helpers ----------

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

function parseRecord(record: any) {
  const parsed: Record<string, any> = { id: record.id.record_id };
  for (const [key, valueArray] of Object.entries(record.values)) {
    const arr = valueArray as any[];
    if (arr.length === 0) {
      parsed[key] = null;
    } else if (arr[0].option) {
      parsed[key] = arr[0].option.title;
    } else if (arr[0].target_record_id) {
      parsed[key] = arr.length > 1
        ? arr.map((v: any) => v.target_record_id)
        : arr[0].target_record_id;
    } else if (arr[0].original_phone_number) {
      parsed[key] = arr[0].original_phone_number;
    } else if (arr[0].email_address) {
      parsed[key] = arr[0].email_address;
    } else if (arr[0].value !== undefined) {
      parsed[key] = arr[0].value;
    } else {
      parsed[key] = arr[0];
    }
  }
  return parsed;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// ---------- Core logic ----------

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryAllRecords(objectSlug: string): Promise<any[]> {
  const allRecords: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await request(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const records = res.data.map(parseRecord);
    allRecords.push(...records);

    if (records.length < limit) break;
    offset += limit;
    await sleep(BATCH_DELAY_MS);
  }

  return allRecords;
}

async function assertPerson(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}): Promise<string> {
  const values: Record<string, any> = {
    email_addresses: [{ email_address: data.email }],
    name: [{
      first_name: data.firstName,
      last_name: data.lastName,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
    }],
  };

  if (data.phone) {
    const normalized = normalizePhone(data.phone);
    if (normalized) {
      values.phone_numbers = [{ original_phone_number: normalized }];
    }
  }

  const result = await request(
    `/objects/people/records?matching_attribute=email_addresses`,
    {
      method: 'PUT',
      body: JSON.stringify({ data: { values } }),
    }
  );

  return result.data.id.record_id;
}

async function linkPerson(objectSlug: string, recordId: string, personId: string) {
  await request(`/objects/${objectSlug}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        values: {
          person: { target_object: 'people', target_record_id: personId },
        },
      },
    }),
  });
}

async function processObject(objectSlug: string) {
  console.log(`\n--- Processing ${objectSlug} ---`);
  const records = await queryAllRecords(objectSlug);
  console.log(`  Found ${records.length} total records`);

  let created = 0;
  let skipped = 0;
  let noEmail = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (record) => {
        try {
          // Skip if already has person link
          if (record.person) {
            skipped++;
            return;
          }

          // Skip if no email
          const email = record.email;
          if (!email) {
            noEmail++;
            return;
          }

          // Create/find People record
          const personId = await assertPerson({
            firstName: record.first_name || '',
            lastName: record.last_name || '',
            email,
            phone: record.phone,
          });

          // Link to custom object record
          await linkPerson(objectSlug, record.id, personId);
          created++;
        } catch (err: any) {
          errors++;
          console.error(`  ✗ Error on ${record.id}: ${err.message}`);
        }
      })
    );

    // Progress update every 50 records
    const processed = Math.min(i + BATCH_SIZE, records.length);
    if (processed % 50 === 0 || processed === records.length) {
      console.log(`  Progress: ${processed}/${records.length}`);
    }

    if (i + BATCH_SIZE < records.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`  Results: ${created} linked, ${skipped} already linked, ${noEmail} no email, ${errors} errors`);
  return { created, skipped, noEmail, errors, total: records.length };
}

// ---------- Main ----------

async function main() {
  console.log('=== Backfill People Records ===');
  console.log('Creates linked People records for sequence enrollment.\n');

  const objectOrder = ['agents', 'lenders', 'customers', 'interns'];
  const totals = { created: 0, skipped: 0, noEmail: 0, errors: 0, total: 0 };

  for (const objectSlug of objectOrder) {
    const result = await processObject(objectSlug);
    totals.created += result.created;
    totals.skipped += result.skipped;
    totals.noEmail += result.noEmail;
    totals.errors += result.errors;
    totals.total += result.total;
  }

  console.log('\n=== Summary ===');
  console.log(`  Total records: ${totals.total}`);
  console.log(`  People linked: ${totals.created}`);
  console.log(`  Already linked: ${totals.skipped}`);
  console.log(`  No email (skipped): ${totals.noEmail}`);
  console.log(`  Errors: ${totals.errors}`);
  console.log('\n=== Done! ===');
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
