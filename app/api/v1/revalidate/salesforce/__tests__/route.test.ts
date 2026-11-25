import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { AxiosResponse } from 'axios';

vi.mock('@/services/api', () => ({
  RequestType: { GET: 'get' },
  salesForceAPIWithRefresh: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import agentService from '@/services/agentService';
import { RequestType, salesForceAPIWithRefresh } from '@/services/api';
import { revalidatePath } from 'next/cache';
import { POST } from '@/app/api/v1/revalidate/salesforce/route';
import fixtures from '@/config/salesforce/webdev-fixtures.json';
import { stubProductionEnv, stubWebdevEnv, WEBDEV_ORIGIN, webdevMetadata } from '@/lib/salesforce/__tests__/configuration-fixtures';

const SECRET = 'good-secret-value';
const WEBDEV_SECRET = 'webdev-only-secret';
const RUN_ID = 'webdev-callback-test';
const NOW_MS = 1795636800000;
const FIXTURE_ID = '001jg000000V70U';

function request(
  signature: string, accountId = '001ABCDEFGHIJKL', origin = 'https://www.veteranpcs.com', run?: string,
) {
  return new NextRequest(`${origin}/api/v1/revalidate/salesforce`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Salesforce-Signature': signature,
      ...(run === undefined ? {} : { 'X-VPCS-Callback-Run': run }),
    },
    body: JSON.stringify({ accountId }),
  });
}

function stubCallback(overrides: Record<string, string | undefined> = {}) {
  stubWebdevEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'codex/salesforce-workflow-test',
    VPCS_SANDBOX_PREVIEW_PROTECTED: '1',
    VPCS_SALESFORCE_ORG_ID: fixtures.orgId,
    VPCS_SALESFORCE_METADATA_JSON: JSON.stringify({ ...webdevMetadata, orgId: fixtures.orgId }),
    VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET: WEBDEV_SECRET,
    VPCS_WEBDEV_SALESFORCE_WEBHOOK_WINDOW: `${RUN_ID}:${NOW_MS - 1000}:${NOW_MS + 1000}`,
    ...overrides,
  });
  vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
}

function callbackRequest({
  secret = WEBDEV_SECRET, id = FIXTURE_ID, host = 'https://test.veteranpcs.com', run = RUN_ID,
} = {}) {
  return request(secret, id, host, run);
}

function mockAgentLicenses(otherStates: string | null) {
  vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce({
    status: 200,
    data: { records: [{ State_s_Licensed_in__pc: 'CO', Other_States__pc: otherStates }] },
  } as AxiosResponse);
}

describe('POST /api/v1/revalidate/salesforce', () => {
  beforeEach(() => {
    vi.spyOn(agentService, 'getAgentState');
    vi.mocked(salesForceAPIWithRefresh).mockReset();
    stubProductionEnv();
    vi.stubEnv('SALESFORCE_WEBHOOK_SECRET', SECRET);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects a wrong secret of the same length (401) via the constant-time compare', async () => {
    const wrong = 'good-secret-WRONG'.slice(0, SECRET.length); // same length, different bytes
    expect(wrong.length).toBe(SECRET.length);

    const response = await POST(request(wrong));

    expect(response.status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret of a different length (401) without throwing', async () => {
    const response = await POST(request('short'));

    expect(response.status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
  });

  it('accepts the correct secret (200) and revalidates the agent state paths', async () => {
    vi.mocked(agentService.getAgentState).mockResolvedValue(['Texas']);

    const response = await POST(request(SECRET));

    expect(response.status).toBe(200);
    expect(agentService.getAgentState).toHaveBeenCalledWith('001ABCDEFGHIJKL');
    expect(revalidatePath).toHaveBeenCalledWith('/texas');
  });

  it('rejects inherited production credentials on an ordinary preview', async () => {
    stubWebdevEnv({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature-preview' });
    vi.stubEnv('VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET', 'webdev-only-secret');

    expect((await POST(request(SECRET))).status).toBe(401);
    expect((await POST(request('webdev-only-secret'))).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('uses just the WebDev secret and revalidates the exact fixture state', async () => {
    stubCallback();
    expect((await POST(callbackRequest({ secret: SECRET }))).status).toBe(401);
    vi.stubEnv('VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET', SECRET);
    expect((await POST(callbackRequest({ secret: SECRET }))).status).toBe(401);
    vi.stubEnv('VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET', WEBDEV_SECRET);

    mockAgentLicenses(null);
    expect((await POST(callbackRequest())).status).toBe(200);
    const soql = `SELECT State_s_Licensed_in__pc, Other_States__pc FROM Account WHERE AccountId_15__c = '${FIXTURE_ID}'`;
    expect(salesForceAPIWithRefresh).toHaveBeenCalledExactlyOnceWith({
      endpoint: `${WEBDEV_ORIGIN}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`,
      type: RequestType.GET,
    });
    expect(agentService.getAgentState).toHaveBeenCalledExactlyOnceWith(FIXTURE_ID);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/colorado');
  });

  it.each([
    { host: 'https://some-preview.vercel.app' },
    { host: 'http://test.veteranpcs.com' },
    { host: 'https://test.veteranpcs.com:8443' },
    { id: '001jg000000V70V' },
    { id: '001jg000000V70UAAS' },
    { run: 'other-run' },
    { run: '' },
  ])('rejects a callback outside the canary destination, account or marker', async (requestOverrides) => {
    stubCallback();
    expect((await POST(callbackRequest(requestOverrides))).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    `${RUN_ID}:${NOW_MS - 1000}:${NOW_MS}`,
    `${RUN_ID}:${NOW_MS + 1}:${NOW_MS + 1000}`,
    `${RUN_ID}:${NOW_MS}:${NOW_MS + 1_800_001}`,
    `${RUN_ID}:${NOW_MS - 1}:${NOW_MS + 1}:extra`,
  ])('rejects a missing, expired, premature or invalid window', async (window) => {
    stubCallback({ VPCS_WEBDEV_SALESFORCE_WEBHOOK_WINDOW: window });
    expect((await POST(callbackRequest())).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
  });

  it.each([
    { VERCEL_GIT_COMMIT_REF: 'another-preview' },
    { VPCS_SANDBOX_PREVIEW_PROTECTED: '0' },
  ])('requires the designated protected branch even with all callback inputs', async (environment) => {
    stubCallback(environment);
    expect((await POST(callbackRequest())).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
  });

  it('rejects other configured WebDev orgs before looking up the fixture', async () => {
    stubCallback({
      VPCS_SALESFORCE_ORG_ID: webdevMetadata.orgId,
      VPCS_SALESFORCE_METADATA_JSON: JSON.stringify(webdevMetadata),
    });
    expect((await POST(callbackRequest())).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
  });

  it('rejects a canary while WebDev website writes are enabled', async () => {
    stubCallback({ VPCS_SANDBOX_LEAD_WRITES: '1', VPCS_WEBDEV_ISOLATION_ATTESTED: '1' });
    expect((await POST(callbackRequest())).status).toBe(401);
    expect(agentService.getAgentState).not.toHaveBeenCalled();
  });

  it('rejects fixture license drift without revalidating other states', async () => {
    stubCallback();
    mockAgentLicenses('TX');
    expect((await POST(callbackRequest())).status).toBe(409);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
