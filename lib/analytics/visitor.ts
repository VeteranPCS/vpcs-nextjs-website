'use client';

import {
  safePath,
  safeReferrerDomain,
  sanitizeAnalyticsProperties,
  type AnalyticsValue,
} from '@/lib/analytics/sanitizer';

const VISITOR_ID_KEY = 'vpcs_visitor_id';
const FIRST_TOUCH_KEY = 'vpcs_first_touch';
const LAST_TOUCH_KEY = 'vpcs_last_touch';
const COUNTERS_KEY = 'vpcs_analytics_counters';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const CAMPAIGN_PARAM_ALLOWLIST = [
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
] as const;

export type CampaignParam = (typeof CAMPAIGN_PARAM_ALLOWLIST)[number];

export type AttributionSnapshot = Partial<Record<CampaignParam, string>> & {
  referrer_domain?: string;
  landing_page_path?: string;
  captured_at?: string;
};

export interface AnalyticsCounters {
  pageview_count_before_conversion: number;
  cta_click_count_before_conversion: number;
  form_attempt_count_before_conversion: number;
}

export interface ClientAnalyticsContext extends AnalyticsCounters {
  vpcs_visitor_id: string;
  source_page_path: string;
  first_touch_attribution?: AttributionSnapshot;
  last_touch_attribution?: AttributionSnapshot;
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isValidVisitorId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^vpcs_[a-zA-Z0-9-]{16,80}$/.test(value);
}

export function generateVisitorId(): string {
  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
  return `vpcs_${random}`;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

function setVisitorCookie(visitorId: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${VISITOR_ID_KEY}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function getOrCreateVisitorId(): string {
  if (!hasBrowserStorage()) return generateVisitorId();

  const stored = window.localStorage.getItem(VISITOR_ID_KEY);
  if (isValidVisitorId(stored)) {
    setVisitorCookie(stored);
    return stored;
  }

  const fromCookie = getCookieValue(VISITOR_ID_KEY);
  if (isValidVisitorId(fromCookie)) {
    window.localStorage.setItem(VISITOR_ID_KEY, fromCookie);
    return fromCookie;
  }

  const visitorId = generateVisitorId();
  window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
  setVisitorCookie(visitorId);
  return visitorId;
}

function readJson<T>(key: string): T | undefined {
  if (!hasBrowserStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasBrowserStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browsers can reject storage in private modes; analytics should degrade quietly.
  }
}

function currentAttributionSnapshot(): AttributionSnapshot {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const snapshot: AttributionSnapshot = {};

  for (const key of CAMPAIGN_PARAM_ALLOWLIST) {
    const value = params.get(key);
    if (value && !/[?&#]/.test(value)) {
      snapshot[key] = value.slice(0, 160);
    }
  }

  const referrerDomain = safeReferrerDomain(document.referrer);
  if (referrerDomain && referrerDomain !== window.location.hostname.replace(/^www\./, '')) {
    snapshot.referrer_domain = referrerDomain;
  }

  snapshot.landing_page_path = safePath(window.location.pathname) ?? '/';
  snapshot.captured_at = new Date().toISOString();
  return sanitizeAnalyticsProperties(snapshot as Record<string, AnalyticsValue>) as AttributionSnapshot;
}

function hasAttributionSignal(snapshot: AttributionSnapshot): boolean {
  return Object.keys(snapshot).some((key) => key !== 'landing_page_path' && key !== 'captured_at');
}

export function captureAttributionFromLocation(): void {
  if (!hasBrowserStorage()) return;

  const snapshot = currentAttributionSnapshot();
  const existingFirst = readJson<AttributionSnapshot>(FIRST_TOUCH_KEY);
  if (!existingFirst) {
    writeJson(FIRST_TOUCH_KEY, snapshot);
  }

  if (hasAttributionSignal(snapshot) || !readJson<AttributionSnapshot>(LAST_TOUCH_KEY)) {
    writeJson(LAST_TOUCH_KEY, snapshot);
  }
}

export function getAttributionSnapshots() {
  return {
    first_touch_attribution: readJson<AttributionSnapshot>(FIRST_TOUCH_KEY),
    last_touch_attribution: readJson<AttributionSnapshot>(LAST_TOUCH_KEY),
  };
}

function getCounters(): AnalyticsCounters {
  return {
    pageview_count_before_conversion: 0,
    cta_click_count_before_conversion: 0,
    form_attempt_count_before_conversion: 0,
    ...readJson<Partial<AnalyticsCounters>>(COUNTERS_KEY),
  };
}

function writeCounters(counters: AnalyticsCounters): void {
  writeJson(COUNTERS_KEY, counters);
}

export function incrementAnalyticsCounter(
  counter: keyof AnalyticsCounters,
): AnalyticsCounters {
  const counters = getCounters();
  counters[counter] += 1;
  writeCounters(counters);
  return counters;
}

export function getClientAnalyticsContext(): ClientAnalyticsContext {
  const { first_touch_attribution, last_touch_attribution } = getAttributionSnapshots();
  return {
    vpcs_visitor_id: getOrCreateVisitorId(),
    source_page_path: safePath(typeof window !== 'undefined' ? window.location.pathname : '/') ?? '/',
    ...getCounters(),
    ...(first_touch_attribution ? { first_touch_attribution } : {}),
    ...(last_touch_attribution ? { last_touch_attribution } : {}),
  };
}
