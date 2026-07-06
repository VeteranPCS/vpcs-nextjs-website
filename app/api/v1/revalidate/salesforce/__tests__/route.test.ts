import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/agentService', () => ({
  default: { getAgentState: vi.fn() },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import agentService from '@/services/agentService';
import { revalidatePath } from 'next/cache';
import { POST } from '@/app/api/v1/revalidate/salesforce/route';

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
});
