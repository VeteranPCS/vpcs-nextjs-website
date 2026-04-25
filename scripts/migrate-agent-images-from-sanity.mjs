#!/usr/bin/env node
// Migrate Sanity agent images to local public/images/{agents,lenders}/
//
// Run:
//   node --env-file=.env.local scripts/migrate-agent-images-from-sanity.mjs [flags]
//
// Flags:
//   --dry-run         Don't write files; just log what would happen
//   --force           Overwrite existing local files
//   --only=<sfId>     Process only the matching salesforceID
//   --no-salesforce   Skip Salesforce classification — write everyone to agents/
//
// Files written (extension preserved from Sanity):
//   public/images/agents/{salesforceId}.{ext}
//   public/images/lenders/{salesforceId}.{ext}
//
// Classification comes from Salesforce isAgent__pc / isLender__pc flags.
// A single person can be both (file written to both folders).

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'NEXT_PUBLIC_SANITY_API_VERSION',
  'NEXT_PUBLIC_SANITY_API_TOKEN',
];

const args = parseArgs(process.argv.slice(2));
const log = (...p) => console.log(...p);

function parseArgs(argv) {
  const out = { dryRun: false, force: false, only: null, noSalesforce: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--force') out.force = true;
    else if (a === '--no-salesforce') out.noSalesforce = true;
    else if (a.startsWith('--only=')) out.only = a.slice('--only='.length);
  }
  return out;
}

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

if (!args.noSalesforce) {
  const SF_REQUIRED = [
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_USERNAME',
    'SALESFORCE_PASSWORD',
    'SALESFORCE_TOKEN',
    'SALESFORCE_LOGIN_BASE_URL',
    'SALESFORCE_API_VERSION',
  ];
  for (const key of SF_REQUIRED) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key} (or pass --no-salesforce)`);
      process.exit(1);
    }
  }
}

const SANITY = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
};

async function sanityQuery(groq) {
  const apiVersion = SANITY.apiVersion.startsWith('v') ? SANITY.apiVersion : `v${SANITY.apiVersion}`;
  const url = new URL(
    `https://${SANITY.projectId}.api.sanity.io/${apiVersion}/data/query/${SANITY.dataset}`,
  );
  url.searchParams.set('query', groq);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SANITY.token}` } });
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

async function getSalesforceToken() {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.SALESFORCE_CLIENT_ID,
    client_secret: process.env.SALESFORCE_CLIENT_SECRET,
    username: process.env.SALESFORCE_USERNAME,
    password: `${process.env.SALESFORCE_PASSWORD}${process.env.SALESFORCE_TOKEN}`,
  });
  const res = await fetch(`${process.env.SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`SF auth failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return { token: json.access_token, instanceUrl: json.instance_url };
}

async function sfQuery(token, instanceUrl, soql) {
  const url = `${instanceUrl}/services/data/${process.env.SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`SF query failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function classifyBulk(ids) {
  if (args.noSalesforce || ids.length === 0) {
    return new Map(ids.map((id) => [id, { isAgent: true, isLender: false, active: true }]));
  }
  const { token, instanceUrl } = await getSalesforceToken();
  const map = new Map();
  // Salesforce's Id field rejects 15-char IDs in an IN list. Split the input
  // by length: query Id for 18-char, AccountId_15__c for 15-char.
  const ids15 = ids.filter((id) => id.length === 15);
  const ids18 = ids.filter((id) => id.length === 18);
  const others = ids.filter((id) => id.length !== 15 && id.length !== 18);
  if (others.length) {
    console.log(`  [warn] ${others.length} salesforceID(s) with unexpected length — skipped`);
  }

  async function runChunked(values, fieldName) {
    const chunkSize = 200;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      const literals = chunk.map((v) => `'${v.replace(/'/g, "\\'")}'`).join(', ');
      const soql = `SELECT Id, AccountId_15__c, isAgent__pc, isLender__pc, Active_on_Website__pc FROM Account WHERE IsPersonAccount = true AND ${fieldName} IN (${literals})`;
      const result = await sfQuery(token, instanceUrl, soql);
      for (const r of result.records ?? []) {
        const flags = {
          isAgent: r.isAgent__pc === true,
          isLender: r.isLender__pc === true,
          active: r.Active_on_Website__pc !== false,
        };
        if (r.Id) map.set(r.Id, flags);
        if (r.AccountId_15__c) map.set(r.AccountId_15__c, flags);
      }
    }
  }

  if (ids15.length) await runChunked(ids15, 'AccountId_15__c');
  if (ids18.length) await runChunked(ids18, 'Id');
  return map;
}

function extFromAssetUrl(url) {
  const m = url?.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return m ? m[1].toLowerCase() : 'jpg';
}

async function downloadAndWrite(url, destAbs) {
  if (args.dryRun) { log(`  [dry] would download ${url} → ${destAbs}`); return; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Asset fetch failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destAbs), { recursive: true });
  writeFileSync(destAbs, buf);
}

async function main() {
  log('═══ Sanity Agent Images → public/images/{agents,lenders} ═══');
  log(`Mode: ${args.dryRun ? 'DRY RUN' : 'WRITE'}, force=${args.force}, only=${args.only ?? '(all)'}, noSalesforce=${args.noSalesforce}`);
  log('');

  log('Fetching agents from Sanity...');
  const agents = await sanityQuery(`
    *[_type == "agent" && defined(salesforceID) && defined(image)]{
      _id, name, salesforceID, "imageUrl": image.asset->url, "imageExt": image.asset->extension
    }
  `);
  log(`  → ${agents.length} agents with image + salesforceID`);

  const filtered = args.only ? agents.filter((a) => a.salesforceID === args.only) : agents;
  log(`  → ${filtered.length} after filters`);
  log('');

  const ids = filtered.map((a) => a.salesforceID);
  log(`Classifying ${ids.length} agents via Salesforce...`);
  const classification = await classifyBulk(ids);
  log(`  → ${classification.size} classifications resolved (incl. dual 15/18 IDs)`);
  log('');

  let written = 0;
  let skipped = 0;
  let agentsCount = 0;
  let lendersCount = 0;
  let unclassified = 0;

  for (const a of filtered) {
    const sfId = a.salesforceID;
    const flags = classification.get(sfId) ?? { isAgent: true, isLender: false, active: true };
    if (!classification.has(sfId)) unclassified += 1;

    const ext = a.imageExt || extFromAssetUrl(a.imageUrl);
    const targets = [];
    if (flags.isAgent) targets.push(`agents/${sfId}.${ext}`);
    if (flags.isLender) targets.push(`lenders/${sfId}.${ext}`);
    if (targets.length === 0) targets.push(`agents/${sfId}.${ext}`); // default fallback

    let didWrite = false;
    for (const t of targets) {
      const abs = join(ROOT, 'public', 'images', t);
      if (existsSync(abs) && !args.force) { skipped += 1; continue; }
      try {
        await downloadAndWrite(a.imageUrl, abs);
        didWrite = true;
        if (t.startsWith('agents/')) agentsCount += 1;
        if (t.startsWith('lenders/')) lendersCount += 1;
      } catch (err) {
        log(`  [err] ${sfId} → ${t}: ${err.message}`);
      }
    }
    if (didWrite) {
      written += 1;
      log(`  [ok] ${sfId} (${a.name ?? '?'}) → ${targets.join(', ')}`);
    }
  }

  log('');
  log('═══ Summary ═══');
  log(`  Sanity agents:    ${filtered.length}`);
  log(`  Records written:  ${written}`);
  log(`  Files skipped:    ${skipped} (already existed; use --force to overwrite)`);
  log(`  → agents/:        ${agentsCount}`);
  log(`  → lenders/:       ${lendersCount}`);
  log(`  Unclassified:     ${unclassified} (no Salesforce match — written to agents/ as fallback)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
