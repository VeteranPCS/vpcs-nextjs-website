import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

import {
  productionEnv, stubProductionEnv, stubWebdevEnv, WEBDEV_ORG, WEBDEV_ORIGIN,
} from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));
vi.mock('axios', () => ({ default: vi.fn() }));

function tokenResponse(token: string, instanceUrl = process.env.VPCS_SALESFORCE_BASE_URL ?? WEBDEV_ORIGIN) {
  return {
    status: 200,
    data: { access_token: token, instance_url: instanceUrl },
  };
}

function organizationResponse(orgId = WEBDEV_ORG, isSandbox = true) {
  return { status: 200, data: { records: [{ Id: orgId, IsSandbox: isSandbox }] } };
}

async function loadFresh() {
  vi.resetModules();
  const axios = vi.mocked((await import('axios')).default) as unknown as Mock<(config: AxiosRequestConfig) => Promise<unknown>>;
  const oauth = vi.fn(async (_config: AxiosRequestConfig): Promise<unknown> => tokenResponse('token-1'));
  const organization = vi.fn(async (_config: AxiosRequestConfig): Promise<unknown> => organizationResponse(
    process.env.VPCS_SALESFORCE_ORG_ID,
    process.env.VPCS_SALESFORCE_PROFILE === 'webdev',
  ));

  axios.mockReset();
  axios.mockImplementation((config) => config.method === 'post' ? oauth(config) : organization(config));
  return { ...(await import('@/services/salesForceTokenService')), oauth, organization };
}

describe('getSalesforceToken', () => {
  beforeEach(() => {
    stubWebdevEnv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('sends the password grant in the POST body and verifies the Organization before returning', async () => {
    stubProductionEnv();
    const { getVerifiedSalesforceSession, oauth, organization } = await loadFresh();

    vi.stubEnv('SALESFORCE_CLIENT_ID', 'cid');
    vi.stubEnv('SALESFORCE_CLIENT_SECRET', 'secret&with+reserved%chars');
    vi.stubEnv('SALESFORCE_USERNAME', 'user@example.invalid');
    vi.stubEnv('SALESFORCE_PASSWORD', 'pw');
    vi.stubEnv('SALESFORCE_TOKEN', 'tok');

    expect(await getVerifiedSalesforceSession()).toMatchObject({
      instanceUrl: productionEnv.VPCS_SALESFORCE_BASE_URL, token: 'token-1',
    });

    expect(oauth).toHaveBeenCalledTimes(1);
    const arg = oauth.mock.calls[0]![0];
    expect(arg.url).toBe(`${productionEnv.SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token`);
    expect(arg.maxRedirects).toBe(0);
    expect(arg.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(arg.data).toBeInstanceOf(URLSearchParams);
    expect(Object.fromEntries(arg.data)).toEqual({
      grant_type: 'password',
      client_id: 'cid',
      client_secret: 'secret&with+reserved%chars',
      username: 'user@example.invalid',
      password: 'pwtok',
    });

    expect(organization).toHaveBeenCalledTimes(1);
    const orgRequest = organization.mock.calls[0]![0];
    expect(orgRequest).toMatchObject({ method: 'get', maxRedirects: 0, headers: { Authorization: 'Bearer token-1' } });
    expect(new URL(orgRequest.url ?? '').searchParams.get('q')).toBe('SELECT Id, IsSandbox FROM Organization');
  });

  it('uses the client credentials grant without sending password or username', async () => {
    vi.stubEnv('SALESFORCE_AUTH_GRANT', 'client_credentials');
    const { getSalesforceToken, oauth } = await loadFresh();

    await getSalesforceToken();

    expect(oauth).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(oauth.mock.calls[0]![0].data)).toEqual({
      grant_type: 'client_credentials',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
    });
  });

  it('caches the verified token so a second call does not repeat either request', async () => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();

    expect(await getSalesforceToken()).toBe('token-1');
    expect(await getSalesforceToken()).toBe('token-1');
    expect(oauth).toHaveBeenCalledTimes(1);
    expect(organization).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh verified OAuth request when forceRefresh is set', async () => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();
    oauth.mockResolvedValueOnce(tokenResponse('token-1')).mockResolvedValueOnce(tokenResponse('token-2'));

    expect(await getSalesforceToken()).toBe('token-1');
    expect(await getSalesforceToken({ forceRefresh: true })).toBe('token-2');
    expect(oauth).toHaveBeenCalledTimes(2);
    expect(organization).toHaveBeenCalledTimes(2);
  });

  it('refetches once the cached token passes its TTL', async () => {
    const { getSalesforceToken, oauth } = await loadFresh();
    oauth.mockResolvedValueOnce(tokenResponse('token-1')).mockResolvedValueOnce(tokenResponse('token-2'));

    expect(await getSalesforceToken()).toBe('token-1');
    vi.advanceTimersByTime(56 * 60 * 1000);
    expect(await getSalesforceToken()).toBe('token-2');
    expect(oauth).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent cold-cache calls into a single verified token request', async () => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();

    const results = await Promise.all(Array.from({ length: 5 }, () => getSalesforceToken()));

    expect(results).toEqual(Array(5).fill('token-1'));
    expect(oauth).toHaveBeenCalledTimes(1);
    expect(organization).toHaveBeenCalledTimes(1);
  });

  it('rejects on a non-200 response and clears in-flight so the next call retries', async () => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();
    oauth.mockResolvedValueOnce({ status: 500, data: {} });

    await expect(getSalesforceToken()).rejects.toThrow('Failed to FETCH Salesforce Token');
    expect(organization).not.toHaveBeenCalled();

    expect(await getSalesforceToken()).toBe('token-1');
    expect(oauth).toHaveBeenCalledTimes(2);
  });

  it('rejects another instance URL without sending the token anywhere', async () => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();
    oauth.mockResolvedValueOnce(tokenResponse('unverified-token', 'https://veteranpcs.my.salesforce.com'));

    await expect(getSalesforceToken()).rejects.toThrow('Failed to FETCH Salesforce Token');
    expect(organization).not.toHaveBeenCalled();
    expect(await getSalesforceToken()).toBe('token-1');
  });

  it.each([
    organizationResponse('00D000000000020'),
    organizationResponse(WEBDEV_ORG, false),
    { status: 200, data: { records: [] } },
    { status: 302, data: { records: [{ Id: WEBDEV_ORG, IsSandbox: true }] } },
  ])('rejects unverified Organization responses without caching the token %#', async (invalidResponse) => {
    const { getSalesforceToken, oauth, organization } = await loadFresh();
    oauth.mockResolvedValueOnce(tokenResponse('unverified-token')).mockResolvedValueOnce(tokenResponse('verified-token'));
    organization.mockResolvedValueOnce(invalidResponse);

    await expect(getSalesforceToken()).rejects.toThrow('Failed to FETCH Salesforce Token');
    expect(await getSalesforceToken()).toBe('verified-token');
    expect(oauth).toHaveBeenCalledTimes(2);
    expect(organization).toHaveBeenCalledTimes(2);
  });

  it('checks the environment before constructing the credential request', async () => {
    vi.stubEnv('SALESFORCE_LOGIN_BASE_URL', 'https://login.salesforce.com');
    const { getSalesforceToken, oauth, organization } = await loadFresh();

    await expect(getSalesforceToken()).rejects.toMatchObject({ name: 'SalesforceConfigurationError' });
    expect(oauth).not.toHaveBeenCalled();
    expect(organization).not.toHaveBeenCalled();
  });
});
