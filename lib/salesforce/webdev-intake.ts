import 'server-only';

import type { getSalesforceConfig } from './server-config';
import { isProtectedSalesforceWebdevPreview } from './environment.mjs';

const TEST_MARKER = '[VPCS WEBDEV TEST]';
const RESERVED_TEST_PHONE = /^\+120255501\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MAX_TEST_WINDOW_MS = 24 * 60 * 60 * 1_000;
const markedSubmissions = new WeakSet<MarkedWebdevSubmission>();

export interface WebdevTestRun {
    runId: string;
    expiresAt: number;
}

export interface MarkedWebdevSubmission extends WebdevTestRun {
    submissionId: string;
}

function listedValues(variable: string | undefined): Set<string> {
    return new Set((variable ?? '').split(',').map(value => value.trim()).filter(Boolean));
}

export function requireWebdevTestRun(config: ReturnType<typeof getSalesforceConfig>): WebdevTestRun {
    if (
        config.profile !== 'webdev' || !config.allowSandboxWrites ||
        (config.deliveryMode !== 'capture' && config.deliveryMode !== 'allowlisted') ||
        process.env.VPCS_WEBDEV_ISOLATION_ATTESTED !== '1'
    ) {
        throw new Error('Salesforce WebDev writes require verified sandbox isolation and an approved delivery mode');
    }

    const runId = process.env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
    const expires = process.env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? '';
    const expiresAt = Date.parse(expires);
    const remaining = expiresAt - Date.now();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(runId) || !ISO_TIMESTAMP.test(expires) ||
        !(remaining > 0 && remaining <= MAX_TEST_WINDOW_MS)) {
        throw new Error('Salesforce WebDev test run is missing or outside its authorized window');
    }
    return { runId, expiresAt };
}

/** Authorize the actual contact fields sent to sandbox automation and add a searchable marker. */
export function markWebdevSubmission(
    params: URLSearchParams,
    config: ReturnType<typeof getSalesforceConfig>,
    submissionId: string,
): MarkedWebdevSubmission {
    const run = requireWebdevTestRun(config);
    if (!params.get('first_name')?.startsWith(TEST_MARKER)) {
        throw new Error('Salesforce WebDev submission is missing the synthetic test marker');
    }

    const emails = listedValues(process.env.VPCS_WEBDEV_TEST_EMAILS?.toLowerCase());
    const email = params.get('email')?.toLowerCase();
    const brokerEmail = params.get('00N4x00000c4kPX')?.toLowerCase();
    if (!email || !emails.has(email) || (brokerEmail && !emails.has(brokerEmail))) {
        throw new Error('Salesforce WebDev submission email is outside the test allowlist');
    }
    for (const value of [params.get('mobile'), params.get('00N4x00000c4kPS')]) {
        if (!value) continue;
        const digits = value.replace(/^\+/, '').replace(/[\s().-]/g, '');
        const phone = digits.length === 10 ? `+1${digits}` : `+${digits}`;
        if (!isAllowedWebdevTestPhone(phone) && !(config.deliveryMode === 'capture' && RESERVED_TEST_PHONE.test(phone))) {
            throw new Error('Salesforce WebDev submission phone is outside the test allowlist');
        }
    }

    const description = params.get('description');
    const marker = `${TEST_MARKER} ${run.runId} ${submissionId}`;
    params.set('description', description ? `${marker}\n${description}` : marker);
    const submission = Object.freeze({ ...run, submissionId });
    if (config.deliveryMode === 'allowlisted') markedSubmissions.add(submission);
    return submission;
}

export function isAllowedWebdevTestPhone(phone: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(phone) && listedValues(process.env.VPCS_WEBDEV_TEST_PHONES).has(phone);
}

export function assertMarkedWebdevSubmission(submission: MarkedWebdevSubmission, run: WebdevTestRun): void {
    if (!markedSubmissions.has(submission) || submission.runId !== run.runId || submission.expiresAt !== run.expiresAt) {
        throw new Error('OpenPhone delivery requires a validated WebDev test submission');
    }
}

/** Keep Salesforce return and record URLs within the instance being tested. */
export function getWebdevSiteOrigin(): string {
    if (isProtectedSalesforceWebdevPreview()) {
        const vercelHost = process.env.VERCEL_URL ?? '';
        if (!/^[a-z0-9-]+\.vercel\.app$/.test(vercelHost)) {
            throw new Error('The protected Salesforce WebDev preview URL is unavailable');
        }
        return `https://${vercelHost}`;
    }

    const localOrigin = process.env.VPCS_WEBDEV_SITE_ORIGIN || `http://127.0.0.1:${process.env.PORT || '3000'}`;
    if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:[0-9]{1,5})?$/.test(localOrigin)) {
        throw new Error('VPCS_WEBDEV_SITE_ORIGIN must be a loopback origin');
    }
    return new URL(localOrigin).origin;
}
