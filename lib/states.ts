export const STATE_ABBR_TO_SLUG: Record<string, string> = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DC: 'washington-dc',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  HI: 'hawaii',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  IA: 'iowa',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  ME: 'maine',
  MD: 'maryland',
  MA: 'massachusetts',
  MI: 'michigan',
  MN: 'minnesota',
  MS: 'mississippi',
  MO: 'missouri',
  MT: 'montana',
  NE: 'nebraska',
  NV: 'nevada',
  NH: 'new-hampshire',
  NJ: 'new-jersey',
  NM: 'new-mexico',
  NY: 'new-york',
  NC: 'north-carolina',
  ND: 'north-dakota',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  PR: 'puerto-rico',
  RI: 'rhode-island',
  SC: 'south-carolina',
  SD: 'south-dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VT: 'vermont',
  VA: 'virginia',
  WA: 'washington',
  WV: 'west-virginia',
  WI: 'wisconsin',
  WY: 'wyoming',
};

export const STATE_SLUG_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_SLUG).map(([abbr, slug]) => [slug, abbr]),
);

function normalizeStateInput(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function stateSlugFromAbbr(abbr: string | null | undefined): string | null {
  const normalized = normalizeStateInput(abbr);
  if (!normalized) return null;
  return STATE_ABBR_TO_SLUG[normalized.toUpperCase()] ?? null;
}

export function stateAbbrFromSlug(slug: string | null | undefined): string | null {
  const normalized = normalizeStateInput(slug);
  if (!normalized) return null;
  return STATE_SLUG_TO_ABBR[normalized.toLowerCase()] ?? null;
}

export function normalizeStateCode(value: string | null | undefined): string | null {
  const normalized = normalizeStateInput(value);
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (STATE_ABBR_TO_SLUG[upper]) return upper;

  return stateAbbrFromSlug(normalized);
}

export function normalizeStateSlug(value: string | null | undefined): string | null {
  const normalized = normalizeStateInput(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (STATE_SLUG_TO_ABBR[lower]) return lower;

  return stateSlugFromAbbr(normalized);
}

export function formatStateLabel(value: string | null | undefined): string {
  const slug = normalizeStateSlug(value);
  if (!slug) return value?.trim() ?? '';

  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStateFullNames(abbreviations: string[]): string[] {
  if (!Array.isArray(abbreviations)) return [];
  return abbreviations
    .map((abbr) => STATE_ABBR_TO_SLUG[abbr] ?? '')
    .filter(Boolean);
}
