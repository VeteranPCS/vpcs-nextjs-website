import { execFile } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import intakeMappings from '../config/salesforce/intake.json' with { type: 'json' };
import { validateWebToLeadTarget } from '../lib/salesforce/environment.mjs';
import { assertSameOrganization, createSalesforceCli, sameSalesforceId } from '../salesforce/routing-migration/salesforce-cli-adapter.mjs';
import { projectRoot } from './lib/next-environment.mjs';
import { connectSandboxIntake, loadSandboxSettings } from './lib/salesforce-sandbox.mjs';

const targetOrg = 'vpcs-webdev';
const webdevOrg = '00Djg000000EK8YEAW';
const cleanEmail = 'tech@veteranpcs.com';
const blockedEmail = 'tech+spam-blocked@veteranpcs.com';
const marker = '[VPCS WEBDEV TEST]';
const customer = 'CUSTOMER_LEAD_15';
const families = [
    ['Contact Agent', customer, true],
    ['Contact Lender', customer, true],
    ['Agent Listing Request', 'AGENT_LISTING_LEAD', true],
    ['Lender Listing Request', 'LENDER_LISTING_LEAD', true],
    ['Keep in Touch', customer, false],
    ['Contact Form', customer, false],
    ['VA Loan Guide', customer, false],
    ['First Time Home Buyer Guide', customer, false],
    ['Colorado Relocation Guide', customer, false],
    ['Internship Application', 'INTERNSHIP_LEAD', true],
];
const runFile = promisify(execFile);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const usage = 'node scripts/verify-salesforce-spam-backstop.mjs --execute';

class BackstopError extends Error {}

function requireCheck(condition, message) {
    if (!condition) throw new BackstopError(message);
}

function buildCases() {
    return [
        ...families.flatMap(([source, recordType, webToLead]) => ['honeypot', 'blocked-email'].map((probe) => ({
            name: `${source} / ${probe}`, source, recordType, webToLead, probe,
        }))),
        { name: 'Omitted source and WebToLead flag', recordType: customer, probe: 'blocked-email' },
        { name: 'Altered Website source and omitted WebToLead flag', source: 'Website', recordType: customer, probe: 'blocked-email' },
    ];
}

function verifyWindow({ config, env }, runId) {
    const expiry = Date.parse(env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? '');
    const remaining = expiry - Date.now();
    const sinks = new Set((env.VPCS_WEBDEV_TEST_EMAILS ?? '').split(',').map((value) => value.trim().toLowerCase()));
    requireCheck(config.profile === 'webdev' && sameSalesforceId(config.orgId, webdevOrg) &&
        config.allowSandboxWrites && config.deliveryMode === 'capture' &&
        env.VPCS_WEBDEV_ISOLATION_ATTESTED === '1' &&
        /^[A-Za-z0-9_-]{1,64}$/.test(runId) && runId !== 'baseline-capture' &&
        remaining > 0 && remaining <= 86_400_000 &&
        sinks.has(cleanEmail) && sinks.has(blockedEmail),
    'Requires the exact WebDev org, capture-only writes, a fresh expiring run, and both exact Tech sinks.');
}

async function resolveFields(config) {
    const names = ['WebToLead', 'VPCS_Submission_ID', 'VPCS_Submission_Hash', 'Honeypot'];
    let result;
    try {
        const { stdout } = await runFile('sf', [
            'data', 'query', '--use-tooling-api', '--target-org', targetOrg, '--json', '--query',
            `SELECT Id, DeveloperName FROM CustomField WHERE TableEnumOrId = 'Lead' AND DeveloperName IN (${names.map((name) => `'${name}'`).join(',')})`,
        ], { timeout: 20_000, maxBuffer: 64 * 1024, env: { ...process.env, SF_DISABLE_TELEMETRY: 'true', SF_LOG_LEVEL: 'error' } });
        result = JSON.parse(stdout);
    } catch {
        throw new BackstopError('Could not read exact Lead field IDs from verified WebDev Tooling API.');
    }
    const rows = result.result?.records;
    requireCheck(result.status === 0 && Array.isArray(rows) && rows.length === names.length &&
        rows.every((row) => /^00N[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(row.Id)),
    'Unexpected WebDev Tooling response for Lead wire IDs.');
    const id = (name) => rows.find((row) => row.DeveloperName.toLowerCase() === name.toLowerCase())?.Id;
    const webdev = intakeMappings.webdev;
    const configured = Object.values(config.fieldIds);
    const webToLead = configured.find((value) => sameSalesforceId(value, id('WebToLead')));
    const submission = configured.find((value) => sameSalesforceId(value, id('VPCS_Submission_ID')));
    requireCheck(webdev.verified && sameSalesforceId(config.orgId, webdev.orgId) && webToLead && submission &&
        sameSalesforceId(webdev.honeypot, id('Honeypot')) &&
        sameSalesforceId(webdev.submissionHash, id('VPCS_Submission_Hash')) &&
        new Set([webToLead, submission, webdev.honeypot, webdev.submissionHash].map((value) => value.slice(0, 15))).size === 4,
    'Lead Tooling IDs do not match the WebDev runtime serializer.');
    return { webToLead, submission, honeypot: webdev.honeypot, submissionHash: webdev.submissionHash };
}

function wirePayload(scenario, config, fields, runId) {
    const params = new URLSearchParams({
        oid: config.orgId.slice(0, 15),
        recordType: config.recordTypes[scenario.recordType],
        retURL: 'http://127.0.0.1:3000/thank-you',
        first_name: marker,
        last_name: scenario.attemptId,
        company: 'VPCS Synthetic Admission Verification',
        email: scenario.probe === 'honeypot' ? cleanEmail : blockedEmail.toUpperCase(),
        description: `${marker} ${runId} ${scenario.attemptId}`,
        country_code: 'US',
        'g-recaptcha-response': '',
        captcha_settings: '',
        [fields.submission]: scenario.attemptId,
        [fields.submissionHash]: scenario.payloadHash,
        [fields.honeypot]: scenario.probe === 'honeypot' ? 'VPCS synthetic filled honeypot' : '',
    });
    if (scenario.source) params.set('lead_source', scenario.source);
    if (scenario.webToLead) params.set(fields.webToLead, 'true');
    return params;
}

export function readNativeCaptureScope(operator) {
    return operator.runApex(() =>
        "JSON.serialize(new List<String>{String.valueOf(WebdevOutboundCapture.mode()), Label.VPCS_Webdev_Capture_Run_Id})");
}

async function verifyNoWork(operator, ids, runId, cutoff, receipt) {
    const list = ids.map((id) => `'${id}'`).join(',');
    const leads = await operator.query(
        `SELECT Id FROM Lead WHERE VPCS_Submission_ID__c IN (${list}) OR LastName IN (${list}) LIMIT 25`,
        'exact synthetic Lead readback',
    );
    if (leads.length !== 0) {
        await receipt({ event: 'unexpected-leads', leadIds: leads.map(({ Id }) => Id) });
        throw new BackstopError('Unexpected persistent Lead. Preserve the private ledger and reconcile related work before further writes.');
    }
    const captures = await operator.query(
        `SELECT COUNT(Id) captureCount FROM Webdev_Outbound_Capture__c WHERE Run_Id__c = '${runId}' AND CreatedDate >= ${cutoff} AND Action__c IN ('Sms','ReminderEmail')`,
        'exclusive negative run SMS and reminder captures',
    );
    const captureCount = captures[0]?.captureCount;
    requireCheck(captures.length === 1 && Number.isSafeInteger(captureCount) && captureCount >= 0,
        'Native capture aggregate was unavailable.');
    // Linked Lead queue and Task rows would require one of the matching Leads.
    await receipt({ event: 'readback', leadCount: 0, linkedWorkBasis: 'no-matching-parent', captureCount });
    requireCheck(captureCount === 0,
        'Unexpected native outreach captures. Preserve the private ledger and reconcile before further writes.');
}

async function main() {
    const { values } = parseArgs({ options: { execute: { type: 'boolean' } } });
    const matrix = buildCases();
    if (!values.execute) {
        console.log('Plan only. Direct negative Web-to-Lead cases for all ten form families plus source and flag variants.');
        console.log(matrix.map(({ name }) => name).join('\n'));
        console.log(usage);
        return;
    }

    const settings = loadSandboxSettings();
    const { config, env } = settings;
    const runId = env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
    const cutoff = new Date().toISOString();
    verifyWindow(settings, runId);
    const operator = createSalesforceCli(targetOrg);
    const [session, organization] = await Promise.all([connectSandboxIntake(settings), operator.getOrganization()]);
    assertSameOrganization({ id: webdevOrg, isSandbox: true }, organization);
    const fields = await resolveFields(config);
    const policy = (emailHash) => session.postIntake('policy', { emailHash });
    const [blocked, clean, capture] = await Promise.all([
        policy(sha256(blockedEmail)), policy(sha256(cleanEmail)),
        readNativeCaptureScope(operator),
    ]);
    requireCheck(blocked.status === 200 && blocked.body?.blocked === true &&
        clean.status === 200 && clean.body?.blocked === false &&
        blocked.body?.policyVersion === 'r1' && clean.body?.policyVersion === 'r1',
    'Expected the blocked fixture to be active and the clean honeypot sink to be unblocked.');
    requireCheck(capture?.[0] === 'Capture' && capture?.[1] === runId,
        'The actual native capture mode and label must match this exclusive run.');

    const attempts = matrix.map((scenario) => ({ ...scenario, attemptId: randomUUID(), payloadHash: randomBytes(32).toString('hex') }));
    const ids = attempts.map(({ attemptId }) => attemptId);
    const directory = join(projectRoot, 'artifacts', 'salesforce', 'webdev', session.fingerprint.slice(0, 12), 'spam-backstop');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, `${sha256(runId)}.jsonl`);
    const file = await open(path, 'wx', 0o600);
    try {
        const receipt = async (entry) => {
            await file.writeFile(JSON.stringify({ utc: new Date().toISOString(), ...entry }) + '\n');
            await file.sync();
        };
        await receipt({ event: 'start', runId, org: organization.id, count: attempts.length });
        await verifyNoWork(operator, ids, runId, cutoff, receipt);
        for (const scenario of attempts) {
            verifyWindow(settings, runId);
            const params = wirePayload(scenario, config, fields, runId);
            const url = validateWebToLeadTarget(params, {
                ...config, fieldIds: { ...config.fieldIds, honeypot: fields.honeypot, submissionHash: fields.submissionHash },
            });
            await receipt({ event: 'post-reserved', name: scenario.name, attemptId: scenario.attemptId, payloadHash: scenario.payloadHash });
            verifyWindow(settings, runId);
            let observation = 'unknown';
            try {
                const response = await fetch(url, {
                    method: 'POST', body: params, redirect: 'manual', signal: AbortSignal.timeout(5_000),
                });
                observation = response.status;
                await response.body?.cancel();
            } catch {
                // The reserved request may have arrived. Read it back without replay.
            }
            await receipt({ event: 'transport-observed', attemptId: scenario.attemptId, observation });
            await verifyNoWork(operator, [scenario.attemptId], runId, cutoff, receipt);
            requireCheck(typeof observation === 'number' && ((observation >= 200 && observation < 300) ||
                [301, 302, 303, 307, 308].includes(observation)),
            'Web-to-Lead transport did not show a normal native response. Readback is bounded and this run must not be replayed.');
        }
        for (const delay of [0, 15_000, 30_000]) {
            await setTimeout(delay);
            await verifyNoWork(operator, ids, runId, cutoff, receipt);
        }
        await receipt({ event: 'completed', count: attempts.length });
        console.log(`Observed zero matched Leads and zero native SMS/reminder capture events for ${attempts.length} direct WebDev checks over the bounded readback window.`);
        console.log(`Private receipt ${path}`);
    } finally {
        await file.close();
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        await main();
    } catch (error) {
        console.error(error instanceof BackstopError ? error.message :
            'WebDev backstop rehearsal stopped. Preserve the private ledger and reconcile before retrying.');
        process.exitCode = 1;
    }
}
