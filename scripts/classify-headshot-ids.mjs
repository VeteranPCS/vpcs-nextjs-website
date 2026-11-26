#!/usr/bin/env node
// Classifies a list of Salesforce Account IDs as agent or lender.
// Usage: node scripts/classify-headshot-ids.mjs <id1> <id2> ...

import { accountIdPattern, connectSandbox } from './lib/salesforce-sandbox.mjs';

const ids = process.argv.slice(2);
if (ids.length === 0 || !ids.every(id => accountIdPattern.test(id))) {
    console.error('Usage: node scripts/classify-headshot-ids.mjs <Account ID> [...]');
    process.exit(1);
}

const { get } = await connectSandbox();

console.log('ID                Name                          Person  Agent  Lender  -> Classification');
console.log('─'.repeat(110));

for (const id of ids) {
    const res = await get(`/sobjects/Account/${id}?fields=Id,Name,IsPersonAccount,isAgent__pc,isLender__pc`);
    if (!res.ok) {
        console.log(`${id}  NOT FOUND (${res.status})`);
        continue;
    }
    const r = res.body;
    const cls = r.isAgent__pc ? 'agent' : r.isLender__pc ? 'lender' : 'OTHER';
    console.log(
        `${r.Id}  ${(r.Name ?? '').padEnd(30)}  ${String(r.IsPersonAccount).padEnd(6)}  ${String(r.isAgent__pc).padEnd(5)}  ${String(r.isLender__pc).padEnd(6)}  -> ${cls}`,
    );
}
