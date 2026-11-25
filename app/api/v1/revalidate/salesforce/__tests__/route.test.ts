import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/agentService', () => ({
  default: { getAgentState: vi.fn() },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import agentService from '@/services/agentService';
import { revalidatePath } from 'next/cache';
import { POST } from '@/app/api/v1/revalidate/salesforce/route';
import { stubProductionEnv, stubWebdevEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';

const SECRET = 'good-secret-value';

function request(signature: string, accountId = '001ABCDEFGHIJKL') {
  return new NextRequest('https://www.veteranpcs.com/api/v1/revalidate/salesforce', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Salesforce-Signature': signature,
    },
    body: JSON.stringify({ accountId }),
  });
}

describe('POST /api/v1/revalidate/salesforce', () => {
  beforeEach(() => {
    stubProductionEnv();
    vi.stubEnv('SALESFORCE_WEBHOOK_SECRET', SECRET);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  it('uses only a separate webhook credential on the protected WebDev preview', async () => {
    stubWebdevEnv({
      VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/salesforce-workflow-test',
      VPCS_SANDBOX_PREVIEW_PROTECTED: '1',
    });
    vi.stubEnv('VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET', SECRET);
    expect((await POST(request(SECRET))).status).toBe(401);

    vi.stubEnv('VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET', 'webdev-only-secret');
    vi.mocked(agentService.getAgentState).mockResolvedValue(['Texas']);
    expect((await POST(request('webdev-only-secret'))).status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith('/texas');
  });
});
