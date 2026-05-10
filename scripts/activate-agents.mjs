#!/usr/bin/env node
// Flip Active_on_Website__pc=true on one or more Account records by 15-char Id.
// The Salesforce REST API accepts the 15-char form directly — no need to look
// up the 18-char Id first.
//
// Run:
//   node --env-file=.env.local scripts/activate-agents.mjs <ID15> [<ID15> ...]
// Example:
//   node --env-file=.env.local scripts/activate-agents.mjs 001Rg00000jRsVT 001Rg00000kARxJ

const E = process.env;
const REQUIRED = [
    'SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_USERNAME', 'SALESFORCE_PASSWORD', 'SALESFORCE_TOKEN',
    'SALESFORCE_LOGIN_BASE_URL', 'SALESFORCE_API_VERSION',
];
for (const k of REQUIRED) if (!E[k]) { console.error(`Missing env var: ${k}`); process.exit(1); }

const TARGETS = process.argv.slice(2);
if (TARGETS.length === 0) {
    console.error('Usage: node --env-file=.env.local scripts/activate-agents.mjs <ID15> [<ID15> ...]');
    console.error('Example: node --env-file=.env.local scripts/activate-agents.mjs 001Rg00000jRsVT 001Rg00000kARxJ');
    process.exit(1);
}

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

async function patch(token, instanceUrl, id15, body) {
    const url = `${instanceUrl}/services/data/${E.SALESFORCE_API_VERSION}/sobjects/Account/${id15}`;
    const r = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return { ok: r.ok, status: r.status, text: r.ok ? '' : await r.text() };
}

async function lookup(token, instanceUrl, id15) {
    const soql = `SELECT Name, Active_on_Website__pc FROM Account WHERE AccountId_15__c='${id15}'`;
    const url = `${instanceUrl}/services/data/${E.SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    return j.records?.[0] || null;
}

const { token, instanceUrl } = await tok();
console.log('✓ Authenticated\n');

console.log('── BEFORE ──');
for (const id15 of TARGETS) {
    const rec = await lookup(token, instanceUrl, id15);
    console.log(`  ${id15}: ${rec ? `${rec.Name} (Active=${rec.Active_on_Website__pc})` : 'NOT FOUND'}`);
}

console.log('\n── PATCHing Active_on_Website__pc=true ──');
for (const id15 of TARGETS) {
    const r = await patch(token, instanceUrl, id15, { Active_on_Website__pc: true });
    console.log(`  ${id15}: ${r.ok ? '✓ 204 No Content' : `✗ ${r.status} ${r.text}`}`);
}

console.log('\n── AFTER ──');
for (const id15 of TARGETS) {
    const rec = await lookup(token, instanceUrl, id15);
    console.log(`  ${id15}: ${rec ? `${rec.Name} (Active=${rec.Active_on_Website__pc})` : 'NOT FOUND'}`);
}
