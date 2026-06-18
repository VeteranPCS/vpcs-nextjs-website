import type {
  ClarificationCandidate,
  Coordinates,
  RoutingState,
} from '@/lib/ai/routing/types';

export interface InstallationAlias {
  canonicalName: string;
  aliases: string[];
  stateCode: string;
  stateName: string;
  stateSlug: string;
  latitude: number;
  longitude: number;
  nearestCoverageAreaOverride: string;
}

export interface CoverageAreaMetadata {
  areaName: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  aliases?: string[];
  lookupNames?: string[];
}

export const INSTALLATION_ALIASES: readonly InstallationAlias[] = [
  {
    canonicalName: 'Fort Carson',
    aliases: ['Fort Carson', 'Ft Carson', 'Carson', 'Fort Carson Army Base'],
    stateCode: 'CO',
    stateName: 'Colorado',
    stateSlug: 'colorado',
    latitude: 38.7375,
    longitude: -104.7889,
    nearestCoverageAreaOverride: 'Colorado Springs',
  },
  {
    canonicalName: 'Peterson Space Force Base',
    aliases: ['Peterson SFB', 'Peterson Space Force Base', 'Peterson AFB', 'Peterson Air Force Base'],
    stateCode: 'CO',
    stateName: 'Colorado',
    stateSlug: 'colorado',
    latitude: 38.8236,
    longitude: -104.7009,
    nearestCoverageAreaOverride: 'Colorado Springs',
  },
  {
    canonicalName: 'United States Air Force Academy',
    aliases: ['USAFA', 'US Air Force Academy', 'Air Force Academy', 'United States Air Force Academy'],
    stateCode: 'CO',
    stateName: 'Colorado',
    stateSlug: 'colorado',
    latitude: 38.9987,
    longitude: -104.8617,
    nearestCoverageAreaOverride: 'Colorado Springs',
  },
  {
    canonicalName: 'Naval Station Norfolk',
    aliases: ['Naval Station Norfolk', 'Norfolk Naval Station', 'NS Norfolk', 'Naval Base Norfolk'],
    stateCode: 'VA',
    stateName: 'Virginia',
    stateSlug: 'virginia',
    latitude: 36.9467,
    longitude: -76.3133,
    nearestCoverageAreaOverride: 'Norfolk',
  },
  {
    canonicalName: 'Fort Cavazos',
    aliases: ['Fort Cavazos', 'Ft Cavazos', 'Fort Hood', 'Ft Hood', 'Cavazos', 'Hood'],
    stateCode: 'TX',
    stateName: 'Texas',
    stateSlug: 'texas',
    latitude: 31.1349,
    longitude: -97.7797,
    nearestCoverageAreaOverride: 'Killeen - Fort Hood',
  },
  {
    canonicalName: 'Joint Base Lewis-McChord',
    aliases: [
      'Joint Base Lewis-McChord',
      'Joint Base Lewis McChord',
      'JBLM',
      'Fort Lewis',
      'Ft Lewis',
      'McChord AFB',
      'McChord Air Force Base',
    ],
    stateCode: 'WA',
    stateName: 'Washington',
    stateSlug: 'washington',
    latitude: 47.1054,
    longitude: -122.5663,
    nearestCoverageAreaOverride: 'Joint Base Lewis-McChord',
  },
  {
    canonicalName: 'MacDill Air Force Base',
    aliases: ['MacDill AFB', 'MacDill Air Force Base', 'MacDill', 'Macdill AFB'],
    stateCode: 'FL',
    stateName: 'Florida',
    stateSlug: 'florida',
    latitude: 27.8493,
    longitude: -82.5212,
    nearestCoverageAreaOverride: 'Tampa',
  },
  {
    canonicalName: 'Fort Liberty',
    aliases: ['Fort Liberty', 'Ft Liberty', 'Fort Bragg', 'Ft Bragg', 'Bragg', 'Pope AAF'],
    stateCode: 'NC',
    stateName: 'North Carolina',
    stateSlug: 'north-carolina',
    latitude: 35.139,
    longitude: -79.006,
    nearestCoverageAreaOverride: 'Fayetteville',
  },
];

export const COVERAGE_AREA_METADATA: readonly CoverageAreaMetadata[] = [
  { areaName: 'Colorado Springs', stateCode: 'CO', latitude: 38.8339, longitude: -104.8214, aliases: ['Fort Carson', 'Peterson SFB', 'USAFA'] },
  { areaName: 'Denver', stateCode: 'CO', latitude: 39.7392, longitude: -104.9903 },
  { areaName: 'Fort Collins', stateCode: 'CO', latitude: 40.5853, longitude: -105.0844 },
  { areaName: 'Norfolk', stateCode: 'VA', latitude: 36.8508, longitude: -76.2859, aliases: ['Hampton Roads', 'Naval Station Norfolk', 'Norfolk Naval Station'] },
  { areaName: 'Northern Virginia', stateCode: 'VA', latitude: 38.8816, longitude: -77.091, lookupNames: ['Arlington'] },
  { areaName: 'Richmond - Fort Lee', stateCode: 'VA', latitude: 37.5407, longitude: -77.436, aliases: ['Fort Gregg-Adams', 'Fort Lee'], lookupNames: ['Richmond'] },
  { areaName: 'Killeen - Fort Hood', stateCode: 'TX', latitude: 31.1171, longitude: -97.7278, aliases: ['Fort Cavazos', 'Fort Hood', 'Killeen'] },
  { areaName: 'Austin', stateCode: 'TX', latitude: 30.2672, longitude: -97.7431 },
  { areaName: 'San Antonio', stateCode: 'TX', latitude: 29.4241, longitude: -98.4936 },
  { areaName: 'El Paso', stateCode: 'TX', latitude: 31.7619, longitude: -106.485 },
  { areaName: 'Dallas-Fort Worth', stateCode: 'TX', latitude: 32.7767, longitude: -96.797, aliases: ['DFW'], lookupNames: ['Dallas'] },
  { areaName: 'Houston', stateCode: 'TX', latitude: 29.7604, longitude: -95.3698 },
  { areaName: 'Joint Base Lewis-McChord', stateCode: 'WA', latitude: 47.1054, longitude: -122.5663, aliases: ['JBLM', 'Fort Lewis', 'McChord AFB'], lookupNames: ['Tacoma'] },
  { areaName: 'Bangor - Bremerton', stateCode: 'WA', latitude: 47.565, longitude: -122.627, lookupNames: ['Bremerton'] },
  { areaName: 'Seattle', stateCode: 'WA', latitude: 47.6062, longitude: -122.3321 },
  { areaName: 'Spokane', stateCode: 'WA', latitude: 47.6588, longitude: -117.426 },
  { areaName: 'Whidbey Island', stateCode: 'WA', latitude: 48.2856, longitude: -122.6459, lookupNames: ['Oak Harbor'] },
  { areaName: 'Tampa', stateCode: 'FL', latitude: 27.9506, longitude: -82.4572, aliases: ['MacDill AFB'] },
  { areaName: 'Jacksonville', stateCode: 'FL', latitude: 30.3322, longitude: -81.6557 },
  { areaName: 'Eglin AFB', stateCode: 'FL', latitude: 30.4832, longitude: -86.5254, lookupNames: ['Valparaiso'] },
  { areaName: 'Cape Canaveral', stateCode: 'FL', latitude: 28.3922, longitude: -80.6077 },
  { areaName: 'Fayetteville', stateCode: 'NC', latitude: 35.0527, longitude: -78.8784, aliases: ['Fort Liberty', 'Fort Bragg'] },
  { areaName: 'Jacksonville', stateCode: 'NC', latitude: 34.7541, longitude: -77.4302 },
  { areaName: 'Raleigh - Durham', stateCode: 'NC', latitude: 35.7796, longitude: -78.6382, lookupNames: ['Raleigh'] },
  { areaName: 'Elizabeth City', stateCode: 'NC', latitude: 36.2946, longitude: -76.2511 },
  { areaName: 'Charlotte', stateCode: 'NC', latitude: 35.2271, longitude: -80.8431 },
  { areaName: 'Southern Pines', stateCode: 'NC', latitude: 35.174, longitude: -79.3923 },
];

export const AMBIGUOUS_CITY_CANDIDATES: Record<string, readonly ClarificationCandidate[]> = {
  springfield: [
    { name: 'Springfield', stateName: 'Missouri', stateCode: 'MO', reason: 'Common PCS destination name in Missouri.' },
    { name: 'Springfield', stateName: 'Illinois', stateCode: 'IL', reason: 'Common city name in Illinois.' },
    { name: 'Springfield', stateName: 'Massachusetts', stateCode: 'MA', reason: 'Common city name in Massachusetts.' },
    { name: 'Springfield', stateName: 'Virginia', stateCode: 'VA', reason: 'Northern Virginia city with the same name.' },
  ],
};

export function asCoordinates(value: Coordinates | undefined): Coordinates | undefined {
  if (!value) return undefined;
  if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
    return undefined;
  }
  return value;
}

export function stateFromInstallation(entry: InstallationAlias): RoutingState {
  return { code: entry.stateCode, name: entry.stateName, slug: entry.stateSlug };
}
