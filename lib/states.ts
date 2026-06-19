import { US_STATES } from '@/constants/usStates';

export const STATE_ABBR_TO_SLUG: Record<string, string> = Object.fromEntries(
  US_STATES.map((state) => [state.code, state.slug]),
);

export const STATE_SLUG_TO_ABBR: Record<string, string> = Object.fromEntries(
  US_STATES.map((state) => [state.slug, state.code]),
);

export const STATE_ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  US_STATES.map((state) => [state.code, state.name]),
);

export const STATE_SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  US_STATES.map((state) => [state.slug, state.name]),
);

function normalizeStateInput(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugifyStateInput(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function compactStateInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const STATE_NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  US_STATES.map((state) => [compactStateInput(state.name), state.code]),
);

const STATE_ALIAS_TO_ABBR: Record<string, string> = {
  dc: 'DC',
  dca: 'DC',
  districtcolumbia: 'DC',
  districtofcolumbia: 'DC',
  washingtondc: 'DC',
};

function stateCodeFromDisplayName(value: string): string | null {
  const compact = compactStateInput(value);
  return STATE_NAME_TO_ABBR[compact] ?? STATE_ALIAS_TO_ABBR[compact] ?? null;
}

export function stateSlugFromAbbr(abbr: string | null | undefined): string | null {
  const normalized = normalizeStateInput(abbr);
  if (!normalized) return null;
  return STATE_ABBR_TO_SLUG[normalized.toUpperCase()] ?? null;
}

export function stateAbbrFromSlug(slug: string | null | undefined): string | null {
  const normalized = normalizeStateInput(slug);
  if (!normalized) return null;
  return STATE_SLUG_TO_ABBR[slugifyStateInput(normalized)] ?? null;
}

export function normalizeStateCode(value: string | null | undefined): string | null {
  const normalized = normalizeStateInput(value);
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (STATE_ABBR_TO_SLUG[upper]) return upper;

  return stateAbbrFromSlug(normalized) ?? stateCodeFromDisplayName(normalized);
}

export function normalizeStateSlug(value: string | null | undefined): string | null {
  const code = normalizeStateCode(value);
  return code ? STATE_ABBR_TO_SLUG[code] : null;
}

export function formatStateLabel(value: string | null | undefined): string {
  const code = normalizeStateCode(value);
  if (!code) return value?.trim() ?? '';
  return STATE_ABBR_TO_NAME[code] ?? value?.trim() ?? '';
}

export function getStateFullNames(abbreviations: string[]): string[] {
  if (!Array.isArray(abbreviations)) return [];
  return abbreviations
    .map((abbr) => STATE_ABBR_TO_NAME[normalizeStateCode(abbr) ?? ''] ?? '')
    .filter(Boolean);
}
