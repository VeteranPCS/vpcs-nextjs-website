// scripts/test-setup.ts
// Creates test agent + lender records in Colorado for end-to-end workflow testing.
// Run: npx tsx scripts/test-setup.ts

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

  return res.data.map(parseRecord);
}

async function createRecord(objectSlug: string, data: Record<string, any>) {
  const values: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    values[key] = value;
  }

  const res = await request(`/objects/${objectSlug}/records`, {
    method: 'POST',
    body: JSON.stringify({ data: { values } }),
  });
  return parseRecord(res.data);
}

async function updateRecord(objectSlug: string, recordId: string, data: Record<string, any>) {
  const values: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    values[key] = value;
  }

  const res = await request(`/objects/${objectSlug}/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { values } }),
  });
  return parseRecord(res.data);
}

async function assertPerson(data: { firstName: string; lastName: string; email: string; phone?: string }) {
  const values: Record<string, any> = {
    email_addresses: [{ email_address: data.email }],
    name: [{
      first_name: data.firstName,
      last_name: data.lastName,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
    }],
  };
  if (data.phone) {
    values.phone_numbers = [{ original_phone_number: data.phone }];
  }
  const res = await request('/objects/people/records?matching_attribute=email_addresses', {
    method: 'PUT',
    body: JSON.stringify({ data: { values } }),
  });
  return res.data.id.record_id;
}

async function getRecord(objectSlug: string, recordId: string) {
  const res = await request(`/objects/${objectSlug}/records/${recordId}`);
  return parseRecord(res.data);
}

// ---------- Main ----------

const TEST_EMAIL_PREFIX = 'harper.e.foley'; // Change to your email prefix
const TEST_EMAIL_DOMAIN = 'gmail.com'; // Change to your email domain
const TEST_PHONE = '+18302795914';
const PLACEHOLDER_PHOTO = 'https://placehold.co/400x400/2563eb/white?text=TEST';

async function main() {
  console.log('=== Test Setup: Creating test records in Colorado ===\n');

  // 1. Find Colorado state
  console.log('1. Finding Colorado state...');
  const states = await queryRecords('states', {
    filter: { state_code: { $eq: 'CO' } },
    limit: 1,
  });

  if (states.length === 0) {
    throw new Error('Colorado state not found in Attio');
  }

  const coState = states[0];
  console.log(`   Found: ${coState.name} (${coState.id})`);

  // 2. Find a Colorado area
  console.log('2. Finding a Colorado area...');
  const areas = await queryRecords('areas', {
    filter: { state: { target_record_id: { $eq: coState.id } } },
    limit: 1,
  });

  if (areas.length === 0) {
    throw new Error('No areas found in Colorado');
  }

  const coArea = areas[0];
  console.log(`   Found: ${coArea.name} (${coArea.id})`);

  // 3. Create test agent
  console.log('3. Creating test agent...');
  const testAgent = await createRecord('agents', {
    name: 'Harper Foley (TEST AGENT)',
    first_name: 'Harper',
    last_name: 'Foley (TEST AGENT)',
    email: `${TEST_EMAIL_PREFIX}+testagent@${TEST_EMAIL_DOMAIN}`,
    phone: TEST_PHONE,
    bio: 'Test agent created for end-to-end workflow verification. This record should be deleted after testing.',
    military_service: 'Army',
    military_status: 'Veteran',
    brokerage_name: 'Test Brokerage LLC',
    headshot_url: PLACEHOLDER_PHOTO,
    active_on_website: true,
  });
  console.log(`   Created agent: ${testAgent.id}`);

  // 3b. Create People record for test agent and link it
  console.log('   Creating People record for test agent...');
  const agentPersonId = await assertPerson({
    firstName: 'Harper',
    lastName: 'Foley (TEST AGENT)',
    email: `${TEST_EMAIL_PREFIX}+testagent@${TEST_EMAIL_DOMAIN}`,
    phone: TEST_PHONE,
  });
  await updateRecord('agents', testAgent.id, {
    person: { target_object: 'people', target_record_id: agentPersonId },
  });
  console.log(`   Linked People record: ${agentPersonId}`);

  // 4. Create test lender
  console.log('4. Creating test lender...');
  const testLender = await createRecord('lenders', {
    name: 'Harper Foley (TEST LENDER)',
    first_name: 'Harper',
    last_name: 'Foley (TEST LENDER)',
    email: `${TEST_EMAIL_PREFIX}+testlender@${TEST_EMAIL_DOMAIN}`,
    phone: TEST_PHONE,
    bio: 'Test lender created for end-to-end workflow verification. This record should be deleted after testing.',
    military_service: 'Navy',
    military_status: 'Veteran',
    company_name: 'Test Mortgage Co',
    brokerage_name: 'Test Mortgage Co',
    headshot_url: PLACEHOLDER_PHOTO,
    active_on_website: true,
  });
  console.log(`   Created lender: ${testLender.id}`);

  // 4b. Create People record for test lender and link it
  console.log('   Creating People record for test lender...');
  const lenderPersonId = await assertPerson({
    firstName: 'Harper',
    lastName: 'Foley (TEST LENDER)',
    email: `${TEST_EMAIL_PREFIX}+testlender@${TEST_EMAIL_DOMAIN}`,
    phone: TEST_PHONE,
  });
  await updateRecord('lenders', testLender.id, {
    person: { target_object: 'people', target_record_id: lenderPersonId },
  });
  console.log(`   Linked People record: ${lenderPersonId}`);

  // 5. Create area assignment linking test agent to Colorado area
  console.log('5. Creating area assignment...');
  const areaAssignment = await createRecord('area_assignments', {
    agent: [{ target_object: 'agents', target_record_id: testAgent.id }],
    area: [{ target_object: 'areas', target_record_id: coArea.id }],
    status: 'Active',
    aa_score: 99,
  });
  console.log(`   Created area assignment: ${areaAssignment.id}`);

  // 6. Add test lender to Colorado State.lenders (PATCH appends)
  console.log('6. Adding test lender to Colorado State.lenders...');
  await updateRecord('states', coState.id, {
    lenders: [{ target_object: 'lenders', target_record_id: testLender.id }],
  });
  console.log('   Added test lender to CO state.lenders');

  // 7. Add Colorado to test lender's states reverse-ref (PATCH appends)
  console.log('7. Adding Colorado to test lender states...');
  await updateRecord('lenders', testLender.id, {
    states: [{ target_object: 'states', target_record_id: coState.id }],
  });
  console.log('   Added CO to lender.states');

  // Save test IDs
  const testIds = {
    created_at: new Date().toISOString(),
    colorado_state_id: coState.id,
    colorado_area_id: coArea.id,
    colorado_area_name: coArea.name,
    test_agent_id: testAgent.id,
    test_agent_email: `${TEST_EMAIL_PREFIX}+testagent@${TEST_EMAIL_DOMAIN}`,
    test_agent_person_id: agentPersonId,
    test_lender_id: testLender.id,
    test_lender_email: `${TEST_EMAIL_PREFIX}+testlender@${TEST_EMAIL_DOMAIN}`,
    test_lender_person_id: lenderPersonId,
    area_assignment_id: areaAssignment.id,
  };

  const idsPath = path.join(__dirname, 'test-ids.json');
  fs.writeFileSync(idsPath, JSON.stringify(testIds, null, 2));
  console.log(`\n=== Test IDs saved to ${idsPath} ===`);
  console.log(JSON.stringify(testIds, null, 2));

  console.log('\n=== Setup complete! ===');
  console.log('Next steps:');
  console.log('  1. Start dev server: npm run dev');
  console.log('  2. Visit http://localhost:3000/colorado');
  console.log('  3. Verify test agent and lender appear with placeholder photos');
  console.log('  4. Run through test checklist in docs/e2e-test-plan.md');
  console.log('  5. When done: npx tsx scripts/test-teardown.ts');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
