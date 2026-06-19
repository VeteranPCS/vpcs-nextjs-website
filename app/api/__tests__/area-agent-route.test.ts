import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

vi.mock('@/services/stateService', () => ({
  default: {
    fetchAgentsListByState: vi.fn(),
  },
}));

import stateService from '@/services/stateService';
import { GET } from '@/app/api/v1/states/[state]/area-agent/route';

function request(path: string) {
  return new NextRequest(`https://www.veteranpcs.com${path}`);
}

function agent(score: number, firstName = 'Alex') {
  return {
    Name: `${firstName} Agent`,
    FirstName: firstName,
    AccountId_15__c: `001${firstName}`,
    Area_Assignments__r: {
      records: [
        {
          Id: `area-${score}`,
          Name: 'Raleigh',
          AA_Score__c: score,
          Area__r: { Name: 'Raleigh', State__c: 'North Carolina' },
        },
      ],
    },
  };
}

describe('area-agent route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a top agent for a valid state slug and area', async () => {
    vi.mocked(stateService.fetchAgentsListByState).mockResolvedValueOnce({
      records: [agent(3, 'Lower'), agent(9, 'Higher')],
    } as any);

    const response = await GET(request('/api/v1/states/north-carolina/area-agent?area=raleigh'), {
      params: Promise.resolve({ state: 'north-carolina' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(stateService.fetchAgentsListByState).toHaveBeenCalledWith('NC', { requireHeadshot: false });
    expect(body).toEqual({
      success: true,
      data: {
        firstName: 'Higher',
        salesforceId: '001Higher',
        stateSlug: 'north-carolina',
        contactHref: '/contact-agent?form=agent&fn=Higher&id=001Higher&state=north-carolina',
      },
    });
  });

  it('returns pinned error shapes for invalid input and misses', async () => {
    const invalidState = await GET(request('/api/v1/states/nope/area-agent?area=raleigh'), {
      params: Promise.resolve({ state: 'nope' }),
    });
    expect(invalidState.status).toBe(400);
    expect(await invalidState.json()).toEqual({ success: false, error: 'Invalid state' });

    const missingArea = await GET(request('/api/v1/states/north-carolina/area-agent'), {
      params: Promise.resolve({ state: 'north-carolina' }),
    });
    expect(missingArea.status).toBe(400);
    expect(await missingArea.json()).toEqual({ success: false, error: 'Area parameter is required' });

    const invalidArea = await GET(request('/api/v1/states/north-carolina/area-agent?area=Raleigh!'), {
      params: Promise.resolve({ state: 'north-carolina' }),
    });
    expect(invalidArea.status).toBe(400);
    expect(await invalidArea.json()).toEqual({ success: false, error: 'Invalid area' });

    vi.mocked(stateService.fetchAgentsListByState).mockResolvedValueOnce({ records: [] } as any);
    const noAgent = await GET(request('/api/v1/states/north-carolina/area-agent?area=raleigh'), {
      params: Promise.resolve({ state: 'north-carolina' }),
    });
    expect(noAgent.status).toBe(404);
    expect(await noAgent.json()).toEqual({ success: false, error: 'No agent found for area' });
  });

  it('returns 503 when Salesforce lookup fails', async () => {
    vi.mocked(stateService.fetchAgentsListByState).mockRejectedValueOnce(new Error('SF down'));

    const response = await GET(request('/api/v1/states/north-carolina/area-agent?area=raleigh'), {
      params: Promise.resolve({ state: 'north-carolina' }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'Coverage lookup unavailable' });
  });
});
