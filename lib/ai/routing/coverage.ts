import stateService, { type Agent, type Lenders } from '@/services/stateService';
import { logInfo } from '@/services/loggingService';
import { sanitizeCityName } from '@/utils/sanitizeCityName';
import { resolveDestinationLocation } from '@/lib/ai/routing/destination';
import {
  areaAliases,
  coordinatesForCoverageArea,
  distanceMiles,
} from '@/lib/ai/routing/geo';
import {
  findRoutingState,
  normalizeCompactText,
  stateMatches,
} from '@/lib/ai/routing/states';
import type {
  Coordinates,
  CoverageArea,
  CoverageRoutingResult,
  DestinationResolution,
  RoutedCoverageArea,
  RoutingConfidence,
  RoutingState,
} from '@/lib/ai/routing/types';

const COVERAGE_LIMIT = 3;
const FAR_DISTANCE_MILES = 75;

interface MutableCoverageArea extends CoverageArea {
  agentIds: Set<string>;
  lenderIds: Set<string>;
}

export async function buildCoverageIndexForState(stateInput: string): Promise<CoverageArea[]> {
  const state = findRoutingState(stateInput);
  if (!state) return [];

  const [agentsData, lendersData] = await Promise.all([
    stateService.fetchAgentsListByState(state.code, { requireHeadshot: false }),
    stateService.fetchLendersListByState(state.code, { requireHeadshot: false }),
  ]);

  const areas = new Map<string, MutableCoverageArea>();
  for (const agent of agentsData.records ?? []) {
    addRecordAssignments(areas, agent, state, 'agent');
  }
  for (const lender of lendersData.records ?? []) {
    addRecordAssignments(areas, lender, state, 'lender');
  }

  const result = [...areas.values()]
    .map(({ agentIds, lenderIds, ...area }) => ({
      ...area,
      agentCount: agentIds.size,
      lenderAvailable: lenderIds.size > 0,
    }))
    .filter((area) => area.agentCount > 0 || area.lenderAvailable)
    .sort(
      (a, b) =>
        b.agentCount - a.agentCount ||
        Number(b.lenderAvailable) - Number(a.lenderAvailable) ||
        b.topAgentScore - a.topAgentScore ||
        a.areaName.localeCompare(b.areaName),
    );

  logInfo('Concierge routing: built coverage index', {
    state: state.code,
    areas: result.length,
  });
  return result;
}

export async function findCoverageAreasForDestination(
  destination: string,
  stateHint?: string,
): Promise<CoverageRoutingResult> {
  const resolved = resolveDestinationLocation(destination, stateHint);
  if (!resolved.stateCode) {
    return routeResolvedDestination(resolved, []);
  }
  const areas = await buildCoverageIndexForState(resolved.stateCode);
  return routeResolvedDestination(resolved, areas);
}

export function routeResolvedDestination(
  destination: DestinationResolution,
  areas: CoverageArea[],
): CoverageRoutingResult {
  if (destination.type === 'ambiguous') {
    return {
      destination,
      coverageAreas: [],
      needsClarification: true,
      caveat: destination.caveat,
    };
  }

  if (destination.type === 'unknown' || !destination.stateCode) {
    return {
      destination,
      coverageAreas: [],
      needsClarification: false,
      caveat: destination.caveat ?? 'I could not resolve that destination to a supported US state.',
    };
  }

  const activeAreas = areas.filter((area) => area.agentCount > 0 || area.lenderAvailable);
  if (activeAreas.length === 0) {
    return {
      destination,
      coverageAreas: [],
      needsClarification: false,
      caveat: `I do not see an active VeteranPCS coverage area in ${destination.stateName} right now.`,
    };
  }

  if (destination.type === 'state') {
    const coverageAreas = activeAreas.slice(0, COVERAGE_LIMIT).map((area) =>
      decorateArea(area, {
        confidence: 'medium',
        reason: 'Top active VeteranPCS coverage area in this state.',
        exactMatch: false,
      }),
    );
    return {
      destination,
      coverageAreas,
      selectedCoverageArea: coverageAreas[0],
      needsClarification: false,
      caveat: destination.caveat,
    };
  }

  const explicit = findExplicitCoverageArea(destination, activeAreas);
  if (explicit) {
    const selected = decorateArea(explicit, {
      confidence: 'high',
      reason: destination.coverageAreaOverride
        ? `${destination.normalizedName} routes to the ${explicit.areaName} coverage area.`
        : `${destination.normalizedName} matches this active VeteranPCS coverage area.`,
      exactMatch: true,
    });
    return {
      destination,
      coverageAreas: [selected, ...rankOtherAreas(activeAreas, selected).slice(0, COVERAGE_LIMIT - 1)],
      selectedCoverageArea: selected,
      needsClarification: false,
    };
  }

  const routed = routeByDistance(destination, activeAreas);
  if (routed.length === 0) {
    const coverageAreas = activeAreas.slice(0, COVERAGE_LIMIT).map((area) =>
      decorateArea(area, {
        confidence: 'low',
        reason: 'Active VeteranPCS coverage area in the same state; distance could not be calculated.',
        exactMatch: false,
      }),
    );
    return {
      destination,
      coverageAreas,
      selectedCoverageArea: coverageAreas[0],
      needsClarification: false,
      caveat: `I do not see a ${destination.normalizedName}-specific VeteranPCS coverage area, and I could not calculate an exact nearest area.`,
    };
  }

  const selected = routed[0];
  const caveat = buildCoverageCaveat(destination, selected);
  return {
    destination,
    coverageAreas: routed.slice(0, COVERAGE_LIMIT),
    selectedCoverageArea: selected,
    needsClarification: false,
    caveat,
  };
}

function addRecordAssignments(
  areas: Map<string, MutableCoverageArea>,
  record: Agent | Lenders,
  state: RoutingState,
  role: 'agent' | 'lender',
): void {
  const assignments = record.Area_Assignments__r?.records ?? [];
  for (const assignment of assignments) {
    const areaName = assignment.Area__r?.Name;
    if (!areaName || !stateMatches(assignment.Area__r?.State__c, state)) continue;
    const area = ensureArea(areas, areaName, state);
    const score = assignment.AA_Score__c ?? 0;
    if (role === 'agent') {
      area.agentIds.add(record.AccountId_15__c);
      area.topAgentScore = Math.max(area.topAgentScore, score);
    } else {
      area.lenderIds.add(record.AccountId_15__c);
      area.topLenderScore = Math.max(area.topLenderScore, score);
    }
  }
}

function ensureArea(
  areas: Map<string, MutableCoverageArea>,
  areaName: string,
  state: RoutingState,
): MutableCoverageArea {
  const key = areaKey(areaName, state.code);
  const existing = areas.get(key);
  if (existing) return existing;

  const coordinates = coordinatesForCoverageArea(areaName, state);
  const area: MutableCoverageArea = {
    areaName,
    slug: sanitizeCityName(areaName),
    stateName: state.name,
    stateCode: state.code,
    stateSlug: state.slug,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    agentCount: 0,
    lenderAvailable: false,
    topAgentScore: 0,
    topLenderScore: 0,
    aliases: coordinates?.aliases ?? areaAliases(areaName, state.code),
    agentIds: new Set<string>(),
    lenderIds: new Set<string>(),
  };
  areas.set(key, area);
  return area;
}

function findExplicitCoverageArea(
  destination: DestinationResolution,
  areas: CoverageArea[],
): CoverageArea | null {
  const override = destination.coverageAreaOverride;
  if (override) {
    const overrideMatch = areas.find((area) => areaNameMatches(area, override));
    if (overrideMatch) return overrideMatch;
  }

  return areas.find((area) => areaNameMatches(area, destination.normalizedName)) ?? null;
}

function areaNameMatches(area: CoverageArea, input: string): boolean {
  const target = normalizeCompactText(input.replace(/,\s*[A-Z]{2}$/i, ''));
  const names = [area.areaName, ...area.aliases];
  return names.some((name) => {
    const normalizedName = normalizeCompactText(name);
    return normalizedName === target || target.includes(normalizedName) || normalizedName.includes(target);
  });
}

function routeByDistance(
  destination: DestinationResolution,
  areas: CoverageArea[],
): RoutedCoverageArea[] {
  const destinationCoordinates = coordinatesFromDestination(destination);
  if (!destinationCoordinates) return [];

  return areas
    .filter((area) => area.latitude !== undefined && area.longitude !== undefined)
    .map((area) => {
      const distance = distanceMiles(destinationCoordinates, {
        latitude: area.latitude as number,
        longitude: area.longitude as number,
      });
      const rounded = Math.round(distance);
      return decorateArea(area, {
        distanceMiles: rounded,
        confidence: confidenceForDistance(rounded),
        reason: `Closest active VeteranPCS coverage area found in ${area.stateName}.`,
        exactMatch: false,
      });
    })
    .sort(
      (a, b) =>
        (a.distanceMiles ?? Number.POSITIVE_INFINITY) -
          (b.distanceMiles ?? Number.POSITIVE_INFINITY) ||
        b.agentCount - a.agentCount ||
        b.topAgentScore - a.topAgentScore,
    );
}

function rankOtherAreas(areas: CoverageArea[], selected: CoverageArea): RoutedCoverageArea[] {
  return areas
    .filter((area) => areaKey(area.areaName, area.stateCode) !== areaKey(selected.areaName, selected.stateCode))
    .sort(
      (a, b) =>
        b.agentCount - a.agentCount ||
        b.topAgentScore - a.topAgentScore ||
        a.areaName.localeCompare(b.areaName),
    )
    .map((area) =>
      decorateArea(area, {
        confidence: 'medium',
        reason: 'Other active VeteranPCS coverage area in the same state.',
        exactMatch: false,
      }),
    );
}

function decorateArea(
  area: CoverageArea,
  options: {
    distanceMiles?: number;
    confidence: RoutingConfidence;
    reason: string;
    exactMatch: boolean;
  },
): RoutedCoverageArea {
  return {
    ...area,
    distanceMiles: options.distanceMiles,
    confidence: options.confidence,
    reason: options.reason,
    exactMatch: options.exactMatch,
  };
}

function buildCoverageCaveat(destination: DestinationResolution, selected: RoutedCoverageArea): string {
  const distance = selected.distanceMiles;
  const distancePhrase =
    distance !== undefined ? ` It is about ${distance} straight-line miles away.` : '';
  const farPhrase =
    distance !== undefined && distance > FAR_DISTANCE_MILES
      ? ' A human partner should confirm the best local fit before you move forward.'
      : '';
  return `I do not see a ${destination.normalizedName}-specific VeteranPCS coverage area right now. The closest active VeteranPCS coverage area I found is ${selected.areaName}.${distancePhrase}${farPhrase}`;
}

function confidenceForDistance(distance: number): RoutingConfidence {
  if (distance <= 35) return 'high';
  if (distance <= FAR_DISTANCE_MILES) return 'medium';
  return 'low';
}

function coordinatesFromDestination(destination: DestinationResolution): Coordinates | null {
  if (destination.latitude === undefined || destination.longitude === undefined) return null;
  return { latitude: destination.latitude, longitude: destination.longitude };
}

function areaKey(areaName: string, stateCode: string): string {
  return `${stateCode}:${normalizeCompactText(areaName)}`;
}
