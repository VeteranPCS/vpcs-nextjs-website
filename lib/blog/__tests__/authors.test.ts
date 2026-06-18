import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: any[]) => any>(fn: T) => fn,
}));

vi.mock('@/constants/api', () => ({
  SALESFORCE_BASE_URL: 'https://sf.example.test',
  SALESFORCE_API_VERSION: 'v62.0',
}));

vi.mock('@/services/api', () => ({
  RequestType: {
    GET: 'get',
  },
  salesForceAPI: vi.fn(),
}));

vi.mock('@/services/salesForceTokenService', () => ({
  getSalesforceToken: vi.fn(),
}));

import { salesForceAPI } from '@/services/api';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves an active agent and builds a specific contact-agent URL', async () => {
    vi.mocked(salesForceAPI).mockResolvedValueOnce(
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
    vi.mocked(salesForceAPI).mockResolvedValueOnce(
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

  it('falls back to VeteranPCS when a Salesforce author is inactive', async () => {
    vi.mocked(salesForceAPI).mockResolvedValueOnce(
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
    expect(salesForceAPI).toHaveBeenCalledTimes(1);
  });

  it('falls back to VeteranPCS when the Salesforce author is missing', async () => {
    vi.mocked(salesForceAPI).mockResolvedValueOnce(queryResponse([]) as never);

    const author = await resolveAuthor({
      salesforceId: AGENT_ID,
      name: 'Stale Frontmatter Name',
    });

    expect(author.kind).toBe('fallback');
    expect(author.name).toBe('VeteranPCS');
    expect(author.contactHref).toBe('/contact-agent');
    expect(salesForceAPI).toHaveBeenCalledTimes(1);
  });

  it('uses a post state override when the Salesforce billing state differs', async () => {
    vi.mocked(salesForceAPI).mockResolvedValueOnce(
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
});
