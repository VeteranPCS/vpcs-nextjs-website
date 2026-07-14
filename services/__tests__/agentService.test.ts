import { afterEach, describe, expect, it, vi } from 'vitest';

// Stub the Salesforce transport so importing agentService pulls in no network
// side effects; we only drive getAgentState here.
vi.mock('@/services/api', () => ({
  RequestType: { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete' },
  salesForceAPIWithRefresh: vi.fn(),
}));

// agentService now imports lib/content/homepage, whose `server-only` guard
// throws outside a React Server environment; neutralize it for Vitest.
vi.mock('server-only', () => ({}));

import agentService from '@/services/agentService';
import { salesForceAPIWithRefresh } from '@/services/api';

const mockedApi = vi.mocked(salesForceAPIWithRefresh);

describe('agentService.getAgentState', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an injection-shaped accountId before it reaches the query builder', async () => {
    await expect(agentService.getAgentState("001' OR Name != '")).rejects.toThrow(
      'Invalid Salesforce ID.',
    );
    // The shape-check must short-circuit before any Salesforce call.
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it('rejects an id of the wrong length', async () => {
    await expect(agentService.getAgentState('tooShort')).rejects.toThrow('Invalid Salesforce ID.');
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it('accepts a valid 15-char id and passes the escaped value into the SOQL query', async () => {
    mockedApi.mockResolvedValue({
      status: 200,
      data: { records: [{ State_s_Licensed_in__pc: 'TX', Other_States__pc: '' }] },
    } as any);

    const result = await agentService.getAgentState('001ABCDEFGHIJKL');

    expect(mockedApi).toHaveBeenCalledTimes(1);
    const endpoint = mockedApi.mock.calls[0]![0].endpoint as string;
    const soql = decodeURIComponent(endpoint);
    expect(soql).toContain("AccountId_15__c = '001ABCDEFGHIJKL'");
    // 'TX' resolves to a single mapped state; exact slug value is incidental here.
    expect(result).toHaveLength(1);
  });
});
