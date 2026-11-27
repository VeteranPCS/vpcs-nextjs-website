import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AxiosRequestConfig } from 'axios';
import { productionEnv, stubProductionEnv, stubWebdevEnv, WEBDEV_ORG, WEBDEV_ORIGIN } from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));
vi.mock('axios', () => ({ default: vi.fn() }));
vi.mock('@/services/loggingService', () => ({ logDebug: vi.fn(), logError: vi.fn(), logInfo: vi.fn() }));

const intakeId = 'fixture-intake-client';
const intakeSecret = 'fixture-intake-secret';
const intakeUser = '005000000000019';
const otherUser = '005000000000020';
const attemptId = '01234567-0123-4321-abcd-0123456789ab';
const payloadHash = 'a'.repeat(64);
const emailHash = 'b'.repeat(64);
const envNames = ['VPCS_SALESFORCE_INTAKE_CLIENT_ID', 'VPCS_SALESFORCE_INTAKE_CLIENT_SECRET', 'VPCS_SALESFORCE_INTAKE_USER_ID'] as const;

function stubIntake() {
  vi.stubEnv(envNames[0], intakeId);
  vi.stubEnv(envNames[1], intakeSecret);
  vi.stubEnv(envNames[2], intakeUser);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => { resolve = settle; });
  return { promise, resolve };
}

type Reply = { status: number; data: unknown };

async function environment() {
  vi.resetModules();
  const axios = vi.mocked((await import('axios')).default) as unknown as Mock<(config: AxiosRequestConfig) => Promise<Reply>>;
  const api = await import('@/services/api');
  const intake = await import('@/services/salesforceIntake');
  const authOrigin = process.env.VPCS_SALESFORCE_BASE_URL ?? WEBDEV_ORIGIN;
  const orgId = process.env.VPCS_SALESFORCE_ORG_ID ?? WEBDEV_ORG;
  const isSandbox = process.env.VPCS_SALESFORCE_PROFILE === 'webdev';
  let loginCount = 0;

  function token(tokenValue: string, user = intakeUser, organization = orgId): Reply {
    return { status: 200, data: { access_token: tokenValue, instance_url: authOrigin,
      id: `https://login.salesforce.com/id/${organization}/${user}` } };
  }

  const oauth = vi.fn(async (_config: AxiosRequestConfig, grant: string | null) =>
    token(grant === 'password' ? 'fixture-directory-bearer' : 'fixture-intake-bearer-' + ++loginCount));
  const organization = vi.fn(async (_config: AxiosRequestConfig): Promise<Reply> =>
    ({ status: 200, data: { records: [{ Id: orgId, IsSandbox: isSandbox }] } }));
  const endpoint = vi.fn(async (_config: AxiosRequestConfig): Promise<Reply> =>
    ({ status: 200, data: { blocked: false, policyVersion: 'r1' } }));

  axios.mockReset().mockImplementation(config => {
    const path = new URL(config.url!).pathname;
    if (path === '/services/oauth2/token') return oauth(config, (config.data as URLSearchParams).get('grant_type'));
    if (path.endsWith('/query') && new URL(config.url!).searchParams.get('q')?.includes('FROM Organization')) return organization(config);
    return endpoint(config);
  });
  return { ...api, ...intake, axios, oauth, organization, endpoint, token, authOrigin, orgId };
}

beforeEach(() => { stubProductionEnv(); stubIntake(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('dedicated Salesforce intake credentials', () => {
  it.each(envNames)('fails before network when %s is missing', async name => {
    vi.stubEnv(name, undefined);
    const subject = await environment();
    await expect(subject.checkBlockedIdentity(emailHash)).rejects.toThrow();
    expect(subject.axios).not.toHaveBeenCalled();
  });

  it('fails before network when every dedicated credential is absent or the production app ID is shared', async () => {
    for (const name of envNames) vi.stubEnv(name, undefined);
    const missing = await environment();
    await expect(missing.checkBlockedIdentity(emailHash)).rejects.toThrow();
    expect(missing.axios).not.toHaveBeenCalled();
    stubIntake();
    vi.stubEnv(envNames[0], process.env.SALESFORCE_CLIENT_ID);
    const shared = await environment();
    await expect(shared.checkBlockedIdentity(emailHash)).rejects.toThrow();
    expect(shared.axios).not.toHaveBeenCalled();
  });

  it('uses the pinned My Domain client credentials grant and exact Organization in the live profile', async () => {
    const subject = await environment();
    await expect(subject.checkBlockedIdentity(emailHash)).resolves.toBe(false);
    const request = subject.oauth.mock.calls[0]![0];
    expect(request).toMatchObject({ url: `${productionEnv.VPCS_SALESFORCE_BASE_URL}/services/oauth2/token`, maxRedirects: 0 });
    expect(Object.fromEntries(request.data as URLSearchParams)).toEqual({ grant_type: 'client_credentials', client_id: intakeId, client_secret: intakeSecret });
    expect(subject.organization).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ headers: { Authorization: 'Bearer fixture-intake-bearer-1' }, maxRedirects: 0 }));
    expect(subject.endpoint).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      url: `${subject.authOrigin}/services/apexrest/vpcs/intake/v1/policy`,
      headers: expect.objectContaining({ Authorization: 'Bearer fixture-intake-bearer-1' }),
    }));
  });

  it('blocks Apex intake through the generic client and rejects an intake operation outside the fixed allowlist', async () => {
    const subject = await environment();
    await expect(subject.salesForceAPI({
      endpoint: `${subject.authOrigin}/services/apexrest/vpcs/intake/v1/policy`, type: subject.RequestType.POST,
    })).rejects.toThrow();
    await expect(subject.salesForceIntakeAPI('policy/../claim' as 'policy', {})).rejects.toThrow();
    expect(subject.axios).not.toHaveBeenCalled();
  });

  it('supplies an offline mock session without any live intake credentials', async () => {
    stubWebdevEnv({ VPCS_SALESFORCE_PROFILE: 'mock' });
    for (const name of envNames) vi.stubEnv(name, undefined);
    const subject = await environment();
    const { getSalesforceTokenSnapshot } = await import('@/services/salesForceTokenService');
    await expect(getSalesforceTokenSnapshot({ purpose: 'intake' })).resolves.toMatchObject({ token: 'offline-mock-salesforce-token' });
    expect(subject.axios).not.toHaveBeenCalled();
  });

  it('accepts explicit credential reuse in the isolated WebDev workflow', async () => {
    stubWebdevEnv({ VPCS_SANDBOX_LEAD_WRITES: '1', VPCS_DELIVERY_MODE: 'capture', VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
      [envNames[0]]: 'test-client-id', [envNames[1]]: 'test-client-secret', [envNames[2]]: intakeUser });
    const subject = await environment();
    await expect(subject.checkBlockedIdentity(emailHash)).resolves.toBe(false);
    expect(subject.oauth.mock.calls[0]![0].url).toBe(`${WEBDEV_ORIGIN}/services/oauth2/token`);
  });

  it('rejects tokens issued for a different user or Organization before any Apex request and never caches them', async () => {
    const subject = await environment();
    subject.oauth.mockResolvedValueOnce(subject.token('wrong-user-token', otherUser))
      .mockResolvedValueOnce(subject.token('wrong-org-token', intakeUser, WEBDEV_ORG));
    await expect(subject.checkBlockedIdentity(emailHash)).rejects.toThrow();
    await expect(subject.checkBlockedIdentity(emailHash)).rejects.toThrow();
    expect(subject.endpoint).not.toHaveBeenCalled();
    subject.organization.mockResolvedValueOnce({ status: 200, data: { records: [{ Id: WEBDEV_ORG, IsSandbox: true }] } });
    await expect(subject.checkBlockedIdentity(emailHash)).rejects.toThrow();
    expect(subject.endpoint).not.toHaveBeenCalled();
    await expect(subject.checkBlockedIdentity(emailHash)).resolves.toBe(false);
    expect(subject.oauth).toHaveBeenCalledTimes(4);
  });

  it('isolates same-host directory and intake caches, coalesces intake OAuth, and ignores a late 401 from an old intake generation', async () => {
    const subject = await environment();
    const directory = { endpoint: `${subject.authOrigin}/services/data/v62.0/sobjects/Lead`, type: subject.RequestType.GET };
    const late401 = deferred<Reply>();
    subject.endpoint.mockImplementation(async config => {
      const url = new URL(config.url!);
      if (url.pathname.endsWith('/claim')) return late401.promise;
      return { status: 200, data: { blocked: false, policyVersion: 'r1' } };
    });
    await Promise.all([subject.salesForceAPI(directory), ...Array.from({ length: 3 }, () => subject.checkBlockedIdentity(emailHash))]);
    expect(subject.oauth).toHaveBeenCalledTimes(2);
    const claimResult = subject.claimLeadAttempt(attemptId, payloadHash, emailHash).catch(error => error);
    await vi.waitFor(() => expect(subject.endpoint.mock.calls.some(([req]) => req.url?.endsWith('/claim'))).toBe(true));
    subject.endpoint.mockResolvedValueOnce({ status: 401, data: [{ errorCode: 'INVALID_SESSION_ID' }] });
    await expect(subject.checkBlockedIdentity(emailHash)).rejects.toThrow();
    await expect(subject.checkBlockedIdentity(emailHash)).resolves.toBe(false);
    late401.resolve({ status: 401, data: [{ errorCode: 'INVALID_SESSION_ID' }] });
    expect(await claimResult).toBeInstanceOf(Error);
    await expect(subject.checkBlockedIdentity(emailHash)).resolves.toBe(false);
    await subject.salesForceAPI(directory);
    expect(subject.oauth).toHaveBeenCalledTimes(3);
    const directoryCalls = subject.endpoint.mock.calls.filter(([config]) => config.url === directory.endpoint);
    expect(directoryCalls).toHaveLength(2);
    expect(directoryCalls.every(([config]) => config.headers?.Authorization === 'Bearer fixture-directory-bearer')).toBe(true);
    const intakeCalls = subject.endpoint.mock.calls.filter(([config]) => config.url?.includes('/services/apexrest/'));
    expect(intakeCalls.every(([config]) => /^Bearer fixture-intake-bearer-[12]$/.test(String(config.headers?.Authorization)))).toBe(true);
    expect(intakeCalls.filter(([config]) => config.url?.endsWith('/claim'))).toHaveLength(1);
  });

  it('aborts one waiting caller without cancelling shared OAuth or sending a late Apex mutation', async () => {
    const subject = await environment();
    const pending = deferred<Reply>();
    subject.oauth.mockImplementationOnce(() => pending.promise);
    const controller = new AbortController();
    const stopped = subject.claimLeadAttempt(attemptId, payloadHash, emailHash, undefined, controller.signal).catch(error => error);
    const healthy = subject.checkBlockedIdentity(emailHash);
    await vi.waitFor(() => expect(subject.oauth).toHaveBeenCalledTimes(1));
    controller.abort(new Error('synthetic caller timeout'));
    expect(await stopped).toMatchObject({ message: 'synthetic caller timeout' });
    pending.resolve(subject.token('fixture-intake-bearer-1'));
    await expect(healthy).resolves.toBe(false);
    expect(subject.oauth).toHaveBeenCalledTimes(1);
    expect(subject.endpoint).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ url: expect.stringMatching(/\/policy$/) }));
  });
});
