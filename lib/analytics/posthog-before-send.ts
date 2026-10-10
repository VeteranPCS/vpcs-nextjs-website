import type { CaptureResult } from 'posthog-js';
import {
  sanitizeAnalyticsProperties,
  sanitizeExceptionProperties,
  safePath,
} from '@/lib/analytics/sanitizer';

const PRODUCTION_POSTHOG_HOSTS = new Set(['www.veteranpcs.com', 'veteranpcs.com']);
const LOCAL_POSTHOG_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

interface PostHogInitOptions {
  enableLocalCapture?: boolean;
}

export function shouldInitializePostHog(
  hostname: string | undefined,
  options: PostHogInitOptions = {},
): boolean {
  if (!hostname) return false;

  const normalizedHost = hostname.toLowerCase();
  if (PRODUCTION_POSTHOG_HOSTS.has(normalizedHost)) return true;

  const enableLocalCapture = options.enableLocalCapture
    ?? process.env.NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL_CAPTURE === '1';

  return enableLocalCapture && LOCAL_POSTHOG_HOSTS.has(normalizedHost);
}

/** SDK person updates live beside properties, so they need their own privacy pass. */
function sanitizePersonUpdate(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const properties = { ...value as Record<string, unknown> };
  const urlFields = {
    $current_url: '$pathname',
    $initial_current_url: '$initial_pathname',
    $referrer: '$referring_path',
    $initial_referrer: '$initial_referring_path',
  } as const;
  for (const [urlKey, pathKey] of Object.entries(urlFields)) {
    const path = safePath(properties[urlKey] ?? properties[pathKey]);
    delete properties[urlKey];
    delete properties[pathKey];
    if (path) properties[pathKey] = path;
  }
  return sanitizeAnalyticsProperties(properties);
}

export function sanitizePostHogBeforeSendEvent(
  event: CaptureResult | null,
  visitorId: string,
): CaptureResult | null {
  if (!event) return event;

  const originalProperties = event.properties as Record<string, unknown> | undefined;
  if (!originalProperties && event.event === '$exception') return null;

  const properties = { ...originalProperties };
  const currentPath = safePath(properties.$current_url);
  const referrerPath = safePath(properties.$referrer);

  delete properties.$current_url;
  delete properties.$referrer;
  delete properties.$initial_current_url;
  delete properties.$initial_referrer;

  const cleanProperties = event.event === '$exception'
    ? sanitizeExceptionProperties(properties)
    : sanitizeAnalyticsProperties(properties);

  if (!cleanProperties) return null;

  return {
    ...event,
    ...(event.$set ? { $set: sanitizePersonUpdate(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: sanitizePersonUpdate(event.$set_once) } : {}),
    properties: {
      ...cleanProperties,
      ...(currentPath ? { $pathname: currentPath } : {}),
      ...(referrerPath ? { $referring_path: referrerPath } : {}),
      vpcs_visitor_id: visitorId,
    },
  };
}
