import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/services/stateService', () => ({
  default: {
    fetchStateDetails: vi.fn(),
    fetchAgentsListByState: vi.fn(),
    fetchLendersListByState: vi.fn(),
  },
}));

import stateListJson from '@/content/_data/site/state_list.json';
import stateService, {
  type Agent,
  type AgentsData,
  type Lenders,
  type LendersData,
  type StateDetails,
} from '@/services/stateService';
import { fetchStatePageData } from '@/services/statePageService';

const emptyAgents = (): AgentsData => ({ totalSize: 0, done: true, records: [] });
const emptyLenders = (): LendersData => ({ totalSize: 0, done: true, records: [] });

function stateDetails(slug: string, code: string, name: string): StateDetails {
  return {
    _id: `state-${code}`,
    _type: 'state_list',
    _createdAt: '2026-01-01T00:00:00Z',
    _updatedAt: '2026-01-01T00:00:00Z',
    state_slug: { _type: 'slug', current: slug },
    short_name: code,
    state_name: name,
    state_map: null,
  };
}

function agent(code: string, stateName: string): Agent {
  return {
    Name: `${stateName} Agent`,
    AccountId_15__c: `001${code}AGENT`,
    FirstName: 'Test',
    LastName: 'Agent',
    Agent_Bio__pc: '',
    Military_Status__pc: '',
    Military_Service__pc: '',
    Brokerage_Name__pc: '',
    BillingAddress: { state: code },
    BillingStateCode: code,
    State_s_Licensed_in__pc: code,
    Area_Assignments__r: {
      records: [{
        Id: `area-${code}`,
        Name: `${stateName} Metro`,
        AA_Score__c: 10,
        Area__r: { Name: `${stateName} Metro`, State__c: stateName },
      }],
    },
  };
}

function lender(id: string, score: number): Lenders {
  return {
    Name: `Lender ${id}`,
    AccountId_15__c: id,
    FirstName: 'Test',
    Agent_Bio__pc: '',
    Military_Status__pc: '',
    Military_Service__pc: '',
    Brokerage_Name__pc: '',
    BillingCity: null,
    BillingState: 'Texas',
    Individual_NMLS_ID__pc: '',
    Company_NMLS_ID__pc: '',
    Area_Assignments__r: {
      records: [{
        Id: `area-${id}`,
        Name: 'Austin',
        AA_Score__c: score,
        Area__r: { Name: 'Austin', State__c: 'Texas' },
      }],
    },
  };
}

describe('fetchStatePageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stateService.fetchAgentsListByState).mockResolvedValue(emptyAgents());
    vi.mocked(stateService.fetchLendersListByState).mockResolvedValue(emptyLenders());
  });

  it('routes every configured state slug through its two-letter Salesforce code', async () => {
    for (const state of stateListJson) {
      vi.mocked(stateService.fetchStateDetails).mockResolvedValueOnce(
        stateDetails(state.state_slug.current, state.short_name, state.state_name),
      );

      const result = await fetchStatePageData(state.state_slug.current);

      expect(result.stateCode).toBe(state.short_name);
      expect(stateService.fetchAgentsListByState).toHaveBeenLastCalledWith(state.short_name);
      expect(stateService.fetchLendersListByState).toHaveBeenLastCalledWith(state.short_name);
    }

    expect(stateListJson).toHaveLength(52);
  });

  it.each([
    ['texas', 'TX', 'Texas'],
    ['washington', 'WA', 'Washington'],
  ])('groups %s agents when Salesforce area state uses the full name', async (slug, code, name) => {
    const matchingAgent = agent(code, name);
    vi.mocked(stateService.fetchStateDetails).mockResolvedValue(stateDetails(slug, code, name));
    vi.mocked(stateService.fetchAgentsListByState).mockResolvedValue({
      totalSize: 1,
      done: true,
      records: [matchingAgent],
    });

    const result = await fetchStatePageData(slug);

    expect(result.agentGroups[`${name} Metro`]?.[0]?.AccountId_15__c).toBe(
      matchingAgent.AccountId_15__c,
    );
  });

  it('sorts lenders by in-state score without mutating the Salesforce response', async () => {
    const low = lender('001LOW', 2);
    const high = lender('001HIGH', 9);
    const originalRecords = [low, high];
    vi.mocked(stateService.fetchStateDetails).mockResolvedValue(
      stateDetails('texas', 'TX', 'Texas'),
    );
    vi.mocked(stateService.fetchLendersListByState).mockResolvedValue({
      totalSize: 2,
      done: true,
      records: originalRecords,
    });

    const result = await fetchStatePageData('texas');

    expect(result.lendersData.records.map((record) => record.AccountId_15__c)).toEqual([
      '001HIGH',
      '001LOW',
    ]);
    expect(originalRecords).toEqual([low, high]);
    expect(result.lendersData.records[0]).not.toHaveProperty('currentStateScore');
  });

  it('preserves a successful, legitimate empty partner result', async () => {
    vi.mocked(stateService.fetchStateDetails).mockResolvedValue(
      stateDetails('puerto-rico', 'PR', 'Puerto Rico'),
    );

    const result = await fetchStatePageData('puerto-rico');

    expect(result.agentsData.records).toEqual([]);
    expect(result.lendersData.records).toEqual([]);
    expect(result.agentGroups).toEqual({});
  });

  it.each(['agents', 'lenders'])('rejects instead of converting a %s failure to empty data', async (role) => {
    vi.mocked(stateService.fetchStateDetails).mockResolvedValue(
      stateDetails('texas', 'TX', 'Texas'),
    );
    const failure = new Error(`${role} unavailable`);
    if (role === 'agents') {
      vi.mocked(stateService.fetchAgentsListByState).mockRejectedValue(failure);
    } else {
      vi.mocked(stateService.fetchLendersListByState).mockRejectedValue(failure);
    }

    await expect(fetchStatePageData('texas')).rejects.toBe(failure);
  });
});
