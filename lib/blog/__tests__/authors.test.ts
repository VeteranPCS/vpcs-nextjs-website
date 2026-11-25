import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { stubProductionEnv, stubWebdevEnv, WEBDEV_ORIGIN } from '@/lib/salesforce/__tests__/configuration-fixtures';

vi.mock('server-only', () => ({}));

const { cachedAuthors } = vi.hoisted(() => ({ cachedAuthors: new Map<string, Promise<unknown>>() }));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: string[]) => Promise<unknown>, keyParts: string[]) => (...args: string[]) => {
    const key = JSON.stringify([...keyParts, ...args]);
    const existing = cachedAuthors.get(key);
    if (existing) return existing;
    const result = fn(...args);
    cachedAuthors.set(key, result);
    return result;
  },
}));

vi.mock('@/services/api', () => ({
  RequestType: {
    GET: 'get',
  },
  salesForceAPIWithRefresh: vi.fn(),
}));

import { salesForceAPIWithRefresh } from '@/services/api';
import { resolveAuthor } from '@/lib/blog/authors';

const AGENT_ID = '001AGENT0000001';
const LENDER_ID = '001LENDER000001';
const MARYLAND_AGENT_ID = '001MARYLAND0001';

function queryResponse(records: unknown[]) {
  return {
    status: 200,
    data: {
      records,
    },
  };
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    Id: AGENT_ID,
    AccountId_15__c: AGENT_ID,
    FirstName: 'Test',
    LastName: 'Agent',
    Military_Status__pc: 'Veteran',
    Brokerage_Name__pc: 'Solid Oak Realty',
    BillingStateCode: 'CO',
    BillingAddress: { city: 'Colorado Springs', state: 'Colorado' },
    isAgent__pc: true,
    isLender__pc: false,
    Active_on_Website__pc: true,
    ...overrides,
  };
}

describe('resolveAuthor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cachedAuthors.clear();
    stubProductionEnv();
  });

  it('resolves an active agent and builds a specific contact-agent URL', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(
      queryResponse([account()]) as never,
    );

    const author = await resolveAuthor({ salesforceId: AGENT_ID });

    expect(author.kind).toBe('salesforce');
    expect(author.name).toBe('Test Agent');
    expect(author.role).toBe('agent');
    expect(author.contactHref).toBe(
      `/contact-agent?form=agent&fn=Test&id=${AGENT_ID}&state=colorado`,
    );
  });

  it('preserves lender authors with the contact-lender flow', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(
      queryResponse([
        account({
          Id: LENDER_ID,
          AccountId_15__c: LENDER_ID,
          FirstName: 'Lee',
          LastName: 'Lender',
          BillingStateCode: 'HI',
          BillingAddress: { city: 'Honolulu', state: 'Hawaii' },
          isAgent__pc: false,
          isLender__pc: true,
        }),
      ]) as never,
    );

    const author = await resolveAuthor({ salesforceId: LENDER_ID });

    expect(author.kind).toBe('salesforce');
    expect(author.role).toBe('lender');
    expect(author.contactHref).toBe(
      `/contact-lender?form=lender&fn=Lee&id=${LENDER_ID}&state=hawaii`,
    );
  });

  it.each([
    { isLender: false, folder: 'agents' },
    { isLender: true, folder: 'lenders' },
  ])('prefers the $folder portrait when both roles have a file', async ({ isLender, folder }) => {
    vi.spyOn(fs, 'existsSync').mockImplementation((file) =>
      ['agents', 'lenders'].some((role) =>
        file === path.join(process.cwd(), 'public/images', role, `${AGENT_ID}.webp`),
      ),
    );
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(
      queryResponse([account({ isLender__pc: isLender })]) as never,
    );

    expect((await resolveAuthor({ salesforceId: AGENT_ID })).headshotPath)
      .toBe(`/images/${folder}/${AGENT_ID}.webp`);
  });

  it('finds an author portrait in the secondary folder', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((file) =>
      file === path.join(process.cwd(), 'public/images/lenders', `${AGENT_ID}.jpg`),
    );
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(queryResponse([account()]) as never);

    expect((await resolveAuthor({ salesforceId: AGENT_ID })).headshotPath)
      .toBe(`/images/lenders/${AGENT_ID}.jpg`);
  });

  it('falls back to VeteranPCS when a Salesforce author is inactive', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(
      queryResponse([
        account({
          Active_on_Website__pc: false,
        }),
      ]) as never,
    );

    const author = await resolveAuthor({
      salesforceId: AGENT_ID,
      name: 'Stale Frontmatter Name',
    });

    expect(author.kind).toBe('fallback');
    expect(author.name).toBe('VeteranPCS');
    expect(author.salesforceId).toBeNull();
    expect(author.contactHref).toBe('/contact-agent');
    expect(salesForceAPIWithRefresh).toHaveBeenCalledTimes(1);
  });

  it('falls back to VeteranPCS when the Salesforce author is missing', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(queryResponse([]) as never);

    const author = await resolveAuthor({
      salesforceId: AGENT_ID,
      name: 'Stale Frontmatter Name',
    });

    expect(author.kind).toBe('fallback');
    expect(author.name).toBe('VeteranPCS');
    expect(author.contactHref).toBe('/contact-agent');
    expect(salesForceAPIWithRefresh).toHaveBeenCalledTimes(1);
  });

  it('uses a post state override when the Salesforce billing state differs', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce(
      queryResponse([
        account({
          Id: MARYLAND_AGENT_ID,
          AccountId_15__c: MARYLAND_AGENT_ID,
          FirstName: 'Mary',
          LastName: 'Market',
          BillingStateCode: 'VA',
          BillingAddress: { city: 'Alexandria', state: 'Virginia' },
        }),
      ]) as never,
    );

    const author = await resolveAuthor({
      salesforceId: MARYLAND_AGENT_ID,
      stateSlug: 'maryland',
    });

    expect(author.kind).toBe('salesforce');
    expect(author.state).toBe('VA');
    expect(author.stateSlug).toBe('maryland');
    expect(author.contactHref).toBe(
      `/contact-agent?form=agent&fn=Mary&id=${MARYLAND_AGENT_ID}&state=maryland`,
    );
  });

  it('does not reuse the cached production identity in a sandbox with a matching account ID', async () => {
    vi.mocked(salesForceAPIWithRefresh)
      .mockResolvedValueOnce(queryResponse([account({ FirstName: 'Production' })]) as never)
      .mockResolvedValueOnce(queryResponse([account({ FirstName: 'Sandbox' })]) as never);

    const input = { salesforceId: AGENT_ID };
    expect((await resolveAuthor(input)).name).toBe('Production Agent');
    stubWebdevEnv();
    expect((await resolveAuthor(input)).name).toBe('Sandbox Agent');
    stubProductionEnv();
    expect((await resolveAuthor(input)).name).toBe('Production Agent');

    expect(salesForceAPIWithRefresh).toHaveBeenCalledTimes(2);
    expect(salesForceAPIWithRefresh).toHaveBeenLastCalledWith(expect.objectContaining({
      endpoint: expect.stringContaining(`${WEBDEV_ORIGIN}/services/data/v62.0/query?`),
    }));
  });
});
