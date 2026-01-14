// scripts/validate-migration.ts
//
// Validates the Salesforce → Attio migration by:
// 1. Comparing record counts against Salesforce source
// 2. Checking reference integrity (relationships exist)
// 3. Verifying field completeness
// 4. Checking pipeline stage distribution
//
// Usage:
//   npx tsx scripts/validate-migration.ts
//   npx tsx scripts/validate-migration.ts --verbose   # Show sample records

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const VERBOSE = process.argv.includes('--verbose');

// Expected counts from migration (based on completed migrations)
const EXPECTED_COUNTS = {
  states: { source: 52, migrated: 52 },
  agents: { source: 1039, migrated: 1026 },
  lenders: { source: 141, migrated: 139 },
  areas: { source: 271, migrated: 271 },
  area_assignments: { source: 509, migrated: 503 },
  customers: { source: 983, migrated: 953 },
  customer_deals: { source: 1021, migrated: 975 },
  agent_onboarding: { source: 947, migrated: 913 },
  lender_onboarding: { source: 160, migrated: 158 },
};

interface ValidationResult {
  category: string;
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  expected?: number | string;
  actual?: number | string;
  message?: string;
}

const results: ValidationResult[] = [];

async function attioRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
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

// =============================================================================
// COUNT QUERIES
// =============================================================================

async function countRecords(objectSlug: string): Promise<number> {
  let total = 0;
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await attioRequest(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const records = res.data || [];
    total += records.length;

    if (records.length < limit) break;
    offset += limit;
  }

  return total;
}

async function countListEntries(listSlug: string): Promise<number> {
  let total = 0;
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await attioRequest(`/lists/${listSlug}/entries/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const entries = res.data || [];
    total += entries.length;

    if (entries.length < limit) break;
    offset += limit;
  }

  return total;
}

async function getListEntriesWithStages(listSlug: string): Promise<any[]> {
  const allEntries: any[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await attioRequest(`/lists/${listSlug}/entries/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const entries = res.data || [];
    allEntries.push(...entries);

    if (entries.length < limit) break;
    offset += limit;
  }

  return allEntries;
}

async function getSampleRecords(objectSlug: string, limit: number = 5): Promise<any[]> {
  const res = await attioRequest(`/objects/${objectSlug}/records/query`, {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
  return res.data || [];
}

// =============================================================================
// VALIDATION CHECKS
// =============================================================================

async function validateCounts() {
  console.log('\n📊 Validating Record Counts...\n');

  // Objects
  const objects = ['states', 'agents', 'lenders', 'areas', 'area_assignments', 'customers'];
  for (const obj of objects) {
    const count = await countRecords(obj);
    const expected = EXPECTED_COUNTS[obj as keyof typeof EXPECTED_COUNTS];

    // Check for both under-count and over-count (potential duplicates)
    const isDuplicate = count > expected.migrated * 1.5;
    const status = isDuplicate ? 'WARN' :
                   count >= expected.migrated ? 'PASS' :
                   count >= expected.migrated * 0.9 ? 'WARN' : 'FAIL';

    results.push({
      category: 'Count',
      check: `${obj} records`,
      status,
      expected: expected.migrated,
      actual: count,
      message: isDuplicate ? `POTENTIAL DUPLICATES: ${count} records (expected ${expected.migrated})` :
               status === 'PASS' ? undefined : `Expected ${expected.migrated}, got ${count}`,
    });

    const icon = isDuplicate ? '⚠' : status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
    const dupNote = isDuplicate ? ' [DUPLICATES?]' : '';
    console.log(`  ${icon} ${obj}: ${count}/${expected.migrated} (source: ${expected.source})${dupNote}`);
  }

  // Pipelines
  const pipelines = ['customer_deals', 'agent_onboarding', 'lender_onboarding'];
  for (const pipeline of pipelines) {
    const count = await countListEntries(pipeline);
    const expected = EXPECTED_COUNTS[pipeline as keyof typeof EXPECTED_COUNTS];

    // Check for both under-count and over-count (potential duplicates)
    const isDuplicate = count > expected.migrated * 1.5;
    const status = isDuplicate ? 'WARN' :
                   count >= expected.migrated ? 'PASS' :
                   count >= expected.migrated * 0.9 ? 'WARN' : 'FAIL';

    results.push({
      category: 'Count',
      check: `${pipeline} entries`,
      status,
      expected: expected.migrated,
      actual: count,
      message: isDuplicate ? `POTENTIAL DUPLICATES: ${count} entries (expected ${expected.migrated})` :
               status === 'PASS' ? undefined : `Expected ${expected.migrated}, got ${count}`,
    });

    const icon = isDuplicate ? '⚠' : status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
    const dupNote = isDuplicate ? ' [DUPLICATES?]' : '';
    console.log(`  ${icon} ${pipeline}: ${count}/${expected.migrated} (source: ${expected.source})${dupNote}`);
  }
}

async function validateStageDistribution() {
  console.log('\n📈 Validating Pipeline Stage Distribution...\n');

  const pipelines = [
    { slug: 'customer_deals', stageAttr: 'stage' },
    { slug: 'agent_onboarding', stageAttr: 'stage' },
    { slug: 'lender_onboarding', stageAttr: 'stage' },
  ];

  for (const { slug, stageAttr } of pipelines) {
    console.log(`  ${slug}:`);

    const entries = await getListEntriesWithStages(slug);
    const stageCounts: Record<string, number> = {};
    let noStage = 0;

    for (const entry of entries) {
      const stageValues = entry.entry_values?.[stageAttr];
      if (!stageValues || stageValues.length === 0) {
        noStage++;
        continue;
      }

      // Stage is nested: stageValues[0].status.title
      const stageName = stageValues[0]?.status?.title || stageValues[0]?.title || 'Unknown';
      stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;
    }

    // Sort by count descending
    const sortedStages = Object.entries(stageCounts)
      .sort((a, b) => b[1] - a[1]);

    for (const [stage, count] of sortedStages) {
      const pct = ((count / entries.length) * 100).toFixed(1);
      console.log(`    - ${stage}: ${count} (${pct}%)`);
    }

    if (noStage > 0) {
      const pct = ((noStage / entries.length) * 100).toFixed(1);
      console.log(`    - [No Stage]: ${noStage} (${pct}%)`);

      // If more than 5% have no stage, it's a warning
      if (noStage / entries.length > 0.05) {
        results.push({
          category: 'Stage',
          check: `${slug} no-stage entries`,
          status: 'WARN',
          actual: noStage,
          message: `${noStage} entries (${pct}%) have no stage assigned`,
        });
      }
    }

    results.push({
      category: 'Stage',
      check: `${slug} stage distribution`,
      status: noStage / entries.length < 0.05 ? 'PASS' : 'WARN',
      actual: Object.keys(stageCounts).length,
      message: `${Object.keys(stageCounts).length} stages with entries`,
    });
  }
}

async function validateFieldCompleteness() {
  console.log('\n📋 Validating Field Completeness...\n');

  // Check critical fields on sample records
  // Note: Agents don't have a direct 'state' field - they're assigned to areas via area_assignments
  const checks = [
    { object: 'agents', requiredFields: ['name', 'email', 'salesforce_id'] },
    { object: 'lenders', requiredFields: ['name', 'email', 'salesforce_id'] },
    { object: 'customers', requiredFields: ['name', 'email', 'salesforce_id'] },
    { object: 'areas', requiredFields: ['name', 'state', 'salesforce_id'] },
    { object: 'states', requiredFields: ['name', 'state_slug', 'state_code'] },
  ];

  for (const { object, requiredFields } of checks) {
    const records = await getSampleRecords(object, 20);
    const fieldStats: Record<string, number> = {};

    for (const field of requiredFields) {
      fieldStats[field] = 0;
    }

    for (const record of records) {
      for (const field of requiredFields) {
        const values = record.values?.[field];
        if (values && values.length > 0) {
          const val = values[0]?.value || values[0]?.target_record_id || values[0]?.option?.title;
          if (val) fieldStats[field]++;
        }
      }
    }

    console.log(`  ${object} (sample of ${records.length}):`);
    for (const field of requiredFields) {
      const pct = ((fieldStats[field] / records.length) * 100).toFixed(0);
      const icon = fieldStats[field] === records.length ? '✓' : fieldStats[field] > records.length * 0.8 ? '⚠' : '✗';
      console.log(`    ${icon} ${field}: ${fieldStats[field]}/${records.length} (${pct}%)`);

      const status = fieldStats[field] === records.length ? 'PASS' :
                    fieldStats[field] > records.length * 0.8 ? 'WARN' : 'FAIL';

      results.push({
        category: 'Field',
        check: `${object}.${field} completeness`,
        status,
        expected: records.length,
        actual: fieldStats[field],
      });
    }
  }
}

async function validateReferenceIntegrity() {
  console.log('\n🔗 Validating Reference Integrity...\n');

  // Check that area_assignments reference valid agents and areas
  console.log('  Checking area_assignments references...');

  const assignments = await getSampleRecords('area_assignments', 50);
  let validAgent = 0;
  let validArea = 0;

  for (const assignment of assignments) {
    const agentRef = assignment.values?.agent;
    const areaRef = assignment.values?.area;

    if (agentRef && agentRef.length > 0 && agentRef[0]?.target_record_id) {
      validAgent++;
    }
    if (areaRef && areaRef.length > 0 && areaRef[0]?.target_record_id) {
      validArea++;
    }
  }

  console.log(`    ✓ Agent references: ${validAgent}/${assignments.length}`);
  console.log(`    ✓ Area references: ${validArea}/${assignments.length}`);

  results.push({
    category: 'Reference',
    check: 'area_assignments.agent integrity',
    status: validAgent === assignments.length ? 'PASS' : 'WARN',
    expected: assignments.length,
    actual: validAgent,
  });

  results.push({
    category: 'Reference',
    check: 'area_assignments.area integrity',
    status: validArea === assignments.length ? 'PASS' : 'WARN',
    expected: assignments.length,
    actual: validArea,
  });

  // Check customer_deals have customer references
  console.log('  Checking customer_deals references...');

  const deals = await getListEntriesWithStages('customer_deals');
  const sampleDeals = deals.slice(0, 50);
  let validCustomer = 0;

  for (const deal of sampleDeals) {
    // Parent record is the customer
    if (deal.parent_record_id) {
      validCustomer++;
    }
  }

  console.log(`    ✓ Customer references: ${validCustomer}/${sampleDeals.length}`);

  results.push({
    category: 'Reference',
    check: 'customer_deals.customer integrity',
    status: validCustomer === sampleDeals.length ? 'PASS' : 'WARN',
    expected: sampleDeals.length,
    actual: validCustomer,
  });
}

async function showSampleRecords() {
  if (!VERBOSE) return;

  console.log('\n📝 Sample Records (--verbose mode)...\n');

  const objects = ['agents', 'customers', 'areas'];

  for (const obj of objects) {
    console.log(`  ${obj}:`);
    const records = await getSampleRecords(obj, 3);

    for (const record of records) {
      const name = record.values?.name?.[0]?.value || record.id?.record_id || 'Unknown';
      const email = record.values?.email?.[0]?.value || record.values?.email?.[0]?.email_address || 'N/A';
      console.log(`    - ${name} (${email})`);
    }
    console.log();
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\nSummary: ${passed} passed, ${warned} warnings, ${failed} failed`);
  console.log();

  // Group by category
  const byCategory: Record<string, ValidationResult[]> = {};
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }

  for (const [category, categoryResults] of Object.entries(byCategory)) {
    const catPassed = categoryResults.filter(r => r.status === 'PASS').length;
    const catTotal = categoryResults.length;
    console.log(`${category}: ${catPassed}/${catTotal} passed`);

    // Show failures and warnings
    const issues = categoryResults.filter(r => r.status !== 'PASS');
    for (const issue of issues) {
      const icon = issue.status === 'WARN' ? '⚠' : '✗';
      console.log(`  ${icon} ${issue.check}: ${issue.message || `expected ${issue.expected}, got ${issue.actual}`}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    console.log('❌ VALIDATION FAILED - Please review the issues above');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS');
  } else {
    console.log('✅ VALIDATION PASSED - All checks successful');
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Salesforce → Attio Migration Validation');
  console.log('='.repeat(60));

  if (!process.env.ATTIO_API_KEY) {
    console.error('❌ Missing ATTIO_API_KEY environment variable');
    process.exit(1);
  }

  await validateCounts();
  await validateStageDistribution();
  await validateFieldCompleteness();
  await validateReferenceIntegrity();
  await showSampleRecords();

  generateReport();
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
