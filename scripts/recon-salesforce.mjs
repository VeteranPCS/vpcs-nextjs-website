#!/usr/bin/env node
// One-shot recon script. Verifies whether the Salesforce org actually has the
// Opportunity schema that docs/REVERSION-PLAN.md assumes, so we know whether
// `lib/salesforce-deals.ts` can target Opportunity or needs a different object.
//
// Run:
//   node --env-file=.env.local scripts/recon-salesforce.mjs
//
// Output:
//   - stdout: human-readable reconciliation summary
//   - docs/salesforce-schema/opportunity-reconciliation.md: committed summary
//   - docs/salesforce-schema/raw/*.json: raw dumps (gitignored)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_USERNAME',
    'SALESFORCE_PASSWORD',
    'SALESFORCE_TOKEN',
    'SALESFORCE_LOGIN_BASE_URL',
    'SALESFORCE_API_VERSION',
    'VPCS_SALESFORCE_BASE_URL',
];

for (const key of REQUIRED) {
    if (!process.env[key]) {
        console.error(`Missing env var: ${key}`);
        console.error('Run with: node --env-file=.env.local scripts/recon-salesforce.mjs');
        process.exit(1);
    }
}

const {
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD,
    SALESFORCE_TOKEN,
    SALESFORCE_LOGIN_BASE_URL,
    SALESFORCE_API_VERSION,
    VPCS_SALESFORCE_BASE_URL,
} = process.env;

// Fields the reversion plan assumes exist on Opportunity.
const PLAN_FIELDS = [
    'Id',
    'Name',
    'StageName',
    'AccountId',
    'LastModifiedDate',
    'Agent__c',
    'Lender__c',
    'Sale_Price__c',
    'Property_Address__c',
    'Expected_Close_Date__c',
    'Actual_Close_Date__c',
    'Buying_andor_Selling__c',
    'Payout_Amount__c',
    'Charity_Amount__c',
    'Closing_Commission__c',
    'Destination_State__c',
];

// Picklist stage values the reversion plan's SOQL filters against.
const PLAN_STAGES = [
    'Under Contract',
    'Transaction Closed',
    'Paid - Complete',
    'Closed - Lost',
];

// RecordTypeId the plan assumes is the "Customer" pipeline.
const PLAN_RECORD_TYPE_ID = '0124x000000Z7G3AAK';

const RAW_DIR = 'docs/salesforce-schema/raw';
mkdirSync(RAW_DIR, { recursive: true });

async function getToken() {
    const params = new URLSearchParams({
        grant_type: 'password',
        client_id: SALESFORCE_CLIENT_ID,
        client_secret: SALESFORCE_CLIENT_SECRET,
        username: SALESFORCE_USERNAME,
        password: `${SALESFORCE_PASSWORD}${SALESFORCE_TOKEN}`,
    });
    const res = await fetch(`${SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });
    if (!res.ok) {
        throw new Error(`Auth failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    return { token: json.access_token, instanceUrl: json.instance_url };
}

async function sfGet(token, instanceUrl, path) {
    const base = instanceUrl || VPCS_SALESFORCE_BASE_URL;
    const url = `${base}/services/data/${SALESFORCE_API_VERSION}${path}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    if (!res.ok) {
        return { ok: false, status: res.status, body: text, url };
    }
    return { ok: true, status: res.status, body: JSON.parse(text), url };
}

function writeRaw(name, data) {
    writeFileSync(join(RAW_DIR, name), JSON.stringify(data, null, 2));
}

function check(bool) {
    return bool ? '✓' : '✗';
}

async function main() {
    console.log('═══ Salesforce Schema Recon ═══\n');

    console.log('1. Authenticating...');
    const { token, instanceUrl } = await getToken();
    console.log(`   Authenticated. Instance: ${instanceUrl}\n`);

    console.log('2. Listing accessible SObjects...');
    const sobjects = await sfGet(token, instanceUrl, '/sobjects');
    if (!sobjects.ok) {
        console.error(`   FAIL (${sobjects.status}): ${sobjects.body}`);
        process.exit(1);
    }
    writeRaw('sobjects.json', sobjects.body);
    const allNames = sobjects.body.sobjects.map((s) => s.name);
    const customObjects = allNames.filter((n) => n.endsWith('__c'));
    const dealLikeObjects = allNames.filter((n) =>
        /deal|opportunity|transaction|pipeline|customer/i.test(n),
    );
    const opportunityPresent = allNames.includes('Opportunity');
    console.log(`   Total SObjects: ${allNames.length}`);
    console.log(`   Custom objects (__c): ${customObjects.length}`);
    console.log(`   Opportunity present: ${check(opportunityPresent)}`);
    console.log(`   Deal-like objects: ${dealLikeObjects.join(', ') || '(none)'}\n`);

    let opportunityFields = new Set();
    let opportunityRecordTypes = [];
    let stagePicklist = [];
    let opportunityCount = null;

    if (opportunityPresent) {
        console.log('3. Describing Opportunity...');
        const describe = await sfGet(token, instanceUrl, '/sobjects/Opportunity/describe');
        if (!describe.ok) {
            console.error(`   FAIL (${describe.status}): ${describe.body}`);
        } else {
            writeRaw('opportunity-describe.json', describe.body);
            opportunityFields = new Set(describe.body.fields.map((f) => f.name));
            opportunityRecordTypes = describe.body.recordTypeInfos.map((rt) => ({
                id: rt.recordTypeId,
                name: rt.name,
                developerName: rt.developerName,
                available: rt.available,
                defaultRecordType: rt.defaultRecordTypeMapping,
            }));
            const stageField = describe.body.fields.find((f) => f.name === 'StageName');
            stagePicklist = stageField?.picklistValues?.map((p) => p.value) || [];
            console.log(`   Fields: ${opportunityFields.size}`);
            console.log(`   RecordTypes: ${opportunityRecordTypes.length}`);
            console.log(`   StageName values: ${stagePicklist.length}\n`);
        }

        console.log('4. Counting Opportunity records...');
        const count = await sfGet(
            token,
            instanceUrl,
            `/query?q=${encodeURIComponent('SELECT COUNT(Id) c FROM Opportunity')}`,
        );
        if (count.ok) {
            opportunityCount = count.body.records?.[0]?.c ?? null;
            console.log(`   Total Opportunity records: ${opportunityCount}\n`);
        } else {
            console.log(`   Query failed (${count.status}): ${count.body}\n`);
        }
    } else {
        console.log('3-4. Opportunity not present — skipping describe/count.\n');
    }

    console.log('═══ Reconciliation vs. REVERSION-PLAN.md ═══\n');

    console.log('Assumed fields on Opportunity:');
    const missingFields = [];
    for (const field of PLAN_FIELDS) {
        const present = opportunityFields.has(field);
        console.log(`   ${check(present)} ${field}`);
        if (!present) missingFields.push(field);
    }
    console.log();

    console.log('Assumed StageName picklist values:');
    const missingStages = [];
    for (const stage of PLAN_STAGES) {
        const present = stagePicklist.includes(stage);
        console.log(`   ${check(present)} ${stage}`);
        if (!present) missingStages.push(stage);
    }
    if (stagePicklist.length > 0) {
        console.log(`   (Actual stages: ${stagePicklist.join(', ')})`);
    }
    console.log();

    console.log('Assumed RecordType id:');
    const planRecordType = opportunityRecordTypes.find((rt) => rt.id === PLAN_RECORD_TYPE_ID);
    console.log(`   ${check(!!planRecordType)} ${PLAN_RECORD_TYPE_ID}`);
    if (planRecordType) {
        console.log(`     name: ${planRecordType.name} (developerName: ${planRecordType.developerName})`);
    } else if (opportunityRecordTypes.length > 0) {
        console.log('   Actual RecordTypes:');
        for (const rt of opportunityRecordTypes) {
            console.log(`     - ${rt.id} ${rt.name} (dev=${rt.developerName}, default=${rt.defaultRecordType})`);
        }
    }
    console.log();

    const verdictLines = [];
    if (!opportunityPresent) {
        verdictLines.push(
            'Opportunity is not accessible. The reversion plan needs a different target — check the deal-like objects listed above or a custom object in sobjects.json.',
        );
    } else {
        if (missingFields.length === 0) {
            verdictLines.push('All plan-assumed fields exist on Opportunity.');
        } else {
            verdictLines.push(
                `${missingFields.length} plan-assumed fields missing: ${missingFields.join(', ')}`,
            );
        }
        if (missingStages.length === 0 && stagePicklist.length > 0) {
            verdictLines.push('All plan-assumed stage names exist in the picklist.');
        } else if (missingStages.length > 0) {
            verdictLines.push(
                `${missingStages.length} plan-assumed stage names missing: ${missingStages.join(', ')}`,
            );
        }
        if (!planRecordType) {
            verdictLines.push(
                `Plan RecordTypeId ${PLAN_RECORD_TYPE_ID} does not match any configured RecordType. The plan's SOQL will return zero rows as written.`,
            );
        }
        if (opportunityCount === 0) {
            verdictLines.push(
                'Opportunity is empty. The portal/cron paths will have no data to render until records are created.',
            );
        }
    }

    console.log('═══ Verdict ═══');
    for (const line of verdictLines) {
        console.log(`  • ${line}`);
    }
    console.log();

    const mdLines = [
        '# Salesforce Opportunity Recon',
        '',
        `Generated by \`scripts/recon-salesforce.mjs\` on ${new Date().toISOString()}.`,
        '',
        '## Environment',
        '',
        `- Instance: \`${instanceUrl}\``,
        `- API version: \`${SALESFORCE_API_VERSION}\``,
        '',
        '## Object Presence',
        '',
        `- Opportunity accessible: ${opportunityPresent ? 'YES' : 'NO'}`,
        `- Total SObjects: ${allNames.length}`,
        `- Custom objects: ${customObjects.length}`,
        `- Deal-like object candidates: ${dealLikeObjects.length > 0 ? dealLikeObjects.map((n) => `\`${n}\``).join(', ') : '(none)'}`,
        '',
        '## Plan Field Reconciliation',
        '',
        '| Field | Present |',
        '|-------|---------|',
        ...PLAN_FIELDS.map((f) => `| \`${f}\` | ${opportunityFields.has(f) ? 'YES' : 'NO'} |`),
        '',
        '## Plan Stage Reconciliation',
        '',
        '| Stage | Present |',
        '|-------|---------|',
        ...PLAN_STAGES.map((s) => `| ${s} | ${stagePicklist.includes(s) ? 'YES' : 'NO'} |`),
        '',
    ];
    if (stagePicklist.length > 0) {
        mdLines.push('### Actual StageName picklist values', '');
        for (const s of stagePicklist) mdLines.push(`- ${s}`);
        mdLines.push('');
    }

    mdLines.push('## RecordTypes', '');
    mdLines.push(`- Plan-assumed id: \`${PLAN_RECORD_TYPE_ID}\` → ${planRecordType ? `matches **${planRecordType.name}**` : 'NOT FOUND'}`);
    mdLines.push('');
    if (opportunityRecordTypes.length > 0) {
        mdLines.push('| Id | Name | Developer Name | Default | Available |');
        mdLines.push('|----|------|----------------|---------|-----------|');
        for (const rt of opportunityRecordTypes) {
            mdLines.push(
                `| \`${rt.id}\` | ${rt.name} | ${rt.developerName} | ${rt.defaultRecordType} | ${rt.available} |`,
            );
        }
        mdLines.push('');
    }

    mdLines.push('## Record Count', '');
    mdLines.push(`- Total Opportunity records: ${opportunityCount ?? 'n/a'}`);
    mdLines.push('');

    mdLines.push('## Verdict', '');
    for (const line of verdictLines) mdLines.push(`- ${line}`);
    mdLines.push('');

    writeFileSync('docs/salesforce-schema/opportunity-reconciliation.md', mdLines.join('\n'));

    console.log('Wrote:');
    console.log('  - docs/salesforce-schema/opportunity-reconciliation.md (summary, commit)');
    console.log(`  - ${RAW_DIR}/*.json (raw dumps, gitignored)`);
}

main().catch((err) => {
    console.error('\nRecon failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
