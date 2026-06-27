import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/constants/api', () => ({
  SALESFORCE_BASE_URL: 'https://sf.example.test',
  SALESFORCE_API_VERSION: 'v62.0',
}));

vi.mock('@/services/api', () => ({
  RequestType: {
    GET: 'get',
    PATCH: 'patch',
  },
  salesForceAPI: vi.fn(),
}));

vi.mock('@/services/salesForceTokenService', () => ({
  getSalesforceToken: vi.fn(),
}));

vi.mock('@/services/loggingService', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { RequestType, salesForceAPI } from '@/services/api';
import { logError, logInfo } from '@/services/loggingService';
import {
  appendLeadOwnerSubmissionMarker,
  routeSalesforceLeadOwner,
} from '@/services/salesforceLeadOwnerService';

const BETH_OWNER_ID = '0054x000005GsUvAAK';

function queryResponse(records: unknown[]) {
  return {
    status: 200,
    data: {
      totalSize: records.length,
      done: true,
      records,
    },
  };
}

function routeParams(overrides = {}) {
  return {
    submissionId: 'submission-test-id',
    submissionStartedAt: new Date('2026-06-17T12:00:00.000Z'),
    leadSource: 'Contact Agent' as const,
    destinationStateCode: 'CO',
    destinationStateSlug: 'colorado',
    email: 'qa@example.test',
    selectedAgentId: '0014x00000HWTqI',
    ...overrides,
  };
}

function decodedQuery(callIndex: number): string {
  const call = vi.mocked(salesForceAPI).mock.calls[callIndex]?.[0];
  const endpoint = call?.endpoint ?? '';
  return new URL(endpoint).searchParams.get('q') ?? '';
}

function patchCall() {
  return vi.mocked(salesForceAPI).mock.calls.find(([call]) => call.type === RequestType.PATCH)?.[0];
}

describe('salesforceLeadOwnerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends a submission marker to the WebForm URL', () => {
    expect(
      appendLeadOwnerSubmissionMarker(
        'https://www.veteranpcs.com/contact-agent?state=colorado',
        'abc 123',
      ),
    ).toBe('https://www.veteranpcs.com/contact-agent?state=colorado&sid=abc+123');
  });

  it('keeps long marked WebForm URLs within the Salesforce URL field limit', () => {
    const longQuery = `state=colorado&extra=${'x'.repeat(400)}`;
    const marked = appendLeadOwnerSubmissionMarker(
      `https://www.veteranpcs.com/contact-agent?${longQuery}`,
      'submission-test-id',
    );

    expect(marked.length).toBeLessThanOrEqual(255);
    expect(marked).toContain('sid=submission-test-id');
  });

  it('finds the Lead by submission marker, patches OwnerId, and confirms the owner', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(queryResponse([{ Id: '00QMARKER', OwnerId: '005WRONG' }]) as any)
      .mockResolvedValueOnce({ status: 204 } as any)
      .mockResolvedValueOnce(
        queryResponse([{ Id: '00QMARKER', OwnerId: BETH_OWNER_ID, Owner: { Name: 'Beth Soldner' } }]) as any,
      );

    const result = await routeSalesforceLeadOwner(routeParams());

    expect(decodedQuery(0)).toContain("WebFormURL__c LIKE '%sid=submission-test-id%'");
    expect(patchCall()).toEqual(
      expect.objectContaining({
        endpoint: 'https://sf.example.test/services/data/v62.0/sobjects/Lead/00QMARKER',
        type: RequestType.PATCH,
        data: { OwnerId: BETH_OWNER_ID },
      }),
    );
    expect(result).toEqual({
      leadId: '00QMARKER',
      ownerId: BETH_OWNER_ID,
      ownerName: 'Beth Soldner',
      adminName: 'Beth',
    });
    expect(logInfo).toHaveBeenCalledWith(
      'Salesforce Lead owner routing confirmed',
      expect.objectContaining({ leadId: '00QMARKER', ownerId: BETH_OWNER_ID }),
    );
  });

  it('does not patch when the found Lead already has the routed owner', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(
        queryResponse([{ Id: '00QALREADY', OwnerId: BETH_OWNER_ID, Owner: { Name: 'Beth Soldner' } }]) as any,
      )
      .mockResolvedValueOnce(
        queryResponse([{ Id: '00QALREADY', OwnerId: BETH_OWNER_ID, Owner: { Name: 'Beth Soldner' } }]) as any,
      );

    const result = await routeSalesforceLeadOwner(routeParams());

    expect(patchCall()).toBeUndefined();
    expect(result).toEqual({
      leadId: '00QALREADY',
      ownerId: BETH_OWNER_ID,
      ownerName: 'Beth Soldner',
      adminName: 'Beth',
    });
    expect(logInfo).toHaveBeenCalledWith(
      'Salesforce Lead owner already matched routing target',
      expect.objectContaining({ leadId: '00QALREADY', ownerId: BETH_OWNER_ID }),
    );
  });

  it('falls back to tight criteria when marker lookup misses', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(queryResponse([]) as any)
      .mockResolvedValueOnce(queryResponse([{ Id: '00QFALLBACK', OwnerId: '005WRONG' }]) as any)
      .mockResolvedValueOnce({ status: 204 } as any)
      .mockResolvedValueOnce(
        queryResponse([{ Id: '00QFALLBACK', OwnerId: BETH_OWNER_ID, Owner: { Name: 'Beth Soldner' } }]) as any,
      );

    await routeSalesforceLeadOwner(routeParams());

    const fallbackQuery = decodedQuery(1);
    expect(fallbackQuery).toContain("Email = 'qa@example.test'");
    expect(fallbackQuery).toContain("LeadSource = 'Contact Agent'");
    expect(fallbackQuery).toContain("RecordTypeId = '0124x000000Z5yDAAS'");
    expect(fallbackQuery).toContain("Destination_State__c = 'CO'");
    expect(fallbackQuery).toContain('CreatedDate >= 2026-06-17T12:00:00Z');
    expect(fallbackQuery).toContain("WebFormAgentId__c = '0014x00000HWTqI'");
  });

  it('does not patch when lookup finds no Lead', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(queryResponse([]) as any)
      .mockResolvedValueOnce(queryResponse([]) as any);

    await expect(routeSalesforceLeadOwner(routeParams())).rejects.toThrow(
      'Unable to locate unique Salesforce Lead',
    );

    expect(patchCall()).toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      'Salesforce Lead owner lookup found no matching Lead',
      expect.objectContaining({ submissionId: 'submission-test-id' }),
    );
  });

  it('does not patch when lookup is ambiguous', async () => {
    vi.mocked(salesForceAPI).mockResolvedValueOnce(
      queryResponse([{ Id: '00Q1' }, { Id: '00Q2' }]) as any,
    );

    await expect(routeSalesforceLeadOwner(routeParams())).rejects.toThrow(
      'Ambiguous Salesforce Lead lookup',
    );

    expect(patchCall()).toBeUndefined();
  });

  it('throws when the OwnerId PATCH fails', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(queryResponse([{ Id: '00QPATCH', OwnerId: '005WRONG' }]) as any)
      .mockResolvedValueOnce({ status: 403, data: [{ message: 'insufficient access' }] } as any);

    await expect(routeSalesforceLeadOwner(routeParams())).rejects.toThrow(
      'Salesforce Lead owner PATCH failed',
    );

    expect(logError).toHaveBeenCalledWith(
      'Salesforce Lead owner PATCH failed',
      expect.objectContaining({ leadId: '00QPATCH', ownerId: BETH_OWNER_ID, status: 403 }),
    );
  });

  it('throws when owner confirmation does not match the requested owner', async () => {
    vi.mocked(salesForceAPI)
      .mockResolvedValueOnce(queryResponse([{ Id: '00QCONFIRM', OwnerId: '005WRONG' }]) as any)
      .mockResolvedValueOnce({ status: 204 } as any)
      .mockResolvedValue(
        queryResponse([{ Id: '00QCONFIRM', OwnerId: '005STILLWRONG', Owner: { Name: 'Stephanie Guree' } }]) as any,
      );

    await expect(routeSalesforceLeadOwner(routeParams())).rejects.toThrow(
      'Salesforce Lead OwnerId confirmation mismatch',
    );
  });
});
