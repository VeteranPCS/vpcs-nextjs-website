import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/stateService', () => {
  const fetchStateList = vi.fn();
  const fetchAgentsListByState = vi.fn();
  const fetchLendersListByState = vi.fn();
  const fetchStateDetails = vi.fn();
  return {
    default: {
      fetchStateList,
      fetchAgentsListByState,
      fetchLendersListByState,
      fetchStateDetails,
    },
  };
});

import stateService from '@/services/stateService';
import { dataTools } from '@/lib/ai/tools/data-tools';

// Tool `execute` is typed as `T | AsyncIterable<T>` in AI SDK 6 to allow
// streaming-tool returns; ours are always plain promises, so narrow once.
import type { ToolCallOptions } from 'ai';

// AI SDK 6 tool `execute` is loosely typed as `T | AsyncIterable<T> | PromiseLike<T>`
// to allow streaming-tool returns; ours are always plain promises, so narrow once.
type ToolExec<TArgs, TOut> = (
  args: TArgs,
  opts: ToolCallOptions,
) => TOut | AsyncIterable<TOut> | PromiseLike<TOut>;

async function runTool<TArgs, TOut>(
  fn: ToolExec<TArgs, TOut>,
  args: TArgs,
): Promise<TOut> {
  const res = await fn(args, { toolCallId: 't', messages: [] });
  if (res !== null && typeof res === 'object' && Symbol.asyncIterator in (res as object)) {
    throw new Error('Tool returned an async iterable; expected a single result.');
  }
  return res as TOut;
}

const fakeStates = [
  {
    _id: 'tx',
    short_name: 'TX',
    state_name: 'Texas',
    state_slug: { current: 'texas', _type: 'slug' as const },
  },
  {
    _id: 'fl',
    short_name: 'FL',
    state_name: 'Florida',
    state_slug: { current: 'florida', _type: 'slug' as const },
  },
];

const fakeAgents = {
  totalSize: 2,
  done: true,
  records: [
    {
      Name: 'Jane Doe',
      AccountId_15__c: '001A',
      FirstName: 'Jane',
      LastName: 'Doe',
      Agent_Bio__pc: '',
      Military_Status__pc: 'Veteran',
      Military_Service__pc: 'Army',
      Brokerage_Name__pc: 'Acme Realty',
      BillingAddress: { city: 'Austin', state: 'TX' },
      BillingStateCode: 'TX',
      State_s_Licensed_in__pc: 'TX',
    },
    {
      Name: 'John Smith',
      AccountId_15__c: '001B',
      FirstName: 'John',
      LastName: 'Smith',
      Agent_Bio__pc: '',
      Military_Status__pc: 'Spouse',
      Military_Service__pc: 'Navy',
      Brokerage_Name__pc: 'Hill Country Homes',
      BillingAddress: { city: 'San Antonio', state: 'TX' },
      BillingStateCode: 'TX',
      State_s_Licensed_in__pc: 'TX',
    },
  ],
};

const fakeLenders = {
  totalSize: 1,
  done: true,
  records: [
    {
      Name: 'Lender A',
      AccountId_15__c: '002A',
      FirstName: 'Pat',
      Agent_Bio__pc: '',
      Military_Status__pc: 'Veteran',
      Military_Service__pc: 'Marines',
      Brokerage_Name__pc: 'VetLend',
      BillingCity: 'Houston',
      BillingState: 'TX',
      Individual_NMLS_ID__pc: '12345',
      Company_NMLS_ID__pc: '67890',
    },
  ],
};

beforeEach(() => {
  vi.mocked(stateService.fetchStateList).mockReset().mockResolvedValue(fakeStates as never);
  vi.mocked(stateService.fetchAgentsListByState).mockReset().mockResolvedValue(fakeAgents as never);
  vi.mocked(stateService.fetchLendersListByState).mockReset().mockResolvedValue(fakeLenders as never);
});

describe('getAgentsForState', () => {
  it('returns agents for full state name "Texas"', async () => {
    const res = await runTool(dataTools.getAgentsForState.execute!, { state: 'Texas' });
    if (!res.ok) throw new Error(`expected ok, got error: ${res.error}`);
    expect(res.data.stateName).toBe('Texas');
    expect(res.data.stateSlug).toBe('texas');
    expect(res.data.agents.length).toBe(2);
    expect(res.data.agents[0].name).toBe('Jane Doe');
  });

  it('passes short_name (TX) to fetchAgentsListByState, not the full state name', async () => {
    await runTool(dataTools.getAgentsForState.execute!, { state: 'Texas' });
    expect(stateService.fetchAgentsListByState).toHaveBeenCalledWith(
      'TX',
      expect.objectContaining({ requireHeadshot: false }),
    );
  });

  it('handles lowercase state input', async () => {
    const res = await runTool(dataTools.getAgentsForState.execute!, { state: 'texas' });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.stateName).toBe('Texas');
  });

  it('handles short-code state input ("TX")', async () => {
    const res = await runTool(dataTools.getAgentsForState.execute!, { state: 'TX' });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.stateSlug).toBe('texas');
    expect(stateService.fetchAgentsListByState).toHaveBeenCalledWith(
      'TX',
      expect.objectContaining({ requireHeadshot: false }),
    );
  });

  it('returns a clean error for unknown states', async () => {
    const res = await runTool(dataTools.getAgentsForState.execute!, { state: 'Atlantis' });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected error');
    expect(res.error).toMatch(/Atlantis/);
  });
});

describe('getLendersForState', () => {
  it('returns lenders and passes short_name to the SOQL call', async () => {
    const res = await runTool(dataTools.getLendersForState.execute!, { state: 'Texas' });
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.stateName).toBe('Texas');
    expect(res.data.lenders.length).toBe(1);
    expect(stateService.fetchLendersListByState).toHaveBeenCalledWith(
      'TX',
      expect.objectContaining({ requireHeadshot: false }),
    );
  });
});

describe('listStates', () => {
  it('returns the full state list (state_name no longer dropped by projection bug)', async () => {
    const res = await runTool(dataTools.listStates.execute!, {});
    if (!res.ok) throw new Error('expected ok');
    expect(res.data.states.map((s) => s.name).sort()).toEqual(['Florida', 'Texas']);
  });
});
