import 'server-only';
import { RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';

type Operation = 'policy' | 'inspect' | 'claim' | 'reconcile' | 'notification';
type RequestBody = { emailHash?: string; attemptId?: string; payloadHash?: string; denyDispatch?: boolean };
const INTAKE_CALL_MS = 5_000;
const INTAKE_RECONCILE_MS = 8_000;
const INTAKE_NOTIFICATION_MS = 2_000;

export class LeadAttemptConflictError extends Error {
    constructor() {
        super('Salesforce intake attempt belongs to a different payload');
        this.name = 'LeadAttemptConflictError';
    }
}

async function withinDeadline<T>(milliseconds: number, parent: AbortSignal | undefined, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const deadline = new AbortController();
    const signal = parent ? AbortSignal.any([parent, deadline.signal]) : deadline.signal;
    const timeout = setTimeout(() => deadline.abort(new Error('Salesforce intake deadline exceeded')), milliseconds);
    try {
        signal.throwIfAborted();
        return await work(signal);
    } finally {
        clearTimeout(timeout);
    }
}

function waitForNextRead(milliseconds: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', abort);
            resolve();
        }, milliseconds);
        signal.addEventListener('abort', abort, { once: true });
    });
}

/** These POSTs never retry automatically; a lost claim response must stay uncertain. */
async function callIntake(operation: Operation, body: RequestBody, parent?: AbortSignal): Promise<Record<string, unknown>> {
    const config = getSalesforceConfig();
    const response = await withinDeadline(operation === 'notification' ? INTAKE_NOTIFICATION_MS : INTAKE_CALL_MS, parent, signal => salesForceAPI({
        endpoint: `${config.restOrigin}/services/apexrest/vpcs/intake/v1/${operation}`,
        type: RequestType.POST,
        data: body,
        signal,
    }));
    if (operation !== 'policy' && response.status === 409 && response.data && typeof response.data === 'object' &&
        !Array.isArray(response.data) && response.data.code === 'attempt_conflict') {
        throw new LeadAttemptConflictError();
    }
    if (response.status !== 200 || !response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
        throw new Error('Salesforce intake service unavailable');
    }
    return response.data as Record<string, unknown>;
}

export async function checkBlockedIdentity(emailHash?: string, signal?: AbortSignal): Promise<boolean> {
    const result = await callIntake('policy', { emailHash }, signal);
    if (typeof result.blocked !== 'boolean' || result.policyVersion !== 'r1') throw new Error('Invalid intake policy response');
    return result.blocked;
}

export async function inspectLeadAttempt(attemptId: string, payloadHash: string, signal?: AbortSignal) {
    const result = await callIntake('inspect', { attemptId, payloadHash }, signal);
    if (typeof result.exists !== 'boolean' || typeof result.confirmed !== 'boolean' || typeof result.declined !== 'boolean' ||
        (!result.exists && (result.confirmed || result.declined)) || (result.confirmed && result.declined)) {
        throw new Error('Invalid intake inspection response');
    }
    return { exists: result.exists, confirmed: result.confirmed, declined: result.declined };
}

export async function claimLeadAttempt(attemptId: string, payloadHash: string, emailHash?: string, denyDispatch?: boolean, signal?: AbortSignal) {
    const result = await callIntake('claim', { attemptId, payloadHash, emailHash, ...(denyDispatch && { denyDispatch }) }, signal);
    if (typeof result.claimed !== 'boolean' || typeof result.blocked !== 'boolean' || (result.claimed && (denyDispatch || result.blocked))) {
        throw new Error('Invalid intake claim response');
    }
    return { claimed: result.claimed, blocked: result.blocked };
}

export async function reconcileLeadAttempt(attemptId: string, payloadHash: string, parent?: AbortSignal): Promise<boolean> {
    return withinDeadline(INTAKE_RECONCILE_MS, parent, async signal => {
        for (const delay of [0, 350, 1_000, 2_000]) {
            if (delay) await waitForNextRead(delay, signal);
            const result = await callIntake('reconcile', { attemptId, payloadHash }, signal);
            if (typeof result.confirmed !== 'boolean') throw new Error('Invalid intake reconciliation response');
            if (result.confirmed) return true;
        }
        return false;
    });
}

export async function claimWebsiteNotifications(attemptId: string, payloadHash: string, signal?: AbortSignal): Promise<boolean> {
    const result = await callIntake('notification', { attemptId, payloadHash }, signal);
    if (typeof result.claimed !== 'boolean') throw new Error('Invalid intake notification response');
    return result.claimed;
}
