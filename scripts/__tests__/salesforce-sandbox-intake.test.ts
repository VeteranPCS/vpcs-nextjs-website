import { describe, expect, it, vi } from 'vitest';
import { resolveSalesforceEnvironment } from '@/lib/salesforce/environment.mjs';
import { webdevEnv, WEBDEV_ORG, WEBDEV_ORIGIN } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { connectSandbox, connectSandboxIntake } from '../lib/salesforce-sandbox.mjs';

const user = '005000000000019';
const unrelatedUser = '005000000000020';
const dedicatedEnv = {
  VPCS_SALESFORCE_INTAKE_CLIENT_ID: 'fixture-intake-client',
  VPCS_SALESFORCE_INTAKE_CLIENT_SECRET: 'fixture-intake-secret',
  VPCS_SALESFORCE_INTAKE_USER_ID: user,
};

function fixtures(overrides: Record<string, string | undefined> = {}, identityUser = user, organizationId = WEBDEV_ORG) {
  const env = { ...webdevEnv, NODE_ENV: 'development' as const,
    SALESFORCE_CLIENT_ID: 'fixture-directory-client', SALESFORCE_CLIENT_SECRET: 'fixture-directory-secret',
    ...dedicatedEnv, ...overrides };
  const settings = { config: resolveSalesforceEnvironment(env), env, hosted: false, distDir: '.next-sandbox' };
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/services/oauth2/token') {
      const client = (init?.body as URLSearchParams).get('client_id');
      const intake = client === dedicatedEnv.VPCS_SALESFORCE_INTAKE_CLIENT_ID;
      return Response.json({ access_token: intake ? 'intake-test-token' : 'directory-test-token', instance_url: WEBDEV_ORIGIN,
        ...(intake && { id: `https://test.salesforce.com/id/${WEBDEV_ORG}/${identityUser}` }) });
    }
    const query = url.searchParams.get('q');
    if (query?.includes('FROM Organization')) return Response.json({ records: [{ Id: organizationId, IsSandbox: true }] });
    if (query?.includes('WHERE Id = null')) return Response.json([{ errorCode: 'INVALID_FIELD' }], { status: 400 });
    if (url.pathname.endsWith('/policy')) return Response.json({ policyVersion: 'r1', blocked: false });
    return Response.json({ records: [] });
  });
  return { settings, fetcher };
}

describe('native WebDev harness session separation', () => {
  it('uses only dedicated identity-verified credentials for Apex requests and no-row FLS probes', async () => {
    const { settings, fetcher } = fixtures();
    const session = await connectSandboxIntake(settings, { fetcher });
    expect(session).not.toHaveProperty('query');
    expect(session).not.toHaveProperty('request');
    expect(await session.postIntake('policy', { emailHash: 'a'.repeat(64) })).toEqual({ status: 200, body: { policyVersion: 'r1', blocked: false } });
    expect((await session.probeIntakeRead('honeypot')).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(4);
    const [oauth, org, apex, fls] = fetcher.mock.calls;
    expect(String(oauth?.[0])).toBe(`${WEBDEV_ORIGIN}/services/oauth2/token`);
    expect(Object.fromEntries(oauth?.[1]?.body as URLSearchParams)).toEqual({ grant_type: 'client_credentials',
      client_id: 'fixture-intake-client', client_secret: 'fixture-intake-secret' });
    expect([org, apex, fls].map(call => new Headers(call?.[1]?.headers).get('authorization'))).toEqual(Array(3).fill('Bearer intake-test-token'));
    expect(String(apex?.[0])).toBe(`${WEBDEV_ORIGIN}/services/apexrest/vpcs/intake/v1/policy`);
    expect(new URL(String(fls?.[0])).searchParams.get('q')).toBe('SELECT Honeypot__c FROM Lead WHERE Id = null LIMIT 1');
    expect(() => session.probeIntakeRead('SELECT Name FROM Lead')).toThrow();
    await expect(session.postIntake('other', {})).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('keeps the directory readback token independent and has no Apex surface', async () => {
    const { settings, fetcher } = fixtures({ VPCS_SALESFORCE_INTAKE_CLIENT_SECRET: undefined });
    const session = await connectSandbox(settings, { fetcher });
    expect(session).not.toHaveProperty('postIntake');
    expect(await session.query('SELECT Id FROM Lead LIMIT 1')).toEqual({ records: [] });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(new Headers(fetcher.mock.calls[2]?.[1]?.headers).get('authorization')).toBe('Bearer directory-test-token');
  });

  it('fails closed on missing credentials, mismatched identity, or wrong Organization without issuing Apex calls', async () => {
    const missing = fixtures({ VPCS_SALESFORCE_INTAKE_CLIENT_SECRET: undefined });
    await expect(connectSandboxIntake(missing.settings, { fetcher: missing.fetcher })).rejects.toThrow();
    expect(missing.fetcher).not.toHaveBeenCalled();

    const wrongUser = fixtures({}, unrelatedUser);
    await expect(connectSandboxIntake(wrongUser.settings, { fetcher: wrongUser.fetcher })).rejects.toThrow(/intake principal/);
    expect(wrongUser.fetcher).toHaveBeenCalledTimes(1);

    const wrongOrg = fixtures({}, user, '00D000000000020');
    await expect(connectSandboxIntake(wrongOrg.settings, { fetcher: wrongOrg.fetcher })).rejects.toThrow(/Organization/);
    expect(wrongOrg.fetcher).toHaveBeenCalledTimes(2);
  });
});
