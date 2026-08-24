import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/services/stateService', () => ({
  default: { fetchStateList: vi.fn() },
}));
vi.mock('@/services/statePageService', () => ({
  fetchStatePageData: vi.fn(),
}));

import { fetchStatePageData } from '@/services/statePageService';
import stateService from '@/services/stateService';
import { generateStaticParams, GET } from '@/app/[state]/llms.txt/route';

const stateDetails = {
  _id: 'state-TX',
  _type: 'state_list' as const,
  _createdAt: '2026-01-01T00:00:00Z',
  _updatedAt: '2026-01-01T00:00:00Z',
  state_slug: { _type: 'slug' as const, current: 'texas' },
  short_name: 'TX',
  state_name: 'Texas',
  state_map: null,
};

describe('GET /[state]/llms.txt', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('skips Salesforce-backed prerendering only when the CI build flag is explicit', async () => {
    vi.stubEnv('SKIP_SALESFORCE_PRERENDER', '1');

    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(stateService.fetchStateList).not.toHaveBeenCalled();
  });

  it('still resolves configured state params in credentialed builds', async () => {
    vi.mocked(stateService.fetchStateList).mockResolvedValue([stateDetails]);

    await expect(generateStaticParams()).resolves.toEqual([{ state: 'texas' }]);
  });

  it('returns 404 for an unknown state without querying Salesforce', async () => {
    const response = await GET(new Request('https://example.com/not-a-state/llms.txt'), {
      params: Promise.resolve({ state: 'not-a-state' }),
    });

    expect(response.status).toBe(404);
    expect(fetchStatePageData).not.toHaveBeenCalled();
  });

  it('propagates partner loading failures instead of caching an empty digest', async () => {
    const failure = new Error('Salesforce unavailable');
    vi.mocked(fetchStatePageData).mockRejectedValue(failure);

    await expect(GET(new Request('https://example.com/texas/llms.txt'), {
      params: Promise.resolve({ state: 'texas' }),
    })).rejects.toBe(failure);
  });

  it('renders successful partner counts', async () => {
    vi.mocked(fetchStatePageData).mockResolvedValue({
      stateDetails,
      stateCode: 'TX',
      agentsData: { totalSize: 0, done: true, records: [] },
      lendersData: { totalSize: 0, done: true, records: [] },
      agentGroups: {},
    });

    const response = await GET(new Request('https://example.com/texas/llms.txt'), {
      params: Promise.resolve({ state: 'texas' }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('## Agents (0)');
    expect(body).toContain('## Lenders (0)');
  });
});
