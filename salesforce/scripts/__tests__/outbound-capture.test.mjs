import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildOutboundCapturePackage } from '../prepare-outbound-capture.mjs';
import { deploymentFailureSummary, requirePassingValidation, verifyTarget } from '../deploy-outbound-capture.mjs';
import { createReviewedArchive, verifyReviewedArchive } from '../metadata-archive.mjs';

const orgId = '00Djg000000EK8YEAW';
const instanceUrl = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
const reviewedBaseline = new URL('../../retrieved-private/baseline-2026-11-25/unpackaged/unpackaged/classes/OpenPhoneClient.cls', import.meta.url);

test('builds an isolated, deterministic package with no copied webhook path or secret', { skip: !existsSync(reviewedBaseline) }, () => {
    const patch = buildOutboundCapturePackage();
    assert.deepEqual(patch, buildOutboundCapturePackage());
    assert.equal(Object.keys(patch).length, 16);
    assert.doesNotMatch(patch['classes/WebhookHandler.cls'], /HttpRequest|callout:\s*|https?:|WebhookSecret|X-Salesforce-Signature/i);
    assert.match(patch['classes/OpenPhoneClient.cls'], /Action\.SenderRegistry[\s\S]+this\.get\(PHONE_NUMBERS_PATH\)/);
    assert.match(patch['classes/OpenPhoneClient.cls'], /Action\.Sms[\s\S]+resolveSenderPhoneNumber\(req\)/);
    assert.match(patch['classes/SmsMessageQueueBatch.cls'], /Mode\.Capture && String\.isNotBlank\(queueRecord\.Named_Credential__c\)/);
    assert.match(patch['classes/SmsMessageQueueBatch.cls'], /Status__c = WebdevOutboundCapture\.CAPTURED;[\s\S]+Message_Id__c = null;/);
    assert.match(patch['package.xml'], /<members>SMS_Message_Queue__c\.Status__c<\/members>/);
    assert.doesNotMatch(patch['package.xml'], /NamedCredential|RemoteSiteSetting|Trigger|Workflow|Flow/);
    assert.equal((patch['objects/SMS_Message_Queue__c.object'].match(/<fields>/g) ?? []).length, 1);
    assert.match(patch['objects/SMS_Message_Queue__c.object'], /<fullName>Captured<\/fullName>/);
});

test('rejects unexpected private baseline fingerprints before generating a package', () => {
    const source = mkdtempSync(join(tmpdir(), 'vpcs-capture-test-'));
    try {
        mkdirSync(join(source, 'classes'));
        writeFileSync(join(source, 'classes/OpenPhoneClient.cls'), 'Unexpected source');
        assert.throws(() => buildOutboundCapturePackage(source), /fingerprint changed/);
    } finally {
        rmSync(source, { recursive: true, force: true });
    }
});

test('refuses a production or unexpected CLI alias before asking for metadata operations', () => {
    let attempts = 0;
    assert.throws(() => verifyTarget(() => {
        attempts++;
        return { status: 0, result: { id: '00D4x000003yaV2', instanceUrl: 'https://veteranpcs.my.salesforce.com' } };
    }), /exact verified WebDev/);
    assert.equal(attempts, 1);
});

test('requires a live Organization proof in addition to matching the local alias', () => {
    const invoke = isSandbox => args => args[0] === 'org'
        ? { status: 0, result: { id: orgId, instanceUrl } }
        : { status: 0, result: { records: [{ Id: orgId, IsSandbox: isSandbox }] } };
    assert.throws(() => verifyTarget(invoke(false)), /as a sandbox/);
    assert.doesNotThrow(() => verifyTarget(invoke(true)));
});

test('requires actual passing tests and 75 percent coverage for every changed non-test class', () => {
    const names = ['WebdevOutboundCapture', 'WebhookHandler', 'OpenPhoneClient', 'SmsMessageQueueBatch', 'AgentPortalReminderBatch'];
    const details = { runTestResult: { numTestsRun: 8, numFailures: 0, codeCoverage: names.map(name => ({
        name, numLocations: 10, numLocationsNotCovered: 2,
    })) } };
    const payload = { status: 0, result: { id: 'fixture-job-id', done: true, success: true, status: 'Succeeded', details } };
    assert.deepEqual(requirePassingValidation(payload), { id: 'fixture-job-id', testsRun: 8 });
    details.runTestResult.codeCoverage[2].numLocationsNotCovered = 3;
    assert.throws(() => requirePassingValidation(payload), /coverage for OpenPhoneClient/);
    details.runTestResult.numTestsRun = 0;
    assert.throws(() => requirePassingValidation(payload), /successful test run/);
});

test('reports deploy problem categories without echoing source lines, secrets, or stack traces', () => {
    const result = { details: {
        componentFailures: { fullName: 'WebhookHandler', lineNumber: 9,
            problem: "Invalid type: line includes 'private token' and https://example.invalid" },
        runTestResult: { failures: [{ name: 'WebdevOutboundCaptureTest', methodName: 'outboundGuardTest',
            message: 'Assertion failed: unexpected private value', stackTrace: 'ExampleClass: local source' }] },
    } };

    assert.deepEqual(deploymentFailureSummary({ result }), [
        'Component WebhookHandler (line 9) — type or class dependency',
        'Test WebdevOutboundCaptureTest.outboundGuardTest — assertion failure',
    ]);
});

test('creates an exact deterministic ZIP with a root manifest and regular entries', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vpcs-archive-test-'));
    const files = { 'package.xml': '<Package/>', 'classes/Reviewed.cls': 'public class Reviewed {}' };
    try {
        const archive = createReviewedArchive(files, join(directory, 'archives'));
        assert.equal(archive.digest.length, 64);
        assert.ok(archive.path.endsWith(`metadata-${archive.digest}.zip`));
        assert.deepEqual(createReviewedArchive(Object.fromEntries(Object.entries(files).reverse()), join(directory, 'archives')), archive);

        const inspected = spawnSync('python3', ['-I', '-c', `
import json, stat, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    print(json.dumps([(item.filename, stat.S_ISREG(item.external_attr >> 16), archive.read(item).decode()) for item in archive.infolist()]))
`, archive.path], { encoding: 'utf8' });
        assert.equal(inspected.status, 0);
        assert.deepEqual(JSON.parse(inspected.stdout), [
            ['classes/Reviewed.cls', true, files['classes/Reviewed.cls']],
            ['package.xml', true, files['package.xml']],
        ]);
        assert.doesNotThrow(() => verifyReviewedArchive(archive));
        assert.throws(() => createReviewedArchive({ ...files, '../stray.xml': 'ignored' }, directory), /safe regular/);

        chmodSync(archive.path, 0o600);
        writeFileSync(archive.path, 'changed bytes');
        chmodSync(archive.path, 0o400);
        assert.throws(() => verifyReviewedArchive(archive), /differs/);

        const link = join(directory, 'linked.zip');
        symlinkSync(archive.path, link);
        assert.throws(() => verifyReviewedArchive({ ...archive, path: link }));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
