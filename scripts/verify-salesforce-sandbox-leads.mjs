#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { deliveryEmail } from './fixtures/salesforce-routing-delivery-readback.mjs';
import { routingDeliveryCases, routingRehearsalCases } from './fixtures/salesforce-routing-rehearsal.mjs';
import { projectRoot } from './lib/next-environment.mjs';
import { connectSandbox, loadSandboxSettings } from './lib/salesforce-sandbox.mjs';

const rehearsalKeys = new Set([
    'PATH', 'HOME', 'TMPDIR', 'TEMP', 'TERM', 'VPCS_SALESFORCE_PROFILE',
    'VPCS_SALESFORCE_ORG_ID', 'VPCS_SALESFORCE_WEB_TO_LEAD_URL', 'VPCS_SALESFORCE_BASE_URL',
    'VPCS_SALESFORCE_METADATA_JSON', 'VPCS_SANDBOX_LEAD_WRITES', 'VPCS_DELIVERY_MODE',
    'VPCS_WEBDEV_ISOLATION_ATTESTED', 'VPCS_WEBDEV_TEST_RUN_ID', 'VPCS_WEBDEV_TEST_EXPIRES_AT',
    'VPCS_WEBDEV_TEST_EMAILS', 'VPCS_WEBDEV_TEST_PHONES', 'SALESFORCE_AUTH_GRANT', 'SALESFORCE_LOGIN_BASE_URL',
    'SALESFORCE_API_VERSION', 'SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET',
]);
const usage = 'npm run verify:salesforce-sandbox-leads -- [--routing | --routing-delivery] --execute --email <approved test sink>';

async function main() {
    const { values } = parseArgs({ options: {
        execute: { type: 'boolean' }, routing: { type: 'boolean' }, 'routing-delivery': { type: 'boolean' }, email: { type: 'string' },
    } });
    const delivery = values['routing-delivery'];
    if (delivery && values.routing) throw new Error(`Usage: ${usage}`);
    const suite = delivery ? 'routing-delivery' : values.routing ? 'routing' : 'forms';
    if (!values.execute) {
        console.log('Salesforce WebDev rehearsal plan (no Salesforce requests).');
        if (suite !== 'forms') {
            const cases = delivery ? routingDeliveryCases : routingRehearsalCases;
            console.log(cases.map(scenario => scenario.name).join(', '));
        } else {
            console.log('Contact Agent, Contact Lender, Agent Listing Request, Lender Listing Request, Keep in Touch, Contact Form, VA Loan Guide, First Time Home Buyer Guide, Colorado Relocation Guide, Internship Application.');
        }
        console.log('Execution requires a verified sandbox, write and isolation flags, capture delivery, an expiring test run, and an approved email sink.');
        if (delivery) console.log('Queues exactly four selected cases with dispatch paused and Tech contact details; sends no SMS.');
        console.log(usage);
        return;
    }
    const email = values.email?.trim().toLowerCase();
    if (!email || !/^[a-z0-9.!#$%&*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) || email.length > 80) {
        throw new Error(`Usage: ${usage}`);
    }
    if (delivery && email !== deliveryEmail) throw new Error('Delivery preparation requires the exact approved Tech email.');
    const settings = loadSandboxSettings();
    const { config, env } = settings;
    if (!config.allowSandboxWrites || config.deliveryMode !== 'capture' || env.VPCS_WEBDEV_ISOLATION_ATTESTED !== '1') {
        throw new Error('Lead verification requires explicitly enabled WebDev writes, verified sandbox isolation, and capture delivery.');
    }
    if (['1', 'true'].includes(env.LEAD_DRY_RUN?.toLowerCase())) {
        throw new Error('Live Salesforce WebDev lead verification requires LEAD_DRY_RUN to be off.');
    }
    const runId = env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
    const windowEnd = env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? '';
    const windowRemaining = Date.parse(windowEnd) - Date.now();
    if ((delivery && runId === 'baseline-capture') || !/^[a-zA-Z0-9_-]{1,64}$/.test(runId) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(windowEnd)
        || !(windowRemaining > 0 && windowRemaining <= (delivery ? 1_800_000 : 86_400_000))) {
        throw new Error(delivery ? 'Delivery preparation requires a fresh run ID and a window of up to 30 minutes.'
            : 'Lead verification requires a unique test run ID and an authorized window of up to 24 hours.');
    }
    const emails = (env.VPCS_WEBDEV_TEST_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase());
    if (!emails.includes(email)) throw new Error('The rehearsal email is outside the approved test sink allowlist.');

    const { fingerprint } = await connectSandbox(settings);
    const runDirectory = join(projectRoot, 'artifacts', 'salesforce', 'webdev', fingerprint.slice(0, 12), 'rehearsals');
    const runKey = createHash('sha256').update(runId).digest('hex');
    mkdirSync(runDirectory, { recursive: true, mode: 0o700 });
    try {
        // Web-to-Lead acceptance can precede record visibility. Reserve the ID
        // even if a previous attempt failed or is still running on this machine.
        writeFileSync(join(runDirectory, `${runKey}.attempted`), `${new Date().toISOString()}\n`, { flag: 'wx', mode: 0o600 });
    } catch (error) {
        if (error.code === 'EEXIST') throw new Error('This WebDev rehearsal run ID has already been attempted. Use a fresh run ID.');
        throw error;
    }
    console.log(`Verified WebDev target (${fingerprint.slice(0, 12)}). Running synthetic form submissions with capture delivery.`);
    const rehearsalEnv = Object.fromEntries(Object.entries(env).filter(([key]) => rehearsalKeys.has(key)));
    const child = spawn(process.execPath, [join(projectRoot, 'node_modules/vitest/vitest.mjs'), 'run',
        '--config', 'scripts/fixtures/salesforce-sandbox-rehearsal.config.mjs', '--bail', '1'], {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
            ...rehearsalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3000',
            VPCS_WEBDEV_REHEARSAL_EMAIL: email,
            VPCS_WEBDEV_REHEARSAL_SUITE: suite,
        },
    });
    const stop = () => child.kill('SIGTERM');
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    try {
        process.exitCode = await new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('exit', code => resolve(code ?? 1));
        });
    } finally {
        process.off('SIGTERM', stop);
        process.off('SIGINT', stop);
    }
}

try {
    await main();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
