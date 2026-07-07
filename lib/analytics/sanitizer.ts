export const ANALYTICS_SCHEMA_VERSION = 1;

export type JourneyStage = 'top' | 'mid' | 'bottom' | 'outcome';

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, unknown>;
export type SanitizedAnalyticsProperties = Record<
  string,
  AnalyticsValue | AnalyticsValue[] | Record<string, AnalyticsValue>
>;
export type SanitizedExceptionProperties = Record<string, unknown>;

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
const EMAIL_GLOBAL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_PHONE_RE = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;
const LONG_PHONE_GLOBAL_RE = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
const FULL_ZIP_RE = /^\d{5}(?:-\d{4})?$/;
const FULL_ZIP_GLOBAL_RE = /\b\d{5}(?:-\d{4})?\b/g;
const UNSAFE_URL_RE = /^https?:\/\/.+[?&][^#]+/i;
const URL_GLOBAL_RE = /https?:\/\/[^\s"'<>]+/gi;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    const [path = ''] = value.split(/[?#]/);
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

function urlToSafePath(value: string): string {
  const trailingMatch = /[.,;:!?]+$/.exec(value);
  const trailing = trailingMatch?.[0] ?? '';
  const rawUrl = trailing ? value.slice(0, -trailing.length) : value;

  try {
    const url = new URL(rawUrl);
    return `${url.pathname || '/'}${trailing}`;
  } catch {
    return `[redacted_url]${trailing}`;
  }
}

export function redactAnalyticsText(value: string, maxLength = 512): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const clean = trimmed
    .replace(URL_GLOBAL_RE, urlToSafePath)
    .replace(EMAIL_GLOBAL_RE, '[redacted_email]')
    .replace(LONG_PHONE_GLOBAL_RE, '[redacted_phone]')
    .replace(FULL_ZIP_GLOBAL_RE, '[redacted_zip]')
    .slice(0, maxLength)
    .trim();

  return clean || undefined;
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
): SanitizedAnalyticsProperties {
  const clean: SanitizedAnalyticsProperties = {};

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

function cleanExceptionText(value: unknown, maxLength = 512): string | undefined {
  return typeof value === 'string' ? redactAnalyticsText(value, maxLength) : undefined;
}

function cleanExceptionNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanExceptionBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function sanitizeExceptionFrame(frame: unknown): Record<string, unknown> | undefined {
  if (!isRecord(frame)) return undefined;

  const clean: Record<string, unknown> = {};

  for (const key of ['filename', 'abs_path', 'function', 'module']) {
    const value = cleanExceptionText(frame[key], key === 'function' || key === 'module' ? 256 : 1024);
    if (value !== undefined) clean[key] = value;
  }

  for (const key of ['lineno', 'colno', 'line', 'column']) {
    const value = cleanExceptionNumber(frame[key]);
    if (value !== undefined) clean[key] = value;
  }

  const inApp = cleanExceptionBoolean(frame.in_app);
  if (inApp !== undefined) clean.in_app = inApp;

  return Object.keys(clean).length > 0 ? clean : undefined;
}

function sanitizeExceptionFrames(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const frames = value
    .map(sanitizeExceptionFrame)
    .filter((frame): frame is Record<string, unknown> => frame !== undefined);

  return frames.length > 0 ? frames : undefined;
}

function sanitizeExceptionStacktrace(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;

  const frames = sanitizeExceptionFrames(value.frames);
  if (!frames) return undefined;

  return { frames };
}

function sanitizeExceptionMechanism(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;

  const clean: Record<string, unknown> = {};
  const type = cleanExceptionText(value.type, 128);
  const handled = cleanExceptionBoolean(value.handled);
  const synthetic = cleanExceptionBoolean(value.synthetic);

  if (type !== undefined) clean.type = type;
  if (handled !== undefined) clean.handled = handled;
  if (synthetic !== undefined) clean.synthetic = synthetic;

  return Object.keys(clean).length > 0 ? clean : undefined;
}

function sanitizeExceptionItem(item: unknown): Record<string, unknown> | undefined {
  if (!isRecord(item)) return undefined;

  const clean: Record<string, unknown> = {};
  const type = cleanExceptionText(item.type, 256);
  const value = cleanExceptionText(item.value, 1024);
  const stacktrace = sanitizeExceptionStacktrace(item.stacktrace);
  const mechanism = sanitizeExceptionMechanism(item.mechanism);
  const hasExceptionDetail = type !== undefined || value !== undefined || stacktrace !== undefined;

  if (!hasExceptionDetail) return undefined;

  if (type !== undefined) clean.type = type;
  if (value !== undefined) clean.value = value;
  if (stacktrace !== undefined) clean.stacktrace = stacktrace;
  if (mechanism !== undefined) clean.mechanism = mechanism;

  return Object.keys(clean).length > 0 ? clean : undefined;
}

export function sanitizeExceptionList(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const exceptions = value
    .map(sanitizeExceptionItem)
    .filter((item): item is Record<string, unknown> => item !== undefined);

  return exceptions.length > 0 ? exceptions : undefined;
}

function sanitizeExceptionTextArray(value: unknown, maxLength = 512): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const clean = value
    .map((entry) => cleanExceptionText(entry, maxLength))
    .filter((entry): entry is string => entry !== undefined);

  return clean.length > 0 ? clean : undefined;
}

function sanitizeExceptionFingerprint(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') return cleanExceptionText(value, 512);

  const values = sanitizeExceptionTextArray(value, 512);
  return values && values.length > 0 ? values : undefined;
}

export function sanitizeExceptionProperties(
  properties: AnalyticsProperties = {},
): SanitizedExceptionProperties | undefined {
  const exceptionList = sanitizeExceptionList(properties.$exception_list);
  if (!exceptionList) return undefined;

  const clean: SanitizedExceptionProperties = sanitizeAnalyticsProperties(properties);

  clean.$exception_list = exceptionList;
  delete clean.$exception_steps;

  const exceptionFrames = sanitizeExceptionFrames(properties.$exception_frames);
  if (exceptionFrames) clean.$exception_frames = exceptionFrames;

  const exceptionTypes = sanitizeExceptionTextArray(properties.$exception_types, 256);
  if (exceptionTypes) clean.$exception_types = exceptionTypes;

  const exceptionValues = sanitizeExceptionTextArray(properties.$exception_values, 1024);
  if (exceptionValues) clean.$exception_values = exceptionValues;

  const exceptionFingerprint = sanitizeExceptionFingerprint(properties.$exception_fingerprint);
  if (exceptionFingerprint !== undefined) clean.$exception_fingerprint = exceptionFingerprint;

  const exceptionLevel = cleanExceptionText(properties.$exception_level, 64);
  if (exceptionLevel !== undefined) clean.$exception_level = exceptionLevel;

  const exceptionHandled = cleanExceptionBoolean(properties.$exception_handled);
  if (exceptionHandled !== undefined) clean.$exception_handled = exceptionHandled;

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
