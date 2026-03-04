// scripts/test-teardown.ts
// Removes all test records created by test-setup.ts.
// Run: npx tsx scripts/test-teardown.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';

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
    // Don't throw on 404 during teardown — record may already be deleted
    if (res.status === 404) {
      console.log(`   (already deleted or not found: ${apiPath})`);
      return null;
    }
    throw new Error(`Attio API error: ${res.status} ${error}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function parseRecord(record: any) {
  const parsed: Record<string, any> = { id: record.id.record_id };
  for (const [key, valueArray] of Object.entries(record.values)) {
    const arr = valueArray as any[];
    if (arr.length === 0) {
      parsed[key] = null;
    } else if (arr[0].target_record_id) {
      parsed[key] =
        arr.length > 1
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

async function queryRecords(objectSlug: string, options: any = {}) {
  const body: any = {};
  if (options.filter) body.filter = options.filter;
  if (options.limit) body.limit = options.limit;

  const res = await request(`/objects/${objectSlug}/records/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res) return [];
  return res.data.map(parseRecord);
}

async function queryListEntries(listSlug: string, options: any = {}) {
  const body: any = {};
  if (options.filter) body.filter = options.filter;
  if (options.limit) body.limit = options.limit;

  const res = await request(`/lists/${listSlug}/entries/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res) return [];
  return res.data || [];
}

async function deleteRecord(objectSlug: string, recordId: string) {
  return request(`/objects/${objectSlug}/records/${recordId}`, {
    method: 'DELETE',
  });
}

async function deleteListEntry(listSlug: string, entryId: string) {
  return request(`/lists/${listSlug}/entries/${entryId}`, {
    method: 'DELETE',
  });
}

async function getRecord(objectSlug: string, recordId: string) {
  const res = await request(`/objects/${objectSlug}/records/${recordId}`);
  if (!res) return null;
  return parseRecord(res.data);
}

// ---------- Main ----------

async function main() {
  console.log('=== Test Teardown: Removing test records ===\n');

  // Load test IDs
  const idsPath = path.join(__dirname, 'test-ids.json');
  if (!fs.existsSync(idsPath)) {
    console.error(`test-ids.json not found at ${idsPath}`);
    console.error('Run test-setup.ts first, or create this file manually.');
    process.exit(1);
  }

  const ids = JSON.parse(fs.readFileSync(idsPath, 'utf-8'));
  console.log('Loaded test IDs from:', idsPath);
  console.log(`  Agent: ${ids.test_agent_id}`);
  console.log(`  Lender: ${ids.test_lender_id}`);
  console.log(`  Area Assignment: ${ids.area_assignment_id}`);
  console.log(`  Agent Person: ${ids.test_agent_person_id || '(none)'}`);
  console.log(`  Lender Person: ${ids.test_lender_person_id || '(none)'}\n`);

  // 1. Delete area assignment
  console.log('1. Deleting area assignment...');
  await deleteRecord('area_assignments', ids.area_assignment_id);
  console.log('   Done');

  // 2. Remove test lender from Colorado State.lenders
  console.log('2. Removing test lender from Colorado State.lenders...');
  try {
    const coState = await getRecord('states', ids.colorado_state_id);
    if (coState) {
      const currentLenders = Array.isArray(coState.lenders)
        ? coState.lenders
        : coState.lenders
          ? [coState.lenders]
          : [];

      const filteredLenders = currentLenders
        .filter((id: string) => id !== ids.test_lender_id)
        .map((id: string) => ({ target_object: 'lenders', target_record_id: id }));

      // Use PUT (assertRecord) to completely replace the lenders list
      await request(
        `/objects/states/records?matching_attribute=state_code`,
        {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              values: {
                state_code: 'CO',
                lenders: filteredLenders,
              },
            },
          }),
        }
      );
      console.log(`   Removed test lender. ${filteredLenders.length} lenders remain on CO.`);
    }
  } catch (err: any) {
    console.log(`   Warning: ${err.message}`);
  }

  // 3. Delete any pipeline entries created during testing
  const pipelines = [
    { list: 'customer_deals', parent: 'customers', label: 'customer deals' },
    { list: 'agent_onboarding', parent: 'agents', label: 'agent onboarding' },
    { list: 'lender_onboarding', parent: 'lenders', label: 'lender onboarding' },
    { list: 'intern_placements', parent: 'interns', label: 'intern placements' },
  ];

  for (const pipeline of pipelines) {
    console.log(`3. Checking ${pipeline.label} for test entries...`);
    try {
      const entries = await queryListEntries(pipeline.list, { limit: 200 });
      let deleted = 0;

      for (const entry of entries) {
        // Check if this entry belongs to our test agent or lender
        const parentId = entry.parent_record_id;
        if (
          parentId === ids.test_agent_id ||
          parentId === ids.test_lender_id
        ) {
          const entryId = entry.entry_id || entry.id?.entry_id;
          if (entryId) {
            await deleteListEntry(pipeline.list, entryId);
            deleted++;
          }
        }
      }
      if (deleted > 0) {
        console.log(`   Deleted ${deleted} ${pipeline.label} entries`);
      } else {
        console.log(`   No test entries found`);
      }
    } catch (err: any) {
      console.log(`   Skipped (${err.message})`);
    }
  }

  // 4. Delete any test customer/intern records created via forms
  console.log('4. Checking for test customer records...');
  const testEmails = [ids.test_agent_email, ids.test_lender_email];
  for (const email of testEmails) {
    try {
      const customers = await queryRecords('customers', {
        filter: { email: { $eq: email } },
        limit: 10,
      });
      for (const c of customers) {
        await deleteRecord('customers', c.id);
        console.log(`   Deleted customer: ${c.id}`);
      }
    } catch (err: any) {
      console.log(`   Skipped customers for ${email}: ${err.message}`);
    }
  }

  // Also look for test customer records by +test pattern
  for (const suffix of ['+testagent', '+testlender', '+testcustomer']) {
    try {
      // Try to find any customer records with test email patterns
      const pattern = `${suffix}@`;
      // Note: Attio doesn't support LIKE/contains queries, so we try exact matches
      const testEmail = `harper.e.foley${suffix}@gmail.com`;
      const customers = await queryRecords('customers', {
        filter: { email: { $eq: testEmail } },
        limit: 10,
      });
      for (const c of customers) {
        // Delete pipeline entries first
        for (const pipeline of pipelines) {
          try {
            const entries = await queryListEntries(pipeline.list, { limit: 200 });
            for (const entry of entries) {
              if (entry.parent_record_id === c.id) {
                const entryId = entry.entry_id || entry.id?.entry_id;
                if (entryId) {
                  await deleteListEntry(pipeline.list, entryId);
                  console.log(`   Deleted ${pipeline.label} entry for customer ${c.id}`);
                }
              }
            }
          } catch {}
        }
        await deleteRecord('customers', c.id);
        console.log(`   Deleted customer: ${c.id} (${testEmail})`);
      }
    } catch {}
  }

  // Check for test intern records
  console.log('5. Checking for test intern records...');
  try {
    const interns = await queryRecords('interns', {
      filter: { email: { $eq: `harper.e.foley+testintern@gmail.com` } },
      limit: 10,
    });
    for (const intern of interns) {
      await deleteRecord('interns', intern.id);
      console.log(`   Deleted intern: ${intern.id}`);
    }
  } catch (err: any) {
    console.log(`   Skipped: ${err.message}`);
  }

  // 6. Delete test agent and lender records
  console.log('6. Deleting test agent...');
  await deleteRecord('agents', ids.test_agent_id);
  console.log('   Done');

  console.log('7. Deleting test lender...');
  await deleteRecord('lenders', ids.test_lender_id);
  console.log('   Done');

  // 8. Delete People records (from test-setup and form submissions)
  console.log('8. Deleting People records...');
  if (ids.test_agent_person_id) {
    await deleteRecord('people', ids.test_agent_person_id);
    console.log(`   Deleted agent Person: ${ids.test_agent_person_id}`);
  }
  if (ids.test_lender_person_id) {
    await deleteRecord('people', ids.test_lender_person_id);
    console.log(`   Deleted lender Person: ${ids.test_lender_person_id}`);
  }

  // Also clean up People records created by form submissions during testing
  const testEmailSuffixes = ['+testagent', '+testlender', '+testcustomer', '+testintern'];
  for (const suffix of testEmailSuffixes) {
    const testEmail = `harper.e.foley${suffix}@gmail.com`;
    try {
      const people = await queryRecords('people', {
        filter: { email_addresses: { $eq: testEmail } },
        limit: 10,
      });
      for (const p of people) {
        await deleteRecord('people', p.id);
        console.log(`   Deleted People record: ${p.id} (${testEmail})`);
      }
    } catch {}
  }

  // Clean up test-ids.json
  fs.unlinkSync(idsPath);
  console.log(`\nDeleted ${idsPath}`);

  console.log('\n=== Teardown complete! All test records removed. ===');
}

main().catch((err) => {
  console.error('Teardown failed:', err);
  process.exit(1);
});
