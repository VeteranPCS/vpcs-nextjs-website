#!/usr/bin/env node
// Diagnose why agents in Bozeman, Montana aren't showing on the state page.
//
// Runs 5 diagnostic layers in sequence:
//   A. Raw MT agent count (no headshot filter) — are there active MT-licensed agents?
//   B. Area assignment sweep — which agents have a Bozeman area assignment for MT?
//   C. Headshot file check — do Bozeman agents have their .webp files locally?
//   D. State slug normalization — does Area__r.State__c normalize to "montana"?
//   E. Simulate groupAgentsByAreaForState("montana") — what would actually render?
//
// Run:
//   node --env-file=.env.local scripts/diagnose-bozeman-agents.mjs

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const E = process.env;
const REQUIRED = [
  'SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET',
  'SALESFORCE_USERNAME', 'SALESFORCE_PASSWORD', 'SALESFORCE_TOKEN',
  'SALESFORCE_LOGIN_BASE_URL', 'SALESFORCE_API_VERSION',
];
for (const k of REQUIRED) {
  if (!E[k]) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

// ── Replicate normalizeStateSlug from lib/states.ts (inline — can't import TS) ──

const US_STATES = require('../content/_data/us-states.json');

const STATE_ABBR_TO_SLUG = Object.fromEntries(US_STATES.map((s) => [s.code, s.slug]));
const STATE_SLUG_TO_ABBR = Object.fromEntries(US_STATES.map((s) => [s.slug, s.code]));

function compactStateInput(value) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/\./g, '').replace(/[^a-z0-9]+/g, '').trim();
}
const STATE_NAME_TO_ABBR = Object.fromEntries(US_STATES.map((s) => [compactStateInput(s.name), s.code]));
const STATE_ALIAS_TO_ABBR = { dc: 'DC', dca: 'DC', districtcolumbia: 'DC', districtofcolumbia: 'DC', washingtondc: 'DC' };

function slugifyStateInput(value) {
  return value.toLowerCase().trim().replace(/&/g, ' and ').replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function stateCodeFromDisplayName(value) {
  const compact = compactStateInput(value);
  return STATE_NAME_TO_ABBR[compact] ?? STATE_ALIAS_TO_ABBR[compact] ?? null;
}

function normalizeStateCode(value) {
  if (!value?.trim()) return null;
  const upper = value.trim().toUpperCase();
  if (STATE_ABBR_TO_SLUG[upper]) return upper;
  return STATE_SLUG_TO_ABBR[slugifyStateInput(value)] ?? stateCodeFromDisplayName(value) ?? null;
}

function normalizeStateSlug(value) {
  const code = normalizeStateCode(value);
  return code ? STATE_ABBR_TO_SLUG[code] : null;
}

// ── Salesforce helpers ────────────────────────────────────────────────────────

async function tok() {
  const p = new URLSearchParams({
    grant_type: 'password',
    client_id: E.SALESFORCE_CLIENT_ID,
    client_secret: E.SALESFORCE_CLIENT_SECRET,
    username: E.SALESFORCE_USERNAME,
    password: `${E.SALESFORCE_PASSWORD}${E.SALESFORCE_TOKEN}`,
  });
  const r = await fetch(`${E.SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p.toString(),
  });
  if (!r.ok) throw new Error(`Auth failed (${r.status}): ${await r.text()}`);
  const j = await r.json();
  return { token: j.access_token, instanceUrl: j.instance_url };
}

async function sfQuery(token, instanceUrl, soql) {
  const url = `${instanceUrl}/services/data/${E.SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await r.text();
  if (!r.ok) throw new Error(`Query failed (${r.status}): ${text}`);
  return JSON.parse(text);
}

function headshotPath(id15) {
  return join(__dirname, '..', 'public', 'images', 'agents', `${id15}.webp`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { token, instanceUrl } = await tok();
console.log('✓ Authenticated to Salesforce\n');

// ── Layer A: Raw MT agent count ───────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════════════');
console.log('LAYER A — Raw Salesforce query: all active MT-licensed agents');
console.log('══════════════════════════════════════════════════════════════════\n');

const rawQuery = `
  SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc,
         Military_Service__pc, Brokerage_Name__pc, BillingAddress,
         (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
  FROM Account
  WHERE isAgent__pc = true
    AND Active_on_Website__pc = true
    AND (State_s_Licensed_in__pc LIKE '%MT%'
        OR Other_States__pc INCLUDES ('MT'))
`.replace(/\s+/g, ' ').trim();

const rawResult = await sfQuery(token, instanceUrl, rawQuery);
const agents = rawResult.records;

if (agents.length === 0) {
  console.log('✗ LAYER A FAIL: Zero agents returned. Check Active_on_Website__pc and MT licensing flags in Salesforce.');
  console.log('  No further layers can run.\n');
  process.exit(0);
}

console.log(`✓ ${agents.length} agent(s) found in Salesforce for MT (active, licensed)\n`);

// ── Layer B: Area assignment sweep ────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════════════');
console.log('LAYER B — Area assignment sweep (all area assignments for MT agents)');
console.log('══════════════════════════════════════════════════════════════════\n');

const agentsWithBozeman = [];
const agentsWithMtAreas = [];
const agentsWithNoAreas = [];

for (const agent of agents) {
  const areas = agent.Area_Assignments__r?.records ?? [];
  if (areas.length === 0) {
    agentsWithNoAreas.push(agent);
    continue;
  }
  const mtAreas = areas.filter((a) => normalizeStateSlug(a.Area__r?.State__c) === 'montana');
  if (mtAreas.length > 0) agentsWithMtAreas.push(agent);
  const bozemanArea = mtAreas.find((a) => a.Area__r?.Name?.toLowerCase().includes('bozeman'));
  if (bozemanArea) agentsWithBozeman.push({ agent, bozemanArea });
}

console.log(`  ${agentsWithNoAreas.length} agent(s) have NO Area_Assignments__r at all`);
console.log(`  ${agentsWithMtAreas.length} agent(s) have at least one MT area assignment`);
console.log(`  ${agentsWithBozeman.length} agent(s) have a Bozeman-MT area assignment\n`);

if (agentsWithNoAreas.length > 0) {
  console.log('  Agents with NO area assignments (won\'t appear on any city section):');
  for (const a of agentsWithNoAreas) {
    console.log(`    - ${a.Name} (${a.AccountId_15__c})`);
  }
  console.log();
}

if (agentsWithBozeman.length === 0) {
  console.log('✗ LAYER B FAIL: No agents have a Bozeman area assignment.');
  console.log('  → Root cause is likely missing Area Assignment records in Salesforce.');
  console.log('  All MT area assignments found across all agents:');
  for (const agent of agents) {
    const areas = agent.Area_Assignments__r?.records ?? [];
    if (areas.length > 0) {
      console.log(`\n  ${agent.Name} (${agent.AccountId_15__c}):`);
      for (const a of areas) {
        console.log(`    - Area: "${a.Area__r?.Name}", State__c: "${a.Area__r?.State__c}", Score: ${a.AA_Score__c}`);
      }
    }
  }
  console.log();
  process.exit(0);
}

console.log(`✓ Agents with Bozeman area assignments:`);
for (const { agent, bozemanArea } of agentsWithBozeman) {
  console.log(`  - ${agent.Name} (${agent.AccountId_15__c}) — Area: "${bozemanArea.Area__r?.Name}", State__c: "${bozemanArea.Area__r?.State__c}", Score: ${bozemanArea.AA_Score__c}`);
}
console.log();

// ── Layer C: Headshot file check ──────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════════════');
console.log('LAYER C — Headshot file check (public/images/agents/{id15}.webp)');
console.log('══════════════════════════════════════════════════════════════════\n');

const agentsWithHeadshot = [];
const agentsWithoutHeadshot = [];

for (const { agent } of agentsWithBozeman) {
  const path = headshotPath(agent.AccountId_15__c);
  if (existsSync(path)) {
    agentsWithHeadshot.push(agent);
  } else {
    agentsWithoutHeadshot.push(agent);
  }
}

if (agentsWithoutHeadshot.length > 0) {
  console.log(`✗ ${agentsWithoutHeadshot.length} Bozeman agent(s) are MISSING headshot files (silently dropped on state page):`);
  for (const a of agentsWithoutHeadshot) {
    console.log(`   - ${a.Name} (${a.AccountId_15__c}) → missing: public/images/agents/${a.AccountId_15__c}.webp`);
  }
  console.log();
}

if (agentsWithHeadshot.length > 0) {
  console.log(`✓ ${agentsWithHeadshot.length} Bozeman agent(s) have headshot files:`);
  for (const a of agentsWithHeadshot) {
    console.log(`   - ${a.Name} (${a.AccountId_15__c})`);
  }
  console.log();
}

// ── Layer D: State slug normalization ─────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════════════');
console.log('LAYER D — normalizeStateSlug test for all Area__r.State__c values');
console.log('══════════════════════════════════════════════════════════════════\n');

const stateValues = new Map(); // State__c value → set of agents using it
for (const agent of agents) {
  for (const a of agent.Area_Assignments__r?.records ?? []) {
    const val = a.Area__r?.State__c ?? '(null)';
    if (!stateValues.has(val)) stateValues.set(val, []);
    stateValues.get(val).push(agent.Name);
  }
}

let slugNormalizationBug = false;
for (const [val, agentNames] of stateValues) {
  const slug = normalizeStateSlug(val);
  const ok = slug !== null;
  const marker = ok ? '✓' : '✗';
  console.log(`  ${marker} "${val}" → normalizeStateSlug → "${slug ?? 'null (unrecognized!)'}"  (${agentNames.length} assignment(s))`);
  if (!ok) slugNormalizationBug = true;
}

if (slugNormalizationBug) {
  console.log('\n✗ LAYER D WARN: Some Area__r.State__c values don\'t normalize to a valid slug.');
  console.log('  These agents\' area assignments are invisible to groupAgentsByAreaForState.');
} else {
  console.log('\n✓ All State__c values normalize correctly.');
}
console.log();

// ── Layer E: Simulate groupAgentsByAreaForState("montana") ────────────────────

console.log('══════════════════════════════════════════════════════════════════');
console.log('LAYER E — Simulate groupAgentsByAreaForState("montana")');
console.log('  (using all agents, no headshot filter — shows raw grouping)');
console.log('══════════════════════════════════════════════════════════════════\n');

const groups = {};
for (const agent of agents) {
  const targetSlug = 'montana';
  const assignments = (agent.Area_Assignments__r?.records ?? []).filter((a) => {
    const areaSlug = normalizeStateSlug(a.Area__r?.State__c);
    return Boolean(areaSlug && areaSlug === targetSlug);
  });
  for (const a of assignments) {
    if (!a.Area__r?.Name) continue;
    const name = a.Area__r.Name;
    if (!groups[name]) groups[name] = [];
    groups[name].push({ name: agent.Name, id15: agent.AccountId_15__c, score: a.AA_Score__c ?? 0 });
  }
}

const cityNames = Object.keys(groups).sort();
if (cityNames.length === 0) {
  console.log('✗ groupAgentsByAreaForState returns EMPTY — no agents would appear on /montana.\n');
} else {
  console.log(`✓ ${cityNames.length} city group(s) would render on /montana:\n`);
  for (const city of cityNames) {
    const agentsInCity = groups[city].sort((a, b) => b.score - a.score);
    const bozemanMarker = city.toLowerCase().includes('bozeman') ? ' ← Bozeman' : '';
    console.log(`  ${city}${bozemanMarker} (${agentsInCity.length} agent(s)):`);
    for (const a of agentsInCity) {
      const hasShot = existsSync(headshotPath(a.id15));
      const shotMarker = hasShot ? '✓headshot' : '✗no headshot (would be dropped by state page)';
      console.log(`    - ${a.name} (${a.id15}) score=${a.score} [${shotMarker}]`);
    }
  }

  if (!groups['Bozeman'] && !cityNames.some((c) => c.toLowerCase().includes('bozeman'))) {
    console.log('\n✗ No "Bozeman" group exists in the grouping output.');
    console.log('  → There are MT area assignments but none for a "Bozeman" area.');
  }
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('DIAGNOSIS SUMMARY');
console.log('══════════════════════════════════════════════════════════════════\n');

if (agentsWithBozeman.length === 0) {
  console.log('ROOT CAUSE → Missing Area Assignments in Salesforce.');
  console.log('  No agents have an Area Assignment with Area__r.Name = "Bozeman" and');
  console.log('  Area__r.State__c normalizing to "montana".');
  console.log('  Fix: In Salesforce, create/update Area_Assignment__c records on the');
  console.log('  relevant Agent Account(s) linking to the Bozeman Area object for Montana.');
} else if (agentsWithBozeman.length > 0 && agentsWithHeadshot.length === 0) {
  console.log('ROOT CAUSE → Missing headshot files.');
  console.log('  Agents have correct Bozeman area assignments but no .webp headshot');
  console.log('  files in public/images/agents/. State pages require headshots by default.');
  console.log('  Fix: Run the headshot classify/import workflow for the agents listed in Layer C.');
} else if (slugNormalizationBug) {
  console.log('ROOT CAUSE → State slug normalization mismatch.');
  console.log('  Some Area__r.State__c values in Salesforce don\'t normalize to a valid slug.');
  console.log('  Fix: Correct the State__c values on the Area object(s) in Salesforce,');
  console.log('  or patch normalizeStateSlug in lib/states.ts to handle the stored format.');
} else if (agentsWithHeadshot.length > 0) {
  console.log('✓ Agents exist with Bozeman assignments AND headshots. If the page still shows');
  console.log('  nothing, the issue may be a build/ISR cache or a rendering bug.');
  console.log('  Run `npm run dev` and visit /montana to verify live behavior.');
} else {
  console.log('Could not determine root cause from the data above. Review Layer output carefully.');
}
console.log();
