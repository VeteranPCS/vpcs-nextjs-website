import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/stateService', () => ({
  default: {
    fetchAgentsListByState: vi.fn(),
    fetchLendersListByState: vi.fn(),
  },
}));

import { resolveDestinationLocation } from '@/lib/ai/routing/destination';
import { routeResolvedDestination } from '@/lib/ai/routing/coverage';
import type { CoverageArea } from '@/lib/ai/routing/types';

function area(input: Partial<CoverageArea> & Pick<CoverageArea, 'areaName'>): CoverageArea {
  return {
    areaName: input.areaName,
    slug: input.slug ?? input.areaName.toLowerCase().replace(/\s+/g, '-'),
    stateName: input.stateName ?? 'Colorado',
    stateCode: input.stateCode ?? 'CO',
    stateSlug: input.stateSlug ?? 'colorado',
    latitude: input.latitude,
    longitude: input.longitude,
    agentCount: input.agentCount ?? 1,
    lenderAvailable: input.lenderAvailable ?? true,
    topAgentScore: input.topAgentScore ?? 50,
    topLenderScore: input.topLenderScore ?? 0,
    aliases: input.aliases ?? [],
  };
}

describe('routeResolvedDestination', () => {
  const coloradoAreas = [
    area({
      areaName: 'Colorado Springs',
      latitude: 38.8339,
      longitude: -104.8214,
      agentCount: 3,
      aliases: ['Fort Carson', 'Peterson SFB', 'USAFA'],
    }),
    area({
      areaName: 'Denver',
      latitude: 39.7392,
      longitude: -104.9903,
      agentCount: 1,
      topAgentScore: 20,
    }),
  ];

  it('uses military-base coverage override before distance', () => {
    const res = routeResolvedDestination(
      resolveDestinationLocation('Fort Carson'),
      coloradoAreas,
    );

    expect(res.needsClarification).toBe(false);
    expect(res.selectedCoverageArea?.areaName).toBe('Colorado Springs');
    expect(res.selectedCoverageArea?.confidence).toBe('high');
    expect(res.caveat).toBeUndefined();
  });

  it('prefers exact active coverage-area match', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Denver, CO'), coloradoAreas);

    expect(res.selectedCoverageArea?.areaName).toBe('Denver');
    expect(res.selectedCoverageArea?.exactMatch).toBe(true);
  });

  it('routes Boulder to nearest active Colorado area when no exact area exists', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Boulder, CO'), coloradoAreas);

    expect(res.selectedCoverageArea?.areaName).toBe('Denver');
    expect(res.selectedCoverageArea?.exactMatch).toBe(false);
    expect(res.caveat).toMatch(/Boulder, CO-specific/);
    expect(res.caveat).toMatch(/closest active VeteranPCS coverage area/i);
  });

  it('adds a human-confirmation caveat when nearest active coverage is far away', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Boulder, CO'), [
      coloradoAreas[0],
    ]);

    expect(res.selectedCoverageArea?.areaName).toBe('Colorado Springs');
    expect(res.selectedCoverageArea?.confidence).toBe('low');
    expect(res.caveat).toMatch(/human partner should confirm/i);
  });

  it('returns top active state areas for state-only input', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Colorado'), coloradoAreas);

    expect(res.selectedCoverageArea?.areaName).toBe('Colorado Springs');
    expect(res.coverageAreas).toHaveLength(2);
    expect(res.caveat).toMatch(/State-only routing is broad/);
  });

  it('returns a clear caveat when no active areas exist', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Colorado'), []);

    expect(res.selectedCoverageArea).toBeUndefined();
    expect(res.coverageAreas).toEqual([]);
    expect(res.caveat).toMatch(/do not see an active VeteranPCS coverage area/);
  });

  it('does not route ambiguous city-only input', () => {
    const res = routeResolvedDestination(resolveDestinationLocation('Springfield'), coloradoAreas);

    expect(res.needsClarification).toBe(true);
    expect(res.selectedCoverageArea).toBeUndefined();
    expect(res.caveat).toMatch(/need the state/i);
  });
});
