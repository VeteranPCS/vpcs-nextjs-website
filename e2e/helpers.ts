import { expect, type Page, type Request } from '@playwright/test';
import { gunzipSync } from 'node:zlib';
export async function assertNoOverflow(page:Page) {
  const widths=await page.evaluate(() => ({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
}
export async function fixtureImpact(page:Page) {
  await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:true,data:{available:true,cashBackAmount:'$676,500',charityAmount:'$66,270',totalVolumeSold:'$189 Million'}}}));
}
export type CapturedEvent = { event: string; properties: Record<string, unknown> };
function decodeEvents(request: Request): CapturedEvent[] {
  const buffer = request.postDataBuffer();
  if (!buffer) return [];
  let value: unknown;
  if (new URL(request.url()).searchParams.get('compression') === 'gzip-js') {
    value = JSON.parse(gunzipSync(buffer).toString('utf8'));
  } else {
    const body = buffer.toString('utf8');
    const data = new URLSearchParams(body).get('data');
    value = JSON.parse(data ? Buffer.from(data, 'base64').toString('utf8') : body);
  }
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.filter((event): event is CapturedEvent => Boolean(event && typeof event === 'object' && 'event' in event && 'properties' in event));
}
/**
 * Captures PostHog SDK traffic locally and answers the flags request with `flags`.
 * Installed before navigation: no request is ever proxied to real ingestion.
 */
export async function interceptTelemetry(page: Page, flags: Record<string, string | boolean> = {}) {
  const events: CapturedEvent[] = [], decodeFailures: string[] = [];
  await page.addInitScript(() => {
    // Reproduce the live UUID whose decimal run was mistaken for a phone number.
    localStorage.setItem('vpcs_visitor_id', 'vpcs_d8a351ef-9f74-43bc-826a-6111857758b5');
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });
  await page.context().route(url => url.pathname.startsWith('/ingest') || url.hostname.endsWith('.posthog.com') || url.hostname === 'posthog.com', async route => {
    const request = route.request();
    if (/\/(?:e|batch)\/?$/.test(new URL(request.url()).pathname)) {
      try { events.push(...decodeEvents(request)); } catch { decodeFailures.push('Unable to decode intercepted SDK event batch'); }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
    } else if (new URL(request.url()).pathname.endsWith('.js')) {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ featureFlags: flags, featureFlagPayloads: {}, supportedCompression: ['gzip-js'] }) });
    }
  });
  await page.context().route(url => /(?:google-analytics\.com|analytics\.google\.com|googletagmanager\.com|bing\.com)$/.test(url.hostname), route => route.fulfill({ status: 204, body: '' }));
  return { events, decodeFailures };
}
