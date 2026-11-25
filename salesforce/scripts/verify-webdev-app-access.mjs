#!/usr/bin/env node
import { constants } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { connectSandbox, loadSandboxSettings } from '../../scripts/lib/salesforce-sandbox.mjs';

const privateDirectory = fileURLToPath(new URL('../retrieved-private/', import.meta.url));
const inventoryUrl = new URL('../access/field-inventory.json', import.meta.url);
const appNames = { preview: 'VPCS_Webdev_Preview', workflow: 'VPCS_Webdev_Workflow' };
const permissionErrors = new Set([
    'INVALID_FIELD', 'INVALID_TYPE', 'INSUFFICIENT_ACCESS', 'INSUFFICIENT_ACCESS_OR_READONLY',
]);
const recognizedErrors = new Set([
    ...permissionErrors, 'API_DISABLED_FOR_ORG', 'API_DISABLED_FOR_USER', 'FORBIDDEN',
    'INVALID_SESSION_ID', 'MALFORMED_QUERY', 'NOT_FOUND', 'REQUEST_LIMIT_EXCEEDED',
]);

async function readCredentials(role) {
    const filepath = join(privateDirectory, 'app-credentials', `${appNames[role]}.json`);
    const file = await open(filepath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const info = await file.stat();
        if (!info.isFile() || (info.mode & 0o077) !== 0 || info.size > 16_384) throw new Error();
        const { key, secret } = JSON.parse(await file.readFile('utf8'));
        if (![key, secret].every(value => typeof value === 'string' && /^\S+$/.test(value))) {
            throw new Error();
        }
        return { SALESFORCE_CLIENT_ID: key, SALESFORCE_CLIENT_SECRET: secret };
    } finally {
        await file.close();
    }
}

function queryProbes(inventory, config, role, fixtureAccountId, fixtureLeadId) {
    const operations = new Map(inventory.operations.map(operation => [operation.name, operation]));
    const select = name => operations.get(name).select.join(', ');
    const accountId = fixtureAccountId ?? '001000000000001';
    const leadId = fixtureLeadId ?? '00Q000000000001';
    const directory = (partner, flag) => {
        const operation = operations.get(`State ${partner} directory and coverage`);
        const child = operation.childQuery;
        return `SELECT ${operation.select.join(', ')},
            (SELECT ${child.select.join(', ')} FROM ${child.relationship} ORDER BY ${child.sort[0]} DESC LIMIT 5)
            FROM Account WHERE ${flag} = true AND Active_on_Website__pc = true
            AND (State_s_Licensed_in__pc LIKE '%CO%' OR Other_States__pc INCLUDES ('CO')) LIMIT 5`;
    };
    const author = select('Blog author lookup by ID or name');
    const impact = operations.get('Impact aggregates').sum.map(field => `SUM(${field})`).join(', ');
    const [agentDirectory, lenderDirectory] = ['Agent', 'Lender'].map(partner =>
        [`State ${partner.toLowerCase()} directory and coverage`, directory(partner.toLowerCase(), `is${partner}__pc`)]);
    const both = [
        agentDirectory, lenderDirectory,
        ['Blog author lookup by ID', `SELECT ${author} FROM Account WHERE (Id = '${accountId}' OR AccountId_15__c = '${accountId}') AND IsPersonAccount = true LIMIT 1`, fixtureAccountId ? 1 : undefined],
        ['Blog author lookup by full name', `SELECT ${author} FROM Account WHERE IsPersonAccount = true AND FirstName = '[VPCS WEBDEV TEST]' AND LastName = 'webdev-initial-20261125 Agent' AND (isAgent__pc = true OR isLender__pc = true) LIMIT 1`],
        ['Blog author lookup by last name', `SELECT ${author} FROM Account WHERE IsPersonAccount = true AND LastName = 'webdev-access-probe' AND (isAgent__pc = true OR isLender__pc = true) LIMIT 1`],
        ['Impact aggregates', `SELECT ${impact} FROM Opportunity WHERE RecordTypeId = '${config.recordTypes.CUSTOMER_OPPORTUNITY}'`, 1],
        ['Contact baseline read', 'SELECT Id FROM Contact LIMIT 1'],
    ];
    const privateFields = [
        ['Contact.Email', "SELECT Email FROM Contact WHERE Id = '003000000000001' LIMIT 1"],
        ['Contact.MobilePhone', "SELECT MobilePhone FROM Contact WHERE Id = '003000000000001' LIMIT 1"],
        ['Account.PersonEmail', "SELECT PersonEmail FROM Account WHERE Id = '001000000000001' LIMIT 1"],
        ['Account.PersonMobilePhone', "SELECT PersonMobilePhone FROM Account WHERE Id = '001000000000001' LIMIT 1"],
    ];
    if (role === 'preview') {
        return [
            ...both,
            ...[['Lead read', 'SELECT Id FROM Lead LIMIT 1'], ...privateFields].map(probe => [...probe, 'deny']),
        ];
    }
    const owner = select('Lead owner lookup and confirmation');
    const rehearsal = select('Ten-form rehearsal reconciliation');
    const begin = '2026-11-25T00:00:00.000Z';
    const end = '2026-11-25T00:01:00.000Z';
    return [
        ...both, ...privateFields,
        ['Revalidation by partner licensed state', `SELECT ${select('Revalidation by partner licensed state')} FROM Account WHERE AccountId_15__c = '${accountId.slice(0, 15)}' LIMIT 1`, fixtureAccountId ? 1 : undefined],
        ['Selected partner lookup', `SELECT ${select('Optional selected partner verification on a live sandbox submission')} FROM Account WHERE Id = '${accountId}' AND Active_on_Website__pc = true LIMIT 1`, fixtureAccountId ? 1 : undefined],
        ['Lead owner lookup by submission marker', `SELECT ${owner} FROM Lead WHERE WebFormURL__c LIKE '%sid=webdev-access-probe%' ORDER BY CreatedDate DESC LIMIT 2`],
        ['Lead owner lookup by fallback fields', `SELECT ${owner} FROM Lead WHERE Email = 'webdev-access-probe@example.invalid' AND LeadSource = 'Contact Agent' AND RecordTypeId = '${config.recordTypes.CUSTOMER_LEAD}' AND Destination_State__c = 'CO' AND CreatedDate >= ${begin} AND WebFormAgentId__c = '${accountId}' AND WebFormLenderId__c = '${accountId}' ORDER BY CreatedDate DESC LIMIT 2`],
        ['Lead owner confirmation', `SELECT ${owner} FROM Lead WHERE Id = '${leadId}' LIMIT 1`, fixtureLeadId ? 1 : undefined],
        ['Ten-form rehearsal duplicate check', "SELECT Id FROM Lead WHERE FirstName = '[VPCS WEBDEV TEST]' AND LastName IN ('webdev-access-probe') LIMIT 1"],
        ['Ten-form rehearsal reconciliation', `SELECT ${rehearsal} FROM Lead WHERE FirstName = '[VPCS WEBDEV TEST]' AND LastName = 'webdev-access-probe' AND CreatedDate >= ${begin} AND CreatedDate <= ${end} LIMIT 2`],
    ];
}

async function runProbe(crm, [name, soql, expected]) {
    const expectation = expected === 'deny' ? 'deny' : 'allow';
    const result = { name, expectation, status: 'failed' };
    try {
        const query = soql.replace(/\s+/g, ' ').trim();
        const response = await crm.request(`/query?q=${encodeURIComponent(query)}`);
        result.httpStatus = response.status;
        const body = await response.json();
        if (response.ok) {
            if (!Array.isArray(body?.records) || !Number.isInteger(body.totalSize) || body.totalSize < 0) {
                return { ...result, errorCode: 'UNEXPECTED_QUERY_RESPONSE' };
            }
            result.count = body.totalSize;
            if (expectation === 'allow' && (expected === undefined || expected === result.count)) {
                result.status = 'passed';
            }
        } else {
            result.errorCodes = Array.isArray(body)
                ? [...new Set(body.map(error => recognizedErrors.has(error?.errorCode) ? error.errorCode : 'UNRECOGNIZED_ERROR'))]
                : ['UNRECOGNIZED_ERROR'];
            if (expectation === 'deny' && [400, 403].includes(response.status)
                && result.errorCodes.length > 0 && result.errorCodes.every(code => permissionErrors.has(code))) {
                result.status = 'passed';
            }
        }
        return result;
    } catch {
        return { ...result, errorCode: 'QUERY_REQUEST_FAILED' };
    }
}

async function saveEvidence(evidence) {
    const root = join(privateDirectory, 'webdev-app-access-evidence');
    await mkdir(root, { mode: 0o700, recursive: true });
    const folder = await mkdtemp(join(root, `${evidence.startedAt.slice(0, 10)}-${evidence.role}-`));
    const path = join(folder, 'result.json');
    await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return path;
}

async function main() {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        options: { 'account-id': { type: 'string' }, 'lead-id': { type: 'string' } },
    });
    const [role] = positionals;
    const accountId = values['account-id'];
    const leadId = values['lead-id'];
    if (positionals.length !== 1 || !Object.hasOwn(appNames, role)
        || (accountId !== undefined && !/^001[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(accountId))
        || (leadId !== undefined && (role !== 'workflow' || !/^00Q[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(leadId)))) {
        throw new Error();
    }

    const evidence = { startedAt: new Date().toISOString(), role, org: null, status: 'failed', queries: [] };
    let errorCode = 'SETTINGS_INVALID';
    try {
        const settings = loadSandboxSettings();
        const inventory = JSON.parse(await readFile(inventoryUrl, 'utf8'));
        const orgId = inventory.sandbox.orgId;
        if (settings.config.orgId.slice(0, 15) !== orgId.slice(0, 15)
            || settings.config.authGrant !== 'client_credentials') throw new Error();
        const probes = queryProbes(inventory, settings.config, role, accountId, leadId);
        errorCode = 'CREDENTIAL_FILE_INVALID';
        const credentials = await readCredentials(role);
        errorCode = 'SESSION_NOT_VERIFIED';
        const crm = await connectSandbox({ ...settings, env: { ...settings.env, ...credentials } });
        evidence.org = { id: orgId, isSandbox: true };
        evidence.queries.push({ name: 'OAuth organization identity check', expectation: 'allow', status: 'passed', count: 1 });
        for (const probe of probes) evidence.queries.push(await runProbe(crm, probe));
        if (evidence.queries.every(probe => probe.status === 'passed')) evidence.status = 'passed';
    } catch {
        evidence.queries.push({ name: 'OAuth organization identity check', expectation: 'allow', status: 'failed', errorCode });
    }
    evidence.completedAt = new Date().toISOString();
    const path = await saveEvidence(evidence);
    console.log(`WebDev ${role} access verification ${evidence.status}. Evidence: ${path}`);
    if (evidence.status !== 'passed') process.exitCode = 1;
}

main().catch(() => {
    console.error('Usage: node salesforce/scripts/verify-webdev-app-access.mjs <preview|workflow> [--account-id <sandbox fixture ID>] [--lead-id <sandbox Lead fixture ID; workflow only>]. Check private evidence directory permissions if the inputs are valid.');
    process.exitCode = 1;
});
