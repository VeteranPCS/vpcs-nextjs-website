import { authenticateSalesforce, validateSalesforceRequestUrl } from '../../lib/salesforce/environment.mjs';
import { resolveLaunchEnvironment, salesforceTargetFingerprint } from './next-environment.mjs';

export const accountIdPattern = /^001[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/;

export function loadSandboxSettings() {
    const settings = resolveLaunchEnvironment({ command: 'dev', requestedProfile: 'webdev' });
    if (settings.config.profile !== 'webdev' || settings.hosted || settings.env.VERCEL_ENV !== undefined) {
        throw new Error('This command requires a local Salesforce WebDev sandbox environment.');
    }
    return settings;
}

export async function connectSandbox(settings = loadSandboxSettings()) {
    const { config, env } = settings;
    if (config.profile !== 'webdev') throw new Error('This command requires the Salesforce WebDev sandbox profile.');
    const { token, instanceUrl } = await authenticateSalesforce(config, env);
    async function request(path, { method = 'GET', body } = {}) {
        const url = validateSalesforceRequestUrl(`${instanceUrl}/services/data/${config.apiVersion}${path}`, config);
        try {
            return await fetch(url, {
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
    async function query(soql) {
        const { ok, status, body } = await get(`/query?q=${encodeURIComponent(soql)}`);
        if (!ok) throw new Error(`Salesforce WebDev query failed (${status}).`);
        return body;
    }
    async function get(path) {
        const response = await request(path);
        return { ok: response.ok, status: response.status, body: response.ok ? await response.json() : null };
    }
    return { config, fingerprint: salesforceTargetFingerprint(config), get, query, request };
}
