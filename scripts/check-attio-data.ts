import { config } from 'dotenv';
config({ path: '.env.local' });

const ATTIO_API_URL = 'https://api.attio.com/v2';

// Create a fresh client with the loaded API key
const apiKey = process.env.ATTIO_API_KEY!;
console.log('API Key length:', apiKey?.length);

async function request(path: string, options: RequestInit = {}) {
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

async function queryRecords(objectSlug: string, options: any = {}) {
  const body: any = {};
  if (options.filter) body.filter = options.filter;
  if (options.limit) body.limit = options.limit;
  if (options.sorts) body.sorts = options.sorts;

  const res = await request(`/objects/${objectSlug}/records/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Flatten the Attio response format
  return res.data.map((record: any) => {
    const flat: any = { id: record.id?.record_id };
    for (const [key, val] of Object.entries(record.values || {})) {
      const arr = val as any[];
      if (arr.length > 0) {
        const firstVal = arr[0];
        // Handle different value types
        if (firstVal.option) {
          // Select field - extract option title
          flat[key] = firstVal.option.title;
        } else if (firstVal.target_record_id) {
          // Record reference - handle multi-ref
          flat[key] = arr.length > 1
            ? arr.map((v: any) => v.target_record_id)
            : firstVal.target_record_id;
        } else if (firstVal.value !== undefined) {
          flat[key] = firstVal.value;
        } else if (firstVal.attribute_type === 'record-reference') {
          flat[key] = arr.map((v: any) => v.target_record_id);
        } else {
          flat[key] = firstVal;
        }
      }
    }
    return flat;
  });
}

async function checkData() {
  console.log('=== Checking Attio Data ===\n');

  // 1. Check area assignments
  console.log('1. AREA ASSIGNMENTS:');
  const assignments = await queryRecords('area_assignments', { limit: 600 });
  console.log(`   Total count: ${assignments.length}`);
  if (assignments.length > 0) {
    const sample = assignments[0];
    console.log(`   Sample: agent=${sample.agent}, area=${sample.area}, status=${sample.status}`);
  }

  // 2. Check states with lenders
  console.log('\n2. STATES WITH LENDERS:');
  const allStates = await queryRecords('states', { limit: 60 });
  console.log(`   Total states: ${allStates.length}`);

  let statesWithLenders = 0;
  let totalLenderRefs = 0;
  for (const state of allStates) {
    const lenders = state.lenders;
    if (lenders) {
      const count = Array.isArray(lenders) ? lenders.length : 1;
      totalLenderRefs += count;
      statesWithLenders++;
      if (statesWithLenders <= 5) {
        console.log(`   ${state.state_code}: ${count} lender(s) - ${JSON.stringify(lenders)}`);
      }
    }
  }
  console.log(`   States with lenders: ${statesWithLenders}/${allStates.length}`);
  console.log(`   Total lender references: ${totalLenderRefs}`);

  // 3. Check lenders
  console.log('\n3. LENDERS:');
  const allLenders = await queryRecords('lenders', { limit: 200 });
  console.log(`   Total lenders: ${allLenders.length}`);

  const activeLenders = allLenders.filter((l: any) => l.active_on_website === true);
  console.log(`   Active on website: ${activeLenders.length}`);

  // 4. Check areas
  console.log('\n4. AREAS:');
  const allAreas = await queryRecords('areas', { limit: 300 });
  console.log(`   Total areas: ${allAreas.length}`);

  // Check how many areas have agents assigned
  const areaIds = new Set(assignments.map((a: any) => a.area).filter(Boolean));
  console.log(`   Areas with agent assignments: ${areaIds.size}`);

  // 5. Check agents
  console.log('\n5. AGENTS:');
  const allAgents = await queryRecords('agents', { limit: 1100 });
  console.log(`   Total agents: ${allAgents.length}`);

  const activeAgents = allAgents.filter((a: any) => a.active_on_website === true);
  console.log(`   Active on website: ${activeAgents.length}`);

  // 6. Check Texas specifically
  console.log('\n6. TEXAS DEEP DIVE:');
  const texas = allStates.find((s: any) => s.state_code === 'TX');
  if (texas) {
    console.log(`   State ID: ${texas.id}`);
    console.log(`   Lenders field: ${JSON.stringify(texas.lenders)}`);
    console.log(`   Lenders is array: ${Array.isArray(texas.lenders)}`);

    // Get areas in Texas
    const texasAreas = allAreas.filter((a: any) => a.state === texas.id);
    console.log(`   Areas in Texas: ${texasAreas.length}`);

    // Get area assignments for Texas areas
    const texasAreaIds = texasAreas.map((a: any) => a.id);
    const texasAssignments = assignments.filter((a: any) => texasAreaIds.includes(a.area));
    console.log(`   Area assignments in Texas: ${texasAssignments.length}`);

    // Check which areas have active agent assignments
    const activeAssignments = texasAssignments.filter((a: any) => a.status === 'Active');
    console.log(`   Active assignments in Texas: ${activeAssignments.length}`);

    // Get unique agents from active Texas assignments
    const texasAgentIds = new Set(activeAssignments.map((a: any) => a.agent));
    console.log(`   Unique agents with active Texas assignments: ${texasAgentIds.size}`);

    // Check how many of those agents are active on website
    const texasActiveAgents = allAgents.filter((a: any) =>
      texasAgentIds.has(a.id) && a.active_on_website === true
    );
    console.log(`   Active on website: ${texasActiveAgents.length}`);

    // List Texas areas and their assignment counts
    console.log('\n   Texas areas breakdown:');
    for (const area of texasAreas.sort((a: any, b: any) => a.name?.localeCompare(b.name))) {
      const areaAssignments = activeAssignments.filter((a: any) => a.area === area.id);
      const agentCount = areaAssignments.length;
      const activeAgentCount = areaAssignments.filter((aa: any) => {
        const agent = allAgents.find((ag: any) => ag.id === aa.agent);
        return agent?.active_on_website === true;
      }).length;
      console.log(`   - ${area.name}: ${activeAgentCount} active agents (${agentCount} assignments)`);
    }
  }
}

checkData().catch(console.error);
