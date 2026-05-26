#!/usr/bin/env node
// Classifies a list of Salesforce Account IDs as agent or lender.
// Usage: node --env-file=.env.local scripts/classify-headshot-ids.mjs <id1> <id2> ...

const REQUIRED = [
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_USERNAME',
    'SALESFORCE_PASSWORD',
    'SALESFORCE_TOKEN',
    'SALESFORCE_LOGIN_BASE_URL',
    'SALESFORCE_API_VERSION',
];

for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`Missing env var: ${key}`);
        process.exit(1);
    }
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
    console.error('Usage: classify-headshot-ids.mjs <id1> <id2> ...');
    process.exit(1);
}

async function getToken() {
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
    if (!res.ok) throw new Error(`Auth ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return { token: j.access_token, instanceUrl: j.instance_url };
}

const { token, instanceUrl } = await getToken();

console.log('ID                Name                          Person  Agent  Lender  -> Classification');
console.log('─'.repeat(110));

for (const id of ids) {
    const url = `${instanceUrl}/services/data/${process.env.SALESFORCE_API_VERSION}/sobjects/Account/${id}?fields=Id,Name,IsPersonAccount,isAgent__pc,isLender__pc`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        console.log(`${id}  NOT FOUND (${res.status})`);
        continue;
    }
    const r = await res.json();
    const cls = r.isAgent__pc ? 'agent' : r.isLender__pc ? 'lender' : 'OTHER';
    console.log(
        `${r.Id}  ${(r.Name ?? '').padEnd(30)}  ${String(r.IsPersonAccount).padEnd(6)}  ${String(r.isAgent__pc).padEnd(5)}  ${String(r.isLender__pc).padEnd(6)}  -> ${cls}`,
    );
}
