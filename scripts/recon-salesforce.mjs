#!/usr/bin/env node
// Inspect schema in the verified Salesforce WebDev sandbox.
// Run: node scripts/recon-salesforce.mjs
// Output: artifacts/salesforce/webdev/<target fingerprint>/

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './lib/next-environment.mjs';
import { connectSandbox } from './lib/salesforce-sandbox.mjs';

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

function check(bool) {
    return bool ? '✓' : '✗';
}

async function main() {
    console.log('═══ Salesforce Schema Recon ═══\n');

    console.log('1. Authenticating...');
    const { config, fingerprint, get } = await connectSandbox();
    const outputDir = join(projectRoot, 'artifacts', 'salesforce', 'webdev', fingerprint.slice(0, 12));
    const rawDir = join(outputDir, 'raw');
    mkdirSync(rawDir, { recursive: true, mode: 0o700 });
    const expectedRecordType = config.recordTypes.CUSTOMER_OPPORTUNITY;
    console.log(`   Verified instance: ${config.restOrigin}\n`);

    function writeRaw(name, data) {
        writeFileSync(join(rawDir, name), JSON.stringify(data, null, 2), { mode: 0o600 });
    }
    function writeSummary(name, lines) {
        writeFileSync(join(outputDir, name), lines.join('\n'), { mode: 0o600 });
    }

    console.log('2. Listing accessible SObjects...');
    const sobjects = await get('/sobjects');
    if (!sobjects.ok) {
        console.error(`   FAIL (${sobjects.status})`);
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
        const describe = await get('/sobjects/Opportunity/describe');
        if (!describe.ok) {
            console.error(`   FAIL (${describe.status})`);
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
        const count = await get(
            `/query?q=${encodeURIComponent('SELECT COUNT(Id) c FROM Opportunity')}`,
        );
        if (count.ok) {
            opportunityCount = count.body.records?.[0]?.c ?? null;
            console.log(`   Total Opportunity records: ${opportunityCount}\n`);
        } else {
            console.log(`   Query failed (${count.status})\n`);
        }
    } else {
        console.log('3-4. Opportunity not present — skipping describe/count.\n');
    }

    // ─── Customer SObject recon ───
    // Separate from the Opportunity "Customer" RecordType. The sobjects listing
    // surfaced this as a standalone object — we need to know if customer-side
    // data (destination city, current base) lives here or on Account.
    const customerPresent = allNames.includes('Customer');
    let customerFields = new Set();
    let customerRefsToOpportunity = [];
    let customerRefsToAccount = [];
    let customerRecordTypes = [];
    let customerCount = null;
    let customerDescribeBody = null;

    if (customerPresent) {
        console.log('5. Describing Customer SObject...');
        const customerDescribe = await get('/sobjects/Customer/describe');
        if (!customerDescribe.ok) {
            console.error(`   FAIL (${customerDescribe.status})`);
        } else {
            customerDescribeBody = customerDescribe.body;
            writeRaw('customer-describe.json', customerDescribe.body);
            customerFields = new Set(customerDescribe.body.fields.map((f) => f.name));
            customerRecordTypes = (customerDescribe.body.recordTypeInfos || []).map((rt) => ({
                id: rt.recordTypeId,
                name: rt.name,
                developerName: rt.developerName,
                available: rt.available,
                defaultRecordType: rt.defaultRecordTypeMapping,
            }));
            for (const f of customerDescribe.body.fields) {
                if (f.type === 'reference' && Array.isArray(f.referenceTo)) {
                    if (f.referenceTo.includes('Opportunity')) {
                        customerRefsToOpportunity.push({ name: f.name, referenceTo: f.referenceTo });
                    }
                    if (f.referenceTo.includes('Account')) {
                        customerRefsToAccount.push({ name: f.name, referenceTo: f.referenceTo });
                    }
                }
            }
            console.log(`   Fields: ${customerFields.size}`);
            console.log(`   RecordTypes: ${customerRecordTypes.length}`);
            console.log(`   References to Opportunity: ${customerRefsToOpportunity.length}`);
            console.log(`   References to Account: ${customerRefsToAccount.length}\n`);
        }

        console.log('6. Counting Customer records...');
        const count = await get(
            `/query?q=${encodeURIComponent('SELECT COUNT(Id) c FROM Customer')}`,
        );
        if (count.ok) {
            customerCount = count.body.records?.[0]?.c ?? null;
            console.log(`   Total Customer records: ${customerCount}\n`);
        } else {
            console.log(`   Query failed (${count.status})\n`);
        }
    } else {
        console.log('5-6. Customer SObject not present — skipping.\n');
    }

    // Fields to probe for on Customer (from memory: Attio had destination_city;
    // forms map destinationBase→destination_city, currentBase→current_location).
    const CUSTOMER_PROBE_FIELDS = [
        'destination_city',
        'Destination_City__c',
        'destination_state',
        'Destination_State__c',
        'current_location',
        'Current_Location__c',
        'current_base',
        'Current_Base__c',
        'destination_base',
        'Destination_Base__c',
    ];

    // ─── Account / Person Account recon ───
    // The portal pulls customer-side data via Opportunity.AccountId → Account.
    // Since main already queries Person Accounts (isAgent__pc), we need to know
    // what __pc fields exist, how many are Person Accounts vs. business, and
    // whether a customer-role flag exists (analogous to isAgent__pc / isLender__pc).
    let accountFields = new Set();
    let accountFieldsByType = {};
    let accountPcFields = [];
    let accountRoleFlagFields = [];
    let accountMilitaryFields = [];
    let accountLocationFields = [];
    let accountRecordTypes = [];
    let accountIsPersonAccountPresent = false;
    let accountCountTotal = null;
    let accountCountPerson = null;
    let accountCountAgent = null;
    let accountCountLender = null;

    console.log('7. Describing Account...');
    const accountDescribe = await get('/sobjects/Account/describe');
    if (!accountDescribe.ok) {
        console.error(`   FAIL (${accountDescribe.status})`);
    } else {
        writeRaw('account-describe.json', accountDescribe.body);
        const fields = accountDescribe.body.fields;
        accountFields = new Set(fields.map((f) => f.name));
        accountFieldsByType = fields.reduce((acc, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
        }, {});
        accountIsPersonAccountPresent = accountFields.has('IsPersonAccount');
        accountPcFields = fields
            .filter((f) => f.name.endsWith('__pc'))
            .map((f) => ({ name: f.name, type: f.type, label: f.label }));
        accountRoleFlagFields = accountPcFields
            .filter((f) => /^is[A-Z]/.test(f.name) && f.type === 'boolean')
            .map((f) => f.name);
        accountMilitaryFields = accountPcFields
            .filter((f) =>
                /military|branch|discharge|veteran|service|rank|pcs|spouse|dependent/i.test(
                    `${f.name} ${f.label}`,
                ),
            )
            .map((f) => f.name);
        accountLocationFields = accountPcFields
            .filter((f) =>
                /base|location|destination|current|city|state|installation/i.test(
                    `${f.name} ${f.label}`,
                ),
            )
            .map((f) => f.name);
        accountRecordTypes = (accountDescribe.body.recordTypeInfos || []).map((rt) => ({
            id: rt.recordTypeId,
            name: rt.name,
            developerName: rt.developerName,
            available: rt.available,
            defaultRecordType: rt.defaultRecordTypeMapping,
        }));
        console.log(`   Fields: ${accountFields.size} (of which ${accountPcFields.length} are __pc)`);
        console.log(`   IsPersonAccount field present: ${check(accountIsPersonAccountPresent)}`);
        console.log(`   Role-flag-like __pc booleans: ${accountRoleFlagFields.join(', ') || '(none)'}`);
        console.log(`   Military/service __pc fields: ${accountMilitaryFields.length}`);
        console.log(`   Location/base __pc fields: ${accountLocationFields.length}`);
        console.log(`   RecordTypes: ${accountRecordTypes.length}\n`);
    }

    if (accountIsPersonAccountPresent) {
        console.log('8. Counting Accounts...');
        const runCount = async (soql) => {
            const r = await get(`/query?q=${encodeURIComponent(soql)}`);
            if (!r.ok) {
                console.log(`   Query failed (${r.status}): ${soql}`);
                return null;
            }
            return r.body.records?.[0]?.c ?? null;
        };
        accountCountTotal = await runCount('SELECT COUNT(Id) c FROM Account');
        accountCountPerson = await runCount('SELECT COUNT(Id) c FROM Account WHERE IsPersonAccount = true');
        if (accountRoleFlagFields.includes('isAgent__pc')) {
            accountCountAgent = await runCount(
                'SELECT COUNT(Id) c FROM Account WHERE IsPersonAccount = true AND isAgent__pc = true',
            );
        }
        if (accountRoleFlagFields.includes('isLender__pc')) {
            accountCountLender = await runCount(
                'SELECT COUNT(Id) c FROM Account WHERE IsPersonAccount = true AND isLender__pc = true',
            );
        }
        console.log(`   Total Accounts: ${accountCountTotal}`);
        console.log(`   Person Accounts: ${accountCountPerson}`);
        if (accountCountAgent !== null) console.log(`   Agent Person Accounts (isAgent__pc=true): ${accountCountAgent}`);
        if (accountCountLender !== null) console.log(`   Lender Person Accounts (isLender__pc=true): ${accountCountLender}`);
        if (accountCountPerson !== null && accountCountAgent !== null && accountCountLender !== null) {
            const customerLike = accountCountPerson - accountCountAgent - accountCountLender;
            console.log(`   Person Accounts that are neither agent nor lender (customer candidates): ${customerLike}`);
        }
        console.log();
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
    const planRecordType = opportunityRecordTypes.find((rt) => rt.id === expectedRecordType);
    console.log(`   ${check(!!planRecordType)} ${expectedRecordType}`);
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
                `Plan RecordTypeId ${expectedRecordType} does not match any configured RecordType. The plan's SOQL will return zero rows as written.`,
            );
        }
        if (opportunityCount === 0) {
            verdictLines.push(
                'Opportunity is empty. The portal/cron paths will have no data to render until records are created.',
            );
        }
    }

    // ─── Customer SObject reconciliation ───
    console.log('Customer SObject:');
    if (!customerPresent) {
        console.log('   ✗ not accessible (not in sobjects listing)');
    } else {
        console.log(`   ${check(customerFields.size > 0)} describe accessible (${customerFields.size} fields, ${customerCount ?? '?'} records)`);
        console.log('   Probing memory-hinted field names:');
        for (const f of CUSTOMER_PROBE_FIELDS) {
            console.log(`     ${check(customerFields.has(f))} ${f}`);
        }
        if (customerRefsToOpportunity.length > 0) {
            console.log('   Reference fields → Opportunity:');
            for (const r of customerRefsToOpportunity) {
                console.log(`     - ${r.name} (refs: ${r.referenceTo.join(', ')})`);
            }
        } else {
            console.log('   No reference fields point to Opportunity.');
        }
        if (customerRefsToAccount.length > 0) {
            console.log('   Reference fields → Account:');
            for (const r of customerRefsToAccount) {
                console.log(`     - ${r.name} (refs: ${r.referenceTo.join(', ')})`);
            }
        }
    }
    console.log();

    if (!customerPresent) {
        verdictLines.push(
            'Customer SObject not accessible — portal design should source customer-side data from Account (Person Account) or Opportunity directly.',
        );
    } else if (
        customerDescribeBody &&
        customerDescribeBody.custom === false &&
        customerCount === 0 &&
        customerRefsToOpportunity.length === 0 &&
        customerRefsToAccount.length === 0
    ) {
        verdictLines.push(
            'Customer SObject is a standard Salesforce object (likely B2C/Commerce Cloud) with 0 records and no graph edges — VPCS does not use it. Portal design can ignore it and target Opportunity + Account (Person Account) directly.',
        );
    } else if (customerRefsToOpportunity.length === 0 && customerRefsToAccount.length === 0) {
        verdictLines.push(
            'Customer SObject has no reference fields to Opportunity or Account. If it carries portal data, the join key is not a standard lookup — needs manual investigation in customer-describe.json.',
        );
    } else if (customerRefsToOpportunity.length > 0) {
        verdictLines.push(
            `Customer SObject has ${customerRefsToOpportunity.length} reference(s) to Opportunity (${customerRefsToOpportunity.map((r) => r.name).join(', ')}) — portal can join Customer data by this key.`,
        );
    } else {
        verdictLines.push(
            `Customer SObject has no direct Opportunity lookup; relates via Account (${customerRefsToAccount.map((r) => r.name).join(', ')}). Portal traversal: Opportunity.AccountId → Account → Customer.`,
        );
    }

    // ─── Account reconciliation ───
    console.log('Account / Person Account:');
    console.log(`   ${check(accountIsPersonAccountPresent)} IsPersonAccount field present`);
    console.log(`   __pc fields: ${accountPcFields.length}`);
    console.log(`   Role flags found: ${accountRoleFlagFields.join(', ') || '(none)'}`);
    if (accountMilitaryFields.length > 0) {
        console.log(`   Military/service fields (${accountMilitaryFields.length}):`);
        for (const f of accountMilitaryFields) console.log(`     - ${f}`);
    }
    if (accountLocationFields.length > 0) {
        console.log(`   Location/base fields (${accountLocationFields.length}):`);
        for (const f of accountLocationFields) console.log(`     - ${f}`);
    }
    console.log();

    if (!accountIsPersonAccountPresent) {
        verdictLines.push(
            'Account has no IsPersonAccount field — org is NOT on Person Account model. Portal data model assumptions need revisiting.',
        );
    } else {
        verdictLines.push(
            `Account uses Person Accounts (${accountPcFields.length} __pc fields). Customer-side portal data flows Opportunity.AccountId → Account (Person Account).`,
        );
        const hasCustomerFlag =
            accountRoleFlagFields.includes('isCustomer__pc') ||
            accountRoleFlagFields.includes('isClient__pc');
        if (!hasCustomerFlag && accountRoleFlagFields.includes('isAgent__pc')) {
            verdictLines.push(
                "No explicit customer-role flag (isCustomer__pc / isClient__pc). Customer identification for portal queries must be inferred: Person Account AND NOT isAgent__pc AND NOT isLender__pc, OR simpler: reach Account via Opportunity (RecordType=Customer).AccountId.",
            );
        }
        if (accountCountPerson !== null && accountCountAgent !== null && accountCountLender !== null) {
            const customerLike = accountCountPerson - accountCountAgent - accountCountLender;
            verdictLines.push(
                `Person Account counts: ${accountCountPerson} total (${accountCountAgent} agents, ${accountCountLender} lenders, ~${customerLike} customer-like).`,
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
        `- Instance: \`${config.restOrigin}\``,
        `- API version: \`${config.apiVersion}\``,
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
    mdLines.push(`- Plan-assumed id: \`${expectedRecordType}\` → ${planRecordType ? `matches **${planRecordType.name}**` : 'NOT FOUND'}`);
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

    writeSummary('opportunity-reconciliation.md', mdLines);

    // ─── Customer reconciliation markdown ───
    const customerMd = [
        '# Salesforce Customer SObject Recon',
        '',
        `Generated by \`scripts/recon-salesforce.mjs\` on ${new Date().toISOString()}.`,
        '',
        '## Presence',
        '',
        `- Accessible: ${customerPresent ? 'YES' : 'NO'}`,
    ];
    if (customerPresent) {
        customerMd.push(
            `- Custom vs. standard: ${customerDescribeBody?.custom ? 'custom' : 'standard'}`,
            `- Label: ${customerDescribeBody?.label ?? 'n/a'}`,
            `- Total fields: ${customerFields.size}`,
            `- Total records: ${customerCount ?? 'n/a'}`,
            `- RecordTypes: ${customerRecordTypes.length}`,
            '',
            '## Memory-hinted field probe',
            '',
            '| Field | Present |',
            '|-------|---------|',
            ...CUSTOMER_PROBE_FIELDS.map((f) => `| \`${f}\` | ${customerFields.has(f) ? 'YES' : 'NO'} |`),
            '',
        );
        if (customerRefsToOpportunity.length > 0 || customerRefsToAccount.length > 0) {
            customerMd.push('## Relationships', '');
            if (customerRefsToOpportunity.length > 0) {
                customerMd.push('### References to Opportunity', '');
                customerMd.push('| Field | References |');
                customerMd.push('|-------|------------|');
                for (const r of customerRefsToOpportunity) {
                    customerMd.push(`| \`${r.name}\` | ${r.referenceTo.map((t) => `\`${t}\``).join(', ')} |`);
                }
                customerMd.push('');
            }
            if (customerRefsToAccount.length > 0) {
                customerMd.push('### References to Account', '');
                customerMd.push('| Field | References |');
                customerMd.push('|-------|------------|');
                for (const r of customerRefsToAccount) {
                    customerMd.push(`| \`${r.name}\` | ${r.referenceTo.map((t) => `\`${t}\``).join(', ')} |`);
                }
                customerMd.push('');
            }
        } else {
            customerMd.push('## Relationships', '', '- No reference fields to Opportunity or Account.', '');
        }
        if (customerRecordTypes.length > 0) {
            customerMd.push('## RecordTypes', '');
            customerMd.push('| Id | Name | Developer Name | Default | Available |');
            customerMd.push('|----|------|----------------|---------|-----------|');
            for (const rt of customerRecordTypes) {
                customerMd.push(
                    `| \`${rt.id}\` | ${rt.name} | ${rt.developerName} | ${rt.defaultRecordType} | ${rt.available} |`,
                );
            }
            customerMd.push('');
        }

        customerMd.push('## All Field Names', '');
        customerMd.push('<details>', '<summary>Click to expand</summary>', '');
        customerMd.push('```');
        for (const f of [...customerFields].sort()) customerMd.push(f);
        customerMd.push('```');
        customerMd.push('</details>', '');
    }

    writeSummary('customer-reconciliation.md', customerMd);

    // ─── Account reconciliation markdown ───
    const accountMd = [
        '# Salesforce Account / Person Account Recon',
        '',
        `Generated by \`scripts/recon-salesforce.mjs\` on ${new Date().toISOString()}.`,
        '',
        '## Summary',
        '',
        `- IsPersonAccount field present: ${accountIsPersonAccountPresent ? 'YES' : 'NO'}`,
        `- Total fields: ${accountFields.size}`,
        `- \`__pc\` fields: ${accountPcFields.length}`,
        `- RecordTypes: ${accountRecordTypes.length}`,
        '',
    ];
    if (accountCountTotal !== null) {
        accountMd.push('## Record Counts', '');
        accountMd.push(`- Total Accounts: ${accountCountTotal}`);
        if (accountCountPerson !== null) accountMd.push(`- Person Accounts: ${accountCountPerson}`);
        if (accountCountAgent !== null) accountMd.push(`- Agent Person Accounts (\`isAgent__pc=true\`): ${accountCountAgent}`);
        if (accountCountLender !== null) accountMd.push(`- Lender Person Accounts (\`isLender__pc=true\`): ${accountCountLender}`);
        if (
            accountCountPerson !== null &&
            accountCountAgent !== null &&
            accountCountLender !== null
        ) {
            accountMd.push(
                `- Customer-like Person Accounts (Person - Agent - Lender): ~${accountCountPerson - accountCountAgent - accountCountLender}`,
            );
        }
        accountMd.push('');
    }

    accountMd.push('## Role Flag Fields (`__pc` booleans starting with `is`)', '');
    if (accountRoleFlagFields.length === 0) {
        accountMd.push('- None found.', '');
    } else {
        for (const f of accountRoleFlagFields) accountMd.push(`- \`${f}\``);
        accountMd.push('');
    }

    accountMd.push('## Military / Service `__pc` Fields', '');
    if (accountMilitaryFields.length === 0) {
        accountMd.push('- None detected.', '');
    } else {
        for (const f of accountMilitaryFields) accountMd.push(`- \`${f}\``);
        accountMd.push('');
    }

    accountMd.push('## Location / Base `__pc` Fields', '');
    if (accountLocationFields.length === 0) {
        accountMd.push('- None detected.', '');
    } else {
        for (const f of accountLocationFields) accountMd.push(`- \`${f}\``);
        accountMd.push('');
    }

    if (accountRecordTypes.length > 0) {
        accountMd.push('## RecordTypes', '');
        accountMd.push('| Id | Name | Developer Name | Default | Available |');
        accountMd.push('|----|------|----------------|---------|-----------|');
        for (const rt of accountRecordTypes) {
            accountMd.push(
                `| \`${rt.id}\` | ${rt.name} | ${rt.developerName} | ${rt.defaultRecordType} | ${rt.available} |`,
            );
        }
        accountMd.push('');
    }

    accountMd.push('## All `__pc` Field Names', '');
    accountMd.push('<details>', '<summary>Click to expand</summary>', '', '```');
    for (const f of [...accountPcFields].sort((a, b) => a.name.localeCompare(b.name))) {
        accountMd.push(`${f.name.padEnd(50)} ${f.type.padEnd(12)} ${f.label}`);
    }
    accountMd.push('```', '</details>', '');

    writeSummary('account-reconciliation.md', accountMd);

    console.log(`Wrote sandbox reconciliation summaries and raw JSON to ${outputDir}.`);
}

main().catch(error => {
    console.error('Recon failed:', error.message);
    process.exitCode = 1;
});
