import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { projectRoot } from './lib/next-environment.mjs';
import { connectSandbox, loadSandboxSettings } from './lib/salesforce-sandbox.mjs';
import { assertSameOrganization, createSalesforceCli, sameSalesforceId } from '../salesforce/routing-migration/salesforce-cli-adapter.mjs';

const marker = '[VPCS WEBDEV TEST]';
const blockedEmail = 'tech+spam-blocked@veteranpcs.com';
const blockedHash = createHash('sha256').update(blockedEmail, 'utf8').digest('hex');
const leadIdPattern = /^00Q[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digestPattern = /^[0-9a-f]{64}$/;
const deniedQueryCodes = new Set(['INVALID_TYPE', 'INVALID_FIELD', 'NOT_FOUND', 'INSUFFICIENT_ACCESS', 'INSUFFICIENT_ACCESS_OR_READONLY']);
const usage = 'node scripts/verify-salesforce-spam-intake.mjs --execute --phase <claim|notify> [--lead-id <operator fixture Lead ID>]';
class ContractCheckError extends Error {}
let phase = 'argument checks';

function check(holds, message) {
    if (!holds) throw new ContractCheckError(message);
}

function expectRpc(response, status, properties, label) {
    check(response.status === status && response.body && !Array.isArray(response.body) &&
        Object.keys(response.body).length === Object.keys(properties).length &&
        Object.entries(properties).every(([key, value]) => response.body[key] === value), `Unexpected intake API result: ${label}.`);
}

async function expectSingleWinner(responses, operation) {
    const outcomes = await Promise.allSettled(responses);
    check(outcomes.every(result => result.status === 'fulfilled'), `One or more ${operation} responses are unknown. Use readback and preserve the receipt.`);
    const rows = outcomes.map(result => result.value);
    const expectedKeys = operation === 'dispatch claim' ? ['blocked', 'claimed'] : ['claimed'];
    check(rows.every(row => row.status === 200 && typeof row.body?.claimed === 'boolean' &&
        Object.keys(row.body).sort().join(',') === expectedKeys.join(',')) &&
        rows.filter(row => row.body.claimed).length === 1, `Expected exactly one ${operation} winner.`);
    return rows;
}

async function verifyPrivateFields(session) {
    for (const [field, object] of [
        ['Id', 'Vpcs_Blocked_Email__c'], ['Id', 'Vpcs_Intake_Attempt__c'],
        ['Honeypot__c', 'Lead'], ['VPCS_Submission_Hash__c', 'Lead'],
    ]) {
        // Exercise object/field authorization without requesting a real customer's row.
        const response = await session.request(`/query?q=${encodeURIComponent(`SELECT ${field} FROM ${object} WHERE Id = null LIMIT 1`)}`);
        const errors = await response.json();
        check((response.status === 400 || response.status === 403 || response.status === 404) && Array.isArray(errors) &&
            errors.length > 0 && errors.every(error => deniedQueryCodes.has(error.errorCode)), 'Website OAuth principal retained an unexpected intake-object or field permission.');
    }
}

function verifyWindow(config, env) {
    const runId = env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
    const expiry = Date.parse(env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? '');
    const verify = () => check(config.allowSandboxWrites && config.deliveryMode === 'capture' &&
        env.VPCS_WEBDEV_ISOLATION_ATTESTED === '1' && /^[A-Za-z0-9_-]{1,64}$/.test(runId) && runId !== 'baseline-capture' &&
        expiry > Date.now() && expiry - Date.now() <= 86_400_000, 'A verified, capture-only WebDev write window is required.');
    verify();
    return { runId, verify };
}

async function main() {
    const { values } = parseArgs({ options: { execute: { type: 'boolean' }, phase: { type: 'string' }, 'lead-id': { type: 'string' } } });
    if (!values.execute) {
        console.log('Plan only. Verify the Website OAuth permission boundary, then race native claim and notification transactions in WebDev.');
        console.log(usage);
        return;
    }
    const leadId = values['lead-id'];
    check((values.phase === 'claim' && !leadId) || (values.phase === 'notify' && leadIdPattern.test(leadId ?? '')), usage);

    phase = 'WebDev profile, capture window, and OAuth organization guards';
    const settings = loadSandboxSettings();
    const { runId, verify } = verifyWindow(settings.config, settings.env);
    const operator = createSalesforceCli('vpcs-webdev');
    const [first, second, org] = await Promise.all([connectSandbox(settings), connectSandbox(settings), operator.getOrganization()]);
    assertSameOrganization({ id: first.config.orgId, isSandbox: true }, org);
    check(first.fingerprint === second.fingerprint, 'Website OAuth sessions do not match the same WebDev profile.');
    const folder = join(projectRoot, 'artifacts', 'salesforce', 'webdev', first.fingerprint.slice(0, 12), 'spam-contract');
    const runKey = createHash('sha256').update(runId).digest('hex');
    const receiptPath = join(folder, `${runKey}.json`);

    if (values.phase === 'claim') {
        phase = 'operator blocklist seed readback';
        const seed = await operator.query(`SELECT Id FROM Vpcs_Blocked_Email__c WHERE Email_Hash__c = '${blockedHash}' AND Active__c = true LIMIT 2`, 'active synthetic blocklist fixture');
        check(seed.length === 1, 'An operator must seed exactly one active synthetic blocked identity.');
        phase = 'operator intake field existence checks';
        const honeypot = await operator.query("SELECT Id FROM CustomField WHERE DeveloperName = 'Honeypot' AND TableEnumOrId = 'Lead' LIMIT 2", 'Lead honeypot field metadata', { tooling: true });
        check(honeypot.length === 1, 'Expected exactly one Lead honeypot field in Tooling API metadata.');
        await operator.query('SELECT VPCS_Submission_Hash__c FROM Lead WHERE Id = null LIMIT 1', 'intake hash field existence');
        phase = 'Website OAuth field and object denial';
        await verifyPrivateFields(first);
        verify();
        phase = 'Website OAuth blocked and unlisted identity policy';
        expectRpc(await first.postIntake('policy', { emailHash: blockedHash }), 200, { policyVersion: 'r1', blocked: true }, 'known blocked');
        expectRpc(await second.postIntake('policy', { emailHash: randomBytes(32).toString('hex') }), 200, { policyVersion: 'r1', blocked: false }, 'unlisted identity');

        const probe = { attemptId: randomUUID(), payloadHash: randomBytes(32).toString('hex') };
        phase = 'unused reference inspection and private receipt reservation';
        expectRpc(await first.postIntake('inspect', probe), 200, { exists: false, confirmed: false, declined: false }, 'before dispatch claim');
        await mkdir(folder, { recursive: true, mode: 0o700 });
        await writeFile(receiptPath, JSON.stringify({ ...probe, runId, fingerprint: first.fingerprint }, null, 2), { mode: 0o600, flag: 'wx' });
        verify();
        phase = 'native dispatch claim race';
        const claims = await expectSingleWinner([first.postIntake('claim', probe), second.postIntake('claim', probe)], 'dispatch claim');
        check(claims.every(row => row.body.blocked === false), 'Unexpected block in dispatch claim race.');
        expectRpc(await first.postIntake('inspect', probe), 200, { exists: true, confirmed: false, declined: false }, 'after dispatch claim');
        phase = 'native payload conflict and operator dispatch readback';
        const conflict = { ...probe, payloadHash: randomBytes(32).toString('hex') };
        expectRpc(await second.postIntake('claim', conflict), 409, { code: 'attempt_conflict' }, 'changed payload conflict');
        const rows = await operator.query(`SELECT Payload_Hash__c, State__c, Related_Lead__c FROM Vpcs_Intake_Attempt__c WHERE Attempt_Key__c = '${probe.attemptId}' LIMIT 2`, 'dispatch claim race');
        check(rows.length === 1 && rows[0].Payload_Hash__c === probe.payloadHash && rows[0].State__c === 'Claimed' && !rows[0].Related_Lead__c, 'Operator readback did not find exactly one unlinked dispatch claim.');
        console.log('Verified Website OAuth policy, private field boundaries, one dispatch winner, and payload conflict.');
        console.log(`Private fixture receipt for the operator: ${receiptPath}`);
        return;
    }

    phase = 'private receipt and exact operator Lead readback';
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    check(receipt.runId === runId && receipt.fingerprint === first.fingerprint && uuidPattern.test(receipt.attemptId) &&
        digestPattern.test(receipt.payloadHash), 'Invalid or mismatched WebDev contract receipt.');
    const probe = { attemptId: receipt.attemptId, payloadHash: receipt.payloadHash };
    const delivered = await operator.query(`SELECT Id, FirstName, Description, Email, VPCS_Submission_Hash__c FROM Lead WHERE VPCS_Submission_ID__c = '${probe.attemptId}' LIMIT 2`, 'marked notification race Lead');
    const sinks = (settings.env.VPCS_WEBDEV_TEST_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    check(delivered.length === 1 && sameSalesforceId(delivered[0].Id, leadId) && delivered[0].FirstName === marker &&
        delivered[0].Description?.split('\n')[0] === `${marker} ${runId} ${probe.attemptId}` &&
        delivered[0].VPCS_Submission_Hash__c === probe.payloadHash && sinks.includes(delivered[0].Email?.toLowerCase()), 'Expected a single exact operator-created Lead in the bounded capture run.');
    const before = await operator.query(`SELECT Website_Notification_Claimed__c FROM Vpcs_Intake_Attempt__c WHERE Attempt_Key__c = '${probe.attemptId}' LIMIT 2`, 'fresh notification claim');
    check(before.length === 1 && before[0].Website_Notification_Claimed__c === false, 'The fixture already used its notification claim.');
    verify();
    phase = 'native reconciliation and notification reservation';
    await writeFile(`${receiptPath}.notification-attempted`, `${new Date().toISOString()}\n`, { mode: 0o600, flag: 'wx' });
    expectRpc(await first.postIntake('reconcile', probe), 200, { confirmed: true }, 'exact persisted Lead');
    expectRpc(await second.postIntake('inspect', probe), 200, { exists: true, confirmed: true, declined: false }, 'after reconciliation');
    verify();
    phase = 'native notification race and operator readback';
    await expectSingleWinner([first.postIntake('notification', probe), second.postIntake('notification', probe)], 'notification claim');
    const rows = await operator.query(`SELECT State__c, Related_Lead__c, Website_Notification_Claimed__c FROM Vpcs_Intake_Attempt__c WHERE Attempt_Key__c = '${probe.attemptId}' LIMIT 2`, 'notification claim race');
    check(rows.length === 1 && rows[0].State__c === 'Confirmed' && sameSalesforceId(rows[0].Related_Lead__c, leadId) &&
        rows[0].Website_Notification_Claimed__c === true, 'Operator readback did not find one confirmed notification claim linked to the fixture.');
    console.log('Verified exact persisted Lead reconciliation and one native notification claim winner.');
}

try {
    await main();
} catch (error) {
    console.error(error instanceof ContractCheckError ? error.message : `WebDev intake contract rehearsal failed during ${phase}. Preserve any private receipt and reconcile before retrying.`);
    process.exitCode = 1;
}
