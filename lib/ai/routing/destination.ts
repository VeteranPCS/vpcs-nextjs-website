import { AMBIGUOUS_CITY_CANDIDATES, INSTALLATION_ALIASES } from '@/lib/ai/routing/data';
import {
  lookupCityCentroid,
  lookupCityDisplayName,
  lookupZip,
} from '@/lib/ai/routing/geo';
import {
  findRoutingState,
  normalizeCompactText,
  normalizeSearchText,
  ROUTING_STATES,
  slugifyRoutingText,
  toTitleCase,
} from '@/lib/ai/routing/states';
import type { DestinationResolution, RoutingState } from '@/lib/ai/routing/types';

interface ParsedCityState {
  city: string;
  state: RoutingState;
}

export function resolveDestinationLocation(
  destination: string,
  stateHint?: string,
): DestinationResolution {
  const input = destination.trim();
  if (!input) {
    return {
      input: destination,
      type: 'unknown',
      normalizedName: '',
      confidence: 'low',
      caveat: 'I could not read a destination from that message.',
    };
  }

  const base = matchInstallation(input);
  if (base) {
    return {
      input,
      type: 'military_base',
      normalizedName: base.canonicalName,
      stateName: base.stateName,
      stateCode: base.stateCode,
      stateSlug: base.stateSlug,
      latitude: base.latitude,
      longitude: base.longitude,
      confidence: 'high',
      coverageAreaOverride: base.nearestCoverageAreaOverride,
    };
  }

  const zipMatch = input.match(/^\d{5}$/);
  if (zipMatch) {
    return resolveZip(input);
  }

  const stateOnly = findRoutingState(input);
  if (stateOnly) {
    return {
      input,
      type: 'state',
      normalizedName: stateOnly.name,
      stateName: stateOnly.name,
      stateCode: stateOnly.code,
      stateSlug: stateOnly.slug,
      confidence: 'high',
      caveat: 'State-only routing is broad. A city, base, or ZIP will narrow this down.',
    };
  }

  const cityState = parseCityState(input, stateHint);
  if (cityState) {
    return resolveCityState(input, cityState.city, cityState.state);
  }

  const ambiguousCandidates = AMBIGUOUS_CITY_CANDIDATES[slugifyRoutingText(input)];
  if (ambiguousCandidates) {
    return {
      input,
      type: 'ambiguous',
      normalizedName: toTitleCase(input),
      confidence: 'low',
      candidates: [...ambiguousCandidates],
      caveat: `I need the state for ${toTitleCase(input)} before I can route it.`,
    };
  }

  return {
    input,
    type: 'ambiguous',
    normalizedName: toTitleCase(input),
    confidence: 'low',
    caveat: `I need the state for ${toTitleCase(input)} before I can route it.`,
  };
}

function resolveZip(input: string): DestinationResolution {
  const hit = lookupZip(input);
  if (!hit) {
    return {
      input,
      type: 'unknown',
      normalizedName: input,
      confidence: 'low',
      caveat: `I could not find ZIP ${input} in the local US ZIP lookup.`,
    };
  }
  const state = findRoutingState(hit.stateCode);
  if (!state) {
    return {
      input,
      type: 'unknown',
      normalizedName: `${hit.city}, ${hit.stateCode}`,
      confidence: 'low',
      caveat: `I found ZIP ${input}, but not a supported state for it.`,
    };
  }
  return {
    input,
    type: 'zip',
    normalizedName: `${hit.city}, ${state.code}`,
    stateName: state.name,
    stateCode: state.code,
    stateSlug: state.slug,
    latitude: hit.latitude,
    longitude: hit.longitude,
    confidence: 'high',
  };
}

function resolveCityState(
  input: string,
  rawCity: string,
  state: RoutingState,
): DestinationResolution {
  const city = rawCity.trim();
  const centroid = lookupCityCentroid(city, state);
  if (!centroid) {
    return {
      input,
      type: 'unknown',
      normalizedName: `${toTitleCase(city)}, ${state.code}`,
      stateName: state.name,
      stateCode: state.code,
      stateSlug: state.slug,
      confidence: 'low',
      caveat: `I could not find ${toTitleCase(city)}, ${state.code} in the local city lookup.`,
    };
  }

  return {
    input,
    type: 'city',
    normalizedName: `${lookupCityDisplayName(city, state)}, ${state.code}`,
    stateName: state.name,
    stateCode: state.code,
    stateSlug: state.slug,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    confidence: 'high',
  };
}

function parseCityState(input: string, stateHint?: string): ParsedCityState | null {
  const hintedState = findRoutingState(stateHint);
  if (hintedState) {
    return { city: input.replace(/,\s*$/, '').trim(), state: hintedState };
  }

  const commaParts = input.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const maybeState = findRoutingState(commaParts.at(-1));
    const city = commaParts.slice(0, -1).join(', ');
    if (maybeState && city) return { city, state: maybeState };
  }

  const stateCodeMatch = input.match(/^(.+?)\s+([A-Za-z]{2})$/);
  if (stateCodeMatch) {
    const maybeState = findRoutingState(stateCodeMatch[2]);
    if (maybeState) return { city: stateCodeMatch[1].trim(), state: maybeState };
  }

  const normalizedInput = normalizeSearchText(input);
  const stateByName = [...ROUTING_STATES]
    .sort((a, b) => b.name.length - a.name.length)
    .find((state) => normalizedInput.endsWith(` ${normalizeSearchText(state.name)}`));

  if (stateByName) {
    const stateText = normalizeSearchText(stateByName.name);
    const city = normalizedInput.slice(0, -stateText.length).trim();
    if (city) return { city, state: stateByName };
  }

  return null;
}

function matchInstallation(input: string) {
  const normalized = normalizeCompactText(input);
  const matches = INSTALLATION_ALIASES.flatMap((entry) =>
    entry.aliases.map((alias) => ({ entry, alias, normalizedAlias: normalizeCompactText(alias) })),
  )
    .filter(({ normalizedAlias }) =>
      normalized === normalizedAlias ||
      (normalizedAlias.length > 6 && normalized.includes(normalizedAlias)),
    )
    .sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);

  return matches[0]?.entry ?? null;
}
