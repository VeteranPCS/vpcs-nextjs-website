import * as zipcodes from 'zipcodes';
import { COVERAGE_AREA_METADATA } from '@/lib/ai/routing/data';
import { normalizeCompactText, toTitleCase } from '@/lib/ai/routing/states';
import type { Coordinates, RoutingState } from '@/lib/ai/routing/types';

export interface ZipLookupResult extends Coordinates {
  zip: string;
  city: string;
  stateCode: string;
}

export function lookupZip(zip: string): ZipLookupResult | null {
  const hit = zipcodes.lookup(zip);
  if (!hit || hit.country !== 'US') return null;
  return {
    zip: hit.zip,
    city: toTitleCase(hit.city),
    stateCode: hit.state,
    latitude: hit.latitude,
    longitude: hit.longitude,
  };
}

export function lookupCityCentroid(city: string, state: RoutingState): Coordinates | null {
  const hits = zipcodes.lookupByName(city, state.code).filter((hit) => hit.country === 'US');
  if (hits.length === 0) return null;
  const totals = hits.reduce(
    (sum, hit) => ({
      latitude: sum.latitude + hit.latitude,
      longitude: sum.longitude + hit.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: totals.latitude / hits.length,
    longitude: totals.longitude / hits.length,
  };
}

export function lookupCityDisplayName(city: string, state: RoutingState): string {
  const hits = zipcodes.lookupByName(city, state.code).filter((hit) => hit.country === 'US');
  return hits[0]?.city ? toTitleCase(hits[0].city) : toTitleCase(city);
}

export function getCoverageMetadata(areaName: string, stateCode: string) {
  return COVERAGE_AREA_METADATA.find(
    (item) =>
      item.stateCode === stateCode &&
      normalizeCompactText(item.areaName) === normalizeCompactText(areaName),
  );
}

function candidateLookupNames(areaName: string): string[] {
  const firstDashPart = areaName.split(/\s[-–]\s/)[0]?.trim();
  const firstSlashPart = areaName.split('/')[0]?.trim();
  const noBaseSuffix = areaName.replace(/\s+(?:afb|sfb)$/i, '').trim();
  const candidates = [areaName, firstDashPart, firstSlashPart, noBaseSuffix]
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(candidates));
}

export function coordinatesForCoverageArea(
  areaName: string,
  state: RoutingState,
): (Coordinates & { aliases: string[] }) | null {
  const metadata = getCoverageMetadata(areaName, state.code);
  if (metadata) {
    return {
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      aliases: metadata.aliases ?? [],
    };
  }

  for (const candidate of candidateLookupNames(areaName)) {
    const centroid = lookupCityCentroid(candidate, state);
    if (centroid) return { ...centroid, aliases: [] };
  }

  return null;
}

export function areaAliases(areaName: string, stateCode: string): string[] {
  return getCoverageMetadata(areaName, stateCode)?.aliases ?? [];
}

export function distanceMiles(a: Coordinates, b: Coordinates): number {
  const earthRadiusMiles = 3958.8;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
