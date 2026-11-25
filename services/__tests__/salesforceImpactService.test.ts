import { afterEach, expect, it, vi } from 'vitest';
import { productionEnv, stubProductionEnv, stubWebdevEnv, webdevMetadata, WEBDEV_ORIGIN } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { SF_RECORD_TYPE } from '@/lib/salesforce/ids';
import { salesForceAPIWithRefresh } from '@/services/api';
import { getAllImpactMetrics } from '@/services/salesforceImpactService';

vi.mock('server-only', () => ({}));
vi.mock('@/services/api', () => ({
  RequestType: { GET: 'get' },
  salesForceAPIWithRefresh: vi.fn(),
}));

afterEach(() => vi.unstubAllEnvs());

it('uses the active org record type and keeps production impact totals out of the sandbox cache', async () => {
  vi.mocked(salesForceAPIWithRefresh)
    .mockResolvedValueOnce({
      status: 200, data: { records: [{ expr0: 2000, expr1: 250, expr2: 4000000 }] },
    } as never)
    .mockResolvedValueOnce({
      status: 200, data: { records: [{ expr0: 1000, expr1: 100, expr2: 2000000 }] },
    } as never);

  stubProductionEnv();
  expect(await getAllImpactMetrics()).toMatchObject({ cashBackAmount: '$2,000', available: true });
  expect(await getAllImpactMetrics()).toMatchObject({ cashBackAmount: '$2,000', available: true });
  expect(salesForceAPIWithRefresh).toHaveBeenCalledTimes(1);

  stubWebdevEnv();
  expect(await getAllImpactMetrics()).toMatchObject({ cashBackAmount: '$1,000', available: true });
  expect(salesForceAPIWithRefresh).toHaveBeenCalledTimes(2);

  const calls = vi.mocked(salesForceAPIWithRefresh).mock.calls.map(([params]) => {
    const url = new URL(params.endpoint);
    return { origin: url.origin, soql: url.searchParams.get('q') };
  });
  expect(calls).toEqual([
    { origin: productionEnv.VPCS_SALESFORCE_BASE_URL, soql: expect.stringContaining(`RecordTypeId = '${SF_RECORD_TYPE.CUSTOMER_OPPORTUNITY}'`) },
    { origin: WEBDEV_ORIGIN, soql: expect.stringContaining(`RecordTypeId = '${webdevMetadata.recordTypes.CUSTOMER_OPPORTUNITY}'`) },
  ]);
});
