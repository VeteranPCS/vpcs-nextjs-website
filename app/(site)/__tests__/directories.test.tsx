import React from 'react';
import { connection } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import stateService from '@/services/stateService';
import AgentsPage, { revalidate as agentsRevalidate } from '../agents/page';
import LendersPage, { revalidate as lendersRevalidate } from '../lenders/page';

vi.mock('next/server', () => ({ connection: vi.fn() }));
vi.mock('@/services/stateService', () => ({ default: {
  fetchStateList: vi.fn(), fetchAgentsListByState: vi.fn(), fetchLendersListByState: vi.fn(),
} }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const states = [
  { short_name: 'TX', state_name: 'Texas', state_slug: { current: 'texas' } },
  { short_name: 'CO', state_name: 'Colorado', state_slug: { current: 'colorado' } },
];
const records = [
  { AccountId_15__c: 'b', Name: 'Zelda Example', Brokerage_Name__pc: 'Test Realty' },
  { AccountId_15__c: 'a', Name: 'Alice Example', Brokerage_Name__pc: 'Test Realty' },
  { AccountId_15__c: 'a', Name: 'Duplicate Example' },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SKIP_SALESFORCE_PRERENDER', '');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
  vi.mocked(stateService.fetchStateList).mockResolvedValue(states as never);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each([
  ['agents', AgentsPage, stateService.fetchAgentsListByState, agentsRevalidate],
  ['lenders', LendersPage, stateService.fetchLendersListByState, lendersRevalidate],
] as const)('%s directory', (kind, Page, fetchRecords, revalidate) => {
  it('retains sorting, deduplication, links and 24-hour revalidation', async () => {
    vi.mocked(fetchRecords).mockResolvedValue({ records } as never);
    const html = renderToStaticMarkup(await Page());
    expect(revalidate).toBe(86400);
    expect(connection).not.toHaveBeenCalled();
    expect(html.indexOf('Colorado')).toBeLessThan(html.indexOf('Texas'));
    expect(html.indexOf('Alice Example')).toBeLessThan(html.indexOf('Zelda Example'));
    expect(html).not.toContain('Duplicate Example');
    expect(html).toContain('href="/colorado"');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('defers credential-free builds before any reads, then loads real request data', async () => {
    vi.stubEnv('SKIP_SALESFORCE_PRERENDER', '1');
    let resume!: () => void; // The Promise executor assigns this synchronously.
    vi.mocked(connection).mockReturnValue(new Promise<void>((resolve) => { resume = resolve; }));
    vi.mocked(fetchRecords).mockResolvedValue({ records } as never);
    const pending = Page();
    expect(connection).toHaveBeenCalledOnce();
    expect(stateService.fetchStateList).not.toHaveBeenCalled();
    expect(fetchRecords).not.toHaveBeenCalled();
    resume();
    expect(renderToStaticMarkup(await pending)).toContain('Alice Example');
    expect(fetchRecords).toHaveBeenCalledTimes(states.length);
  });

  it('lets the framework stop prerendering without fetching or returning empty success', async () => {
    vi.stubEnv('SKIP_SALESFORCE_PRERENDER', '1');
    vi.mocked(connection).mockRejectedValue(new Error('Framework prerender bailout'));
    await expect(Page()).rejects.toThrow('Framework prerender bailout');
    expect(stateService.fetchStateList).not.toHaveBeenCalled();
    expect(fetchRecords).not.toHaveBeenCalled();
  });

  it('still rejects Salesforce failures after a deferred request begins', async () => {
    vi.stubEnv('SKIP_SALESFORCE_PRERENDER', '1');
    vi.mocked(connection).mockResolvedValue(undefined);
    vi.mocked(fetchRecords).mockRejectedValue(new Error('CRM outage'));
    await expect(Page()).rejects.toThrow('CRM outage');
  });

  it('renders a genuine empty result normally', async () => {
    vi.mocked(fetchRecords).mockResolvedValue({ records: [] } as never);
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain(kind === 'agents' ? 'No agents are listed' : 'No lenders are currently listed');
  });

  it.each([undefined, {}, { records: null }, { records: {} }])('rejects malformed response %j', async (data) => {
    vi.mocked(fetchRecords).mockResolvedValue(data as never);
    await expect(Page()).rejects.toThrow('Invalid');
  });

  it('rejects one failed state instead of rendering a partial directory', async () => {
    vi.mocked(fetchRecords).mockResolvedValueOnce({ records } as never).mockRejectedValueOnce(new Error('Salesforce unavailable'));
    await expect(Page()).rejects.toThrow('Salesforce unavailable');
  });

  it('rejects complete query and state-list outages', async () => {
    vi.mocked(fetchRecords).mockRejectedValue(new Error('CRM outage'));
    await expect(Page()).rejects.toThrow('CRM outage');
    vi.mocked(stateService.fetchStateList).mockRejectedValue(new Error('state list unavailable'));
    await expect(Page()).rejects.toThrow('state list unavailable');
  });
});
