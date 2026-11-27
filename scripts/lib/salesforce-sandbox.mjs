import { assertSalesforceIntakeIdentity, authenticateSalesforce, resolveSalesforceIntakeAuth, validateSalesforceRequestUrl } from '../../lib/salesforce/environment.mjs';
import { resolveLaunchEnvironment, salesforceTargetFingerprint } from './next-environment.mjs';

export const accountIdPattern = /^001[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/;

export function loadSandboxSettings() {
    const settings = resolveLaunchEnvironment({ command: 'dev', requestedProfile: 'webdev' });
    if (settings.config.profile !== 'webdev' || settings.hosted || settings.env.VERCEL_ENV !== undefined) {
        throw new Error('This command requires a local Salesforce WebDev sandbox environment.');
    }
    return settings;
}

const privateIntakeProbes = {
    blocklist: 'SELECT Id FROM Vpcs_Blocked_Email__c WHERE Id = null LIMIT 1',
    attempts: 'SELECT Id FROM Vpcs_Intake_Attempt__c WHERE Id = null LIMIT 1',
    honeypot: 'SELECT Honeypot__c FROM Lead WHERE Id = null LIMIT 1',
    submissionHash: 'SELECT VPCS_Submission_Hash__c FROM Lead WHERE Id = null LIMIT 1',
};

async function authenticateIntake(config, env, fetcher) {
    const auth = resolveSalesforceIntakeAuth(config, env);
    const credentials = {
        SALESFORCE_CLIENT_ID: auth.request.body.get('client_id'),
        SALESFORCE_CLIENT_SECRET: auth.request.body.get('client_secret'),
    };
    return authenticateSalesforce(auth.config, credentials, async (url, options) => {
        const response = await fetcher(url, options);
        if (url === auth.request.url && response.status === 200) {
            assertSalesforceIntakeIdentity((await response.clone().json()).id, auth.config, auth.userId);
        }
        return response;
    });
}

async function connectVerifiedSandbox(settings, fetcher, purpose) {
    const { config, env } = settings;
    if (config.profile !== 'webdev') throw new Error('This command requires the Salesforce WebDev sandbox profile.');
    const { token, instanceUrl } = purpose === 'intake' ? await authenticateIntake(config, env, fetcher) : await authenticateSalesforce(config, env, fetcher);
    async function send(path, { method = 'GET', body } = {}, pathPurpose = 'directory') {
        const url = validateSalesforceRequestUrl(`${instanceUrl}${path}`, config, pathPurpose);
        try {
            return await fetcher(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                },
                body: body === undefined ? undefined : JSON.stringify(body),
                redirect: 'error',
                signal: AbortSignal.timeout(15_000),
            });
        } catch {
            throw new Error('Salesforce WebDev REST request failed.');
        }
    }
    return { config, fingerprint: salesforceTargetFingerprint(config), send };
}

export async function connectSandbox(settings = loadSandboxSettings(), { fetcher = fetch } = {}) {
    const { config, fingerprint, send } = await connectVerifiedSandbox(settings, fetcher, 'directory');
    async function request(path, options) {
        return send(`/services/data/${config.apiVersion}${path}`, options);
    }
    async function query(soql) {
        const { ok, status, body } = await get(`/query?q=${encodeURIComponent(soql)}`);
        if (!ok) throw new Error(`Salesforce WebDev query failed (${status}).`);
        return body;
    }
    async function get(path) {
        const response = await request(path);
        return { ok: response.ok, status: response.status, body: response.ok ? await response.json() : null };
    }
    return { config, fingerprint, get, query, request };
}

export async function connectSandboxIntake(settings = loadSandboxSettings(), { fetcher = fetch } = {}) {
    const { config, fingerprint, send } = await connectVerifiedSandbox(settings, fetcher, 'intake');
    async function postIntake(operation, body) {
        if (!['policy', 'inspect', 'claim', 'reconcile', 'notification'].includes(operation)) {
            throw new Error('Unsupported WebDev intake operation.');
        }
        const response = await send(`/services/apexrest/vpcs/intake/v1/${operation}`, { method: 'POST', body }, 'intake');
        try {
            return { status: response.status, body: await response.json() };
        } catch {
            throw new Error('WebDev intake API did not return JSON.');
        }
    }
    function probeIntakeRead(probe) {
        if (!Object.hasOwn(privateIntakeProbes, probe)) throw new Error('Unsupported WebDev intake permission probe.');
        return send(`/services/data/${config.apiVersion}/query?q=${encodeURIComponent(privateIntakeProbes[probe])}`);
    }
    return { config, fingerprint, postIntake, probeIntakeRead };
}
