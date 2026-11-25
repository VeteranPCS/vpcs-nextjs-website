#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOutboundCapturePackage } from './prepare-outbound-capture.mjs';
import { createReviewedArchive, verifyReviewedArchive } from './metadata-archive.mjs';

const target = 'vpcs-webdev';
const orgId = '00Djg000000EK8YEAW';
const origin = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
const salesforceDir = fileURLToPath(new URL('..', import.meta.url));
const evidenceDir = join(salesforceDir, 'retrieved-private/outbound-capture-deploy-evidence');
const archiveDir = join(salesforceDir, 'retrieved-private/outbound-capture-archives');
const testClasses = [
    'WebdevOutboundCaptureTest', 'OpenPhoneClientTest', 'OpenPhoneDTOTests', 'MessagingServiceTest',
    'SmsMessageQueueBatchTest', 'AgentPortalReminderBatchTest', 'AccountChangeTriggerTest', 'AreaAssignmentTriggerTest',
];
const coverageClasses = ['WebdevOutboundCapture', 'WebhookHandler', 'OpenPhoneClient', 'SmsMessageQueueBatch', 'AgentPortalReminderBatch'];

function runSf(args) {
    const child = spawnSync('sf', [...args, '--target-org', target, '--json'], {
        cwd: salesforceDir,
        encoding: 'utf8',
        env: { ...process.env, SF_AUTOUPDATE_DISABLE: 'true', SF_DISABLE_TELEMETRY: 'true' },
        maxBuffer: 8 * 1024 * 1024,
    });
    if (child.error) throw new Error('Salesforce CLI command could not start. Check the reviewed CLI installation and permissions.');
    try {
        return JSON.parse(child.stdout);
    } catch {
        throw new Error('Salesforce CLI returned no structured result.');
    }
}

export function verifyTarget(invoke = runSf) {
    const display = invoke(['org', 'display']);
    if (display.status !== 0 || display.result?.id !== orgId || display.result?.instanceUrl !== origin) {
        throw new Error('Salesforce CLI alias did not identify the exact verified WebDev organization and instance.');
    }

    const query = invoke(['data', 'query', '--query', 'SELECT Id, IsSandbox FROM Organization']);
    const records = query.result?.records;
    if (query.status !== 0 || records?.length !== 1 || records[0]?.Id !== orgId || records[0]?.IsSandbox !== true) {
        throw new Error('Salesforce did not confirm the exact WebDev organization as a sandbox.');
    }
}

export function requirePassingValidation(payload) {
    const result = payload.result;
    const coverage = result?.details?.runTestResult?.codeCoverage;
    const testResults = result?.details?.runTestResult;
    if (payload.status !== 0 || result?.done !== true || result?.success !== true || result.status !== 'Succeeded' ||
        !(testResults?.numTestsRun > 0) || testResults?.numFailures !== 0 || !Array.isArray(coverage)) {
        throw new Error('Salesforce validation did not report a completed successful test run. Do not deploy.');
    }
    for (const name of coverageClasses) {
        const entry = coverage.find(item => item.name === name);
        if (!entry || !(entry.numLocations > 0) || !Number.isFinite(entry.numLocationsNotCovered) ||
            (entry.numLocations - entry.numLocationsNotCovered) / entry.numLocations < 0.75) {
            throw new Error(`Salesforce validation did not report 75% coverage for ${name}. Do not deploy.`);
        }
    }
    return { id: result.id, testsRun: testResults.numTestsRun };
}

const problemKinds = [
    [/field (does not exist|not writeable)|no such column|invalid field/i, 'field definition or access'],
    [/method does not exist|incorrect signature|constructor not defined/i, 'method or constructor signature'],
    [/invalid type|dependent class is invalid/i, 'type or class dependency'],
    [/unexpected token|expecting|parse error|syntax error/i, 'syntax or metadata format'],
    [/assertion failed|assertexception/i, 'assertion failure'],
    [/invalid_cross_reference|invalid_or_null|required_field_missing|dmlexception|field_custom_validation/i, 'record validation or fixture DML'],
    [/callout/i, 'callout or callout mock'],
    [/coverage/i, 'Apex coverage'],
];

function safeName(value) {
    return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(value) ? value : 'unnamed';
}

function problemKind(value) {
    return problemKinds.find(([pattern]) => typeof value === 'string' && pattern.test(value))?.[1] ?? 'see private evidence';
}

function asList(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

export function deploymentFailureSummary(payload) {
    const details = payload.result?.details;
    const components = asList(details?.componentFailures).map(entry => {
        const name = safeName(entry.fullName);
        const location = Number.isSafeInteger(entry.lineNumber) && entry.lineNumber > 0 ? ` (line ${entry.lineNumber})` : '';
        return `Component ${name}${location} — ${problemKind(entry.problem)}`;
    });
    const tests = asList(details?.runTestResult?.failures).map(entry =>
        `Test ${safeName(entry.name ?? entry.className)}.${safeName(entry.methodName)} — ${problemKind(entry.message)}`);
    return [...components, ...tests].slice(0, 20);
}

function runDeployment(args, phase, archive) {
    verifyReviewedArchive(archive);
    const payload = runSf(args);
    // Only Metadata API deployment results reach this evidence writer. Org display can contain access tokens.
    mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
    const path = join(evidenceDir, `${phase}-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.json`);
    writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    writeFileSync(`${path}.sha256`, `${archive.digest}\n`, { mode: 0o600, flag: 'wx' });
    console.log(`Private ${phase} evidence saved at ${path}.`);
    try {
        return requirePassingValidation(payload);
    } catch (error) {
        for (const summary of deploymentFailureSummary(payload)) console.error(summary);
        throw error;
    }
}

function main(mode) {
    if (!['--archive', '--validate', '--apply'].includes(mode) || process.argv.length !== 3) {
        throw new Error('Use --archive, --validate, or --apply. The target cannot be overridden.');
    }
    const archive = createReviewedArchive(buildOutboundCapturePackage(), archiveDir);
    console.log(`Reviewed WebDev metadata ZIP: ${archive.path}`);
    console.log(`SHA-256: ${archive.digest}`);
    if (mode === '--archive') return;

    verifyTarget();
    const args = ['project', 'deploy', 'start', '--metadata-dir', archive.path, '--single-package',
        '--test-level', 'RunSpecifiedTests', '--wait', '60', ...testClasses.flatMap(name => ['--tests', name])];
    const validated = runDeployment([...args, '--dry-run'], 'validation', archive);
    console.log(`WebDev validation ${validated.id} passed ${validated.testsRun} tests and per-class coverage.`);

    if (mode === '--apply') {
        verifyTarget();
        const deployed = runDeployment(args, 'deployment', archive);
        console.log(`WebDev deployment ${deployed.id} passed ${deployed.testsRun} tests and per-class coverage.`);
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        main(process.argv[2]);
    } catch (error) {
        process.exitCode = 1;
        console.error(error.message);
    }
}
