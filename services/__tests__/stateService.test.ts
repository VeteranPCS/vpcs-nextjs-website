import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  productionEnv,
  stubProductionEnv,
  stubWebdevEnv,
  WEBDEV_ORIGIN,
} from '@/lib/salesforce/__tests__/configuration-fixtures';

// stateService transitively imports the server-only state_list loader; stub the
// marker package (same approach as app/__tests__/sitemap.test.ts). Mock the
// Salesforce API layer so importing the service never touches token plumbing —
// these tests only exercise the migrated repo-content functions.
vi.mock('server-only', () => ({}));
vi.mock('@/services/api', () => ({
  RequestType: { GET: 'GET', POST: 'POST' },
  salesForceAPIWithRefresh: vi.fn(),
  salesForceImageAPI: vi.fn(),
}));

import { salesForceAPIWithRefresh } from '@/services/api';
import { MOCK_AGENT_ID, MOCK_LENDER_ID } from '@/lib/salesforce/mock-transport';
import stateService from '@/services/stateService';
import stateListJson from '@/content/_data/site/state_list.json';
import webdevFixtureManifest from '@/config/salesforce/webdev-fixtures.json';
import webdevMetadata from '@/config/salesforce/webdev.json';

const texasImagePath = stateListJson.find((state) => state.short_name === 'TX')?.state_map.path;
if (!texasImagePath) throw new Error('Texas state-map fixture is missing');

describe('stateService.fetchStateList (repo-content backed)', () => {
  it('returns one row per exported document with exactly the legacy projection keys', async () => {
    const states = await stateService.fetchStateList();
    expect(states.length).toBe((stateListJson as unknown[]).length);
    for (const state of states) {
      // Byte-compatible with the Sanity-era projection:
      // { _id, _updatedAt, state_slug, short_name, state_name }
      expect(Object.keys(state).sort()).toEqual(
        ['_id', '_updatedAt', 'short_name', 'state_name', 'state_slug'],
      );
      expect(state.state_slug._type).toBe('slug');
      expect(state.state_slug.current).not.toBe('');
      expect(state.short_name).not.toBe('');
      expect(state.state_name).not.toBe('');
    }
  });
});

describe('stateService.fetchStateDetails', () => {
  it('returns the full document with the legacy state_map.asset.image_url shape', async () => {
    const details = await stateService.fetchStateDetails('texas');
    expect(details._type).toBe('state_list');
    expect(details.short_name).toBe('TX');
    expect(details.state_name).toBe('Texas');
    expect(details.state_slug).toEqual({ _type: 'slug', current: 'texas' });
    expect(details.state_map).toEqual({
      alt: 'Texas',
      asset: { image_url: texasImagePath },
    });
    expect(details._createdAt).not.toBe('');
    expect(details._updatedAt).not.toBe('');
  });

  it('throws on an unknown slug (llms.txt route maps this to a 404)', async () => {
    await expect(stateService.fetchStateDetails('not-a-state')).rejects.toThrow(
      'Failed to fetch State Details',
    );
  });
});

describe('stateService.fetchStateImage', () => {
  it('returns an absolute http(s) URL, like the Sanity CDN implementation did', async () => {
    // The /api/v1/states/[state]/image route forwards this value verbatim to
    // external consumers, so the absolute-URL contract must hold.
    const imageUrl = await stateService.fetchStateImage('texas');
    expect(imageUrl).toMatch(/^https?:\/\//);
    expect(imageUrl.endsWith(texasImagePath)).toBe(true);
    expect(imageUrl).not.toContain('//images');
  });

  it('throws on an unknown slug', async () => {
    await expect(stateService.fetchStateImage('not-a-state')).rejects.toThrow(
      'No state map found',
    );
  });
});

describe('stateService partner headshots', () => {
  beforeEach(() => {
    stubProductionEnv();
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('matches case-sensitive Salesforce IDs consistently on every filesystem', async () => {
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValue({
      status: 200,
      data: {
        totalSize: 6,
        done: true,
        records: [
          { Name: 'Kodja Schelte', AccountId_15__c: '0014x00000IFGiQ' },
          { Name: 'Erica Lehmkuhl', AccountId_15__c: '0014x00000IFGiV' },
          { Name: 'Chelsea Mack', AccountId_15__c: '0014x00000IFGiX' },
          { Name: 'Carissa Duran', AccountId_15__c: '0014x00000IFGiq' },
          { Name: 'Rick Carlson', AccountId_15__c: '0014x00000IFGiv' },
          { Name: 'Christina Zimmerman', AccountId_15__c: '0014x00000IFGix' },
        ],
      },
    } as never);

    const result = await stateService.fetchAgentsListByState('TX');

    expect(salesForceAPIWithRefresh).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: expect.stringContaining(`${productionEnv.VPCS_SALESFORCE_BASE_URL}/services/data/v62.0/query?`),
    }));
    expect(result.records.map((agent) => agent.AccountId_15__c)).toEqual([
      '0014x00000IFGiV',
      '0014x00000IFGiq',
      '0014x00000IFGix',
    ]);
    expect(result.records.map((agent) => agent.PhotoUrl)).toEqual([
      '/images/agents/0014x00000IFGiV.webp',
      '/images/agents/0014x00000IFGiq.webp',
      '/images/agents/0014x00000IFGix.webp',
    ]);
  });

  it('uses the webdev endpoint after resolving the sandbox profile', async () => {
    stubWebdevEnv({ SALESFORCE_API_VERSION: 'v65.0' });
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValueOnce({
      status: 200, data: { totalSize: 0, done: true, records: [] },
    } as never);

    await expect(stateService.fetchLendersListByState('CO')).resolves.toMatchObject({ records: [] });
    expect(salesForceAPIWithRefresh).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: expect.stringContaining(`${WEBDEV_ORIGIN}/services/data/v65.0/query?`),
    }));
  });

  it.each([
    ['agents', MOCK_AGENT_ID, stateService.fetchAgentsListByState],
    ['lenders', MOCK_LENDER_ID, stateService.fetchLendersListByState],
  ] as const)('renders the committed SVG for exact mock %s only', async (role, id, getPartners) => {
    const fixture = {
      status: 200,
      data: { totalSize: 1, done: true, records: [{ Name: 'Sample Partner', AccountId_15__c: id }] },
    };
    vi.mocked(salesForceAPIWithRefresh)
      .mockResolvedValueOnce(fixture as never).mockResolvedValueOnce(fixture as never);
    expect((await getPartners('CO')).records).toEqual([]);

    stubWebdevEnv({ VPCS_SALESFORCE_PROFILE: 'mock' });
    expect((await getPartners('CO')).records).toMatchObject([
      { AccountId_15__c: id, PhotoUrl: `/images/${role}/${id}.svg` },
    ]);
  });

  const listedFixtures = [
    ['agents', 'lenders', MOCK_AGENT_ID, stateService.fetchAgentsListByState],
    ['lenders', 'agents', MOCK_LENDER_ID, stateService.fetchLendersListByState],
  ] as const;

  it.each(listedFixtures)('uses neutral %s headshots only for the reconciled fixture IDs in WebDev', async (role, otherRole, mockId, getPartners) => {
    const [fixtureId] = webdevFixtureManifest.accountIds[role];
    if (!fixtureId) throw new Error(`Missing reconciled WebDev ${role} fixture`);
    const id = fixtureId.slice(0, 15);
    const partner = { Name: 'WebDev fixture', AccountId_15__c: id };
    const records = [
      partner,
      { Name: 'Different record', AccountId_15__c: '001000000000098' },
      { Name: 'Case-colliding record', AccountId_15__c: id.toLowerCase() },
      ...webdevFixtureManifest.accountIds[otherRole].map(otherId => ({ Name: 'Other role', AccountId_15__c: otherId.slice(0, 15) })),
    ];
    vi.mocked(salesForceAPIWithRefresh).mockResolvedValue({
      status: 200, data: { totalSize: records.length, done: true, records },
    } as never);

    // Existing (production) and unrelated sandbox profiles must not use the WebDev fixture mapping.
    expect((await getPartners('CO')).records).toEqual([]);
    stubWebdevEnv();
    expect((await getPartners('CO')).records).toEqual([]);

    for (const orgId of [webdevFixtureManifest.orgId, webdevFixtureManifest.orgId.slice(0, 15)]) {
      stubWebdevEnv({ VPCS_SALESFORCE_ORG_ID: orgId, VPCS_SALESFORCE_METADATA_JSON: JSON.stringify(webdevMetadata) });
      expect((await getPartners('CO')).records).toEqual([
        { ...partner, PhotoUrl: `/images/${role}/${mockId}.svg` },
      ]);
    }
  });
});
