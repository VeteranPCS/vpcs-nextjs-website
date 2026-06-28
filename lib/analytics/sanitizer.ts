export const ANALYTICS_SCHEMA_VERSION = 1;

export type JourneyStage = 'top' | 'mid' | 'bottom' | 'outcome';

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, unknown>;

const BLOCKED_KEY_RE =
  /(^|_)(name|first_name|firstname|last_name|lastname|email|e_mail|phone|mobile|tel|street|address|captcha|message|comment|comments|free_text|payload|form_data|query|search_query|raw_text|text|zip_code|zipcode|zip)$/i;
const SAFE_BLOCKED_KEY_EXCEPTIONS = new Set([
  'has_name',
  'has_email',
  'has_phone',
  'calculator_name',
  'tool_name',
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LONG_PHONE_RE = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const FULL_ZIP_RE = /^\d{5}(?:-\d{4})?$/;
const UNSAFE_URL_RE = /^https?:\/\/.+[?&][^#]+/i;

const ALLOWED_ATTRIBUTION_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'referrer_domain',
  'landing_page_path',
  'captured_at',
]);

const SAFE_ERROR_CODE_FIELDS = new Set([
  'email',
  'phone',
  'firstName',
  'firstname',
  'first_name',
  'lastName',
  'lastname',
  'last_name',
]);

function isBlockedKey(key: string): boolean {
  return !SAFE_BLOCKED_KEY_EXCEPTIONS.has(key) && BLOCKED_KEY_RE.test(key);
}

export function safePath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.trim()) return undefined;

  try {
    const url = value.startsWith('http')
      ? new URL(value)
      : new URL(value, 'https://www.veteranpcs.com');
    return url.pathname || '/';
  } catch {
    const [path] = value.split(/[?#]/);
    if (!path.startsWith('/')) return undefined;
    return path || '/';
  }
}

export function safeReferrerDomain(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

export function bucketCount(value: number): string {
  if (value <= 0) return '0';
  if (value === 1) return '1';
  if (value <= 3) return '2_3';
  if (value <= 10) return '4_10';
  return '11_plus';
}

export function resultBucket(value: number): string {
  if (value <= 0) return '0';
  if (value <= 3) return '1_3';
  if (value <= 10) return '4_10';
  return '11_plus';
}

export function zipPrefix(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : undefined;
}

export function hasPii(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed)
    || LONG_PHONE_RE.test(trimmed)
    || FULL_ZIP_RE.test(trimmed)
    || UNSAFE_URL_RE.test(trimmed);
}

function cleanScalar(key: string, value: unknown): AnalyticsValue {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (key.endsWith('_path') || key === 'destination_path' || key === 'source_page_path') {
    return safePath(trimmed);
  }

  if (key === 'zip_prefix') {
    return /^\d{3}$/.test(trimmed) ? trimmed : undefined;
  }

  if (key === 'state_code') {
    return /^[A-Z]{2}$/.test(trimmed.toUpperCase()) ? trimmed.toUpperCase() : undefined;
  }

  if (hasPii(trimmed)) return undefined;

  return trimmed.slice(0, 256);
}

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {},
): Record<string, AnalyticsValue | AnalyticsValue[] | Record<string, AnalyticsValue>> {
  const clean: Record<string, AnalyticsValue | AnalyticsValue[] | Record<string, AnalyticsValue>> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (isBlockedKey(key)) continue;

    if (Array.isArray(value)) {
      const values = value
        .map((entry) => cleanScalar(key, entry))
        .filter((entry): entry is Exclude<AnalyticsValue, undefined> => entry !== undefined);
      if (values.length > 0) clean[key] = values;
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const nested: Record<string, AnalyticsValue> = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (!ALLOWED_ATTRIBUTION_KEYS.has(nestedKey)) continue;
        const safeValue = nestedKey === 'landing_page_path'
          ? safePath(nestedValue)
          : cleanScalar(nestedKey, nestedValue);
        if (safeValue !== undefined) nested[nestedKey] = safeValue;
      }
      if (Object.keys(nested).length > 0) clean[key] = nested;
      continue;
    }

    const safeValue = cleanScalar(key, value);
    if (safeValue !== undefined) clean[key] = safeValue;
  }

  return clean;
}

export function errorCodesFromErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object') return ['unknown'];
  return Object.keys(errors as Record<string, unknown>)
    .filter((key) => SAFE_ERROR_CODE_FIELDS.has(key) || !isBlockedKey(key))
    .map((key) => key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())
    .slice(0, 12);
}

export function queryMetrics(query: string) {
  const trimmed = query.trim();
  return {
    query_length: trimmed.length,
    query_word_count: trimmed ? trimmed.split(/\s+/).length : 0,
  };
}
