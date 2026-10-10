import { test, expect, type Page, type Request } from '@playwright/test';
import { gunzipSync } from 'node:zlib';
import { fixtureImpact } from './helpers';

// Real SDK drops automation UAs/webdriver; emulate a human browser only in this test context.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });
type CapturedEvent = { event: string; properties: Record<string, unknown> };
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
async function interceptTelemetry(page: Page) {
  const events: CapturedEvent[] = [], decodeFailures: string[] = [];
  // Installed before navigation: no request is ever proxied to real ingestion.
  await page.addInitScript(() => {
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"featureFlags":{},"featureFlagPayloads":{},"supportedCompression":["gzip-js"]}' });
    }
  });
  await page.context().route(url => /(?:google-analytics\.com|analytics\.google\.com|googletagmanager\.com|bing\.com)$/.test(url.hostname), route => route.fulfill({ status: 204, body: '' }));
  return { events, decodeFailures };
}
const surfaces = [
  { name: 'featured VA', kind: 'va', location: 'featured_resources', position: 'card', query: '', strip: false, retry: true },
  { name: 'library VA', kind: 'va', location: 'resource_library', position: 'card', query: '?view=all', strip: false },
  { name: 'library homebuyer', kind: 'homebuyer', location: 'resource_library', position: 'card', query: '?view=all', strip: false },
  { name: 'strip VA', kind: 'va', location: 'resources_guide_strip', position: 'inline', query: '', strip: true },
  { name: 'strip homebuyer', kind: 'homebuyer', location: 'resources_guide_strip', position: 'inline', query: '', strip: true },
] as const;
for (const surface of surfaces) test(`Resources ${surface.name} emits private-safe SDK downloads`, async ({ page }, testInfo) => {
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1' || process.env.E2E_POSTHOG_LOCAL_CAPTURE !== '1', 'Requires a loopback dry-run server with explicit local SDK capture enabled');
  const telemetry = await interceptTelemetry(page);
  await fixtureImpact(page);
  let attempts = 0;
  await page.route('**/pcs-resources**', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      attempts += 1;
      if ('retry' in surface && surface.retry && attempts === 1) { await route.abort('failed'); return; }
    }
    await route.continue();
  });
  const query = surface.query ? `${surface.query}&private_query=do-not-record-this` : '?private_query=do-not-record-this';
  await page.goto(`/pcs-resources${query}`);
  await expect(page.locator('[data-site-header]')).toContainText('$676,500');
  const title = surface.kind === 'va' ? 'Free VA Loan Guide' : 'Free First-Time Homebuyer Guide';
  const guideId = surface.kind === 'va' ? 'va_loan_guide' : 'first_time_homebuyer_guide';
  const file = surface.kind === 'va' ? 'VA-Loan-Guide.pdf' : 'first-time-home-buyer-guide.pdf';
  const trigger = surface.strip
    ? page.getByRole('region', { name: 'Free downloadable guides' }).getByRole('button', { name: surface.kind === 'va' ? 'Get VA Loan Guide' : 'Get Homebuyer Guide' })
    : page.locator('#resource-library article').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button', { name: 'Download Guide' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: title });
  const downloads = () => telemetry.events.filter(event => event.event.startsWith('guide_download_'));
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  await expect(dialog.getByLabel('First name')).toBeFocused();
  await dialog.getByLabel('First name').fill('TelemetryGiven');
  await dialog.getByLabel('Last name').fill('TelemetryFamily');
  await dialog.getByLabel('Email', { exact: true }).fill('invalid-email');
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  expect(attempts).toBe(0);
  expect(downloads()).toHaveLength(0);
  await dialog.getByLabel('Email', { exact: true }).fill('telemetry-private@example.com');
  if ('retry' in surface && surface.retry) {
    await dialog.getByRole('button', { name: 'Get my guide' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Please try again');
    await expect.poll(() => downloads().map(event => event.event), { timeout: 15000 }).toEqual(['guide_download_requested']);
  }
  const automaticDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  await expect(dialog.getByRole('status')).toContainText('Your guide is ready');
  const downloaded = await automaticDownload;
  expect(downloaded.suggestedFilename()).toBe(file);
  expect(await downloaded.failure()).toBeNull();
  const automaticPath = await downloaded.path();
  expect(automaticPath).toBeTruthy();
  const pdfResponse = await page.request.get(`/downloads/${file}`);
  expect(pdfResponse.ok()).toBe(true);
  expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const manualDownload = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Download guide' }).click();
  expect((await manualDownload).suggestedFilename()).toBe(file);
  const expected = 'retry' in surface && surface.retry
    ? ['guide_download_requested', 'guide_download_requested', 'guide_download_started', 'guide_download_requested', 'guide_download_started']
    : ['guide_download_requested', 'guide_download_started', 'guide_download_requested', 'guide_download_started'];
  await expect.poll(() => downloads().map(event => event.event), { timeout: 15000 }).toEqual(expected);
  expect(attempts).toBe('retry' in surface && surface.retry ? 2 : 1);
  expect(telemetry.decodeFailures).toEqual([]);
  const openingEvent = telemetry.events.find(event => event.event === 'cta_clicked' && event.properties.guide_id === guideId);
  expect(openingEvent?.properties).toMatchObject({ cta_intent: 'download_guide', cta_location: surface.location });
  for (const event of downloads()) {
    expect(event.properties).toMatchObject({ guide_id: guideId, form_id: guideId, source_page_path: '/pcs-resources', destination_path: `/downloads/${file}`, cta_component: 'lead_capture_dialog', cta_location: surface.location, cta_position: surface.position, page_type: 'pcs_resources' });
    expect(event.properties.$current_url).toBeUndefined();
    expect(event.properties.$initial_current_url).toBeUndefined();
  }
  expect(downloads().slice(-2).map(event => event.properties.download_trigger)).toEqual(['manual_link', 'manual_link']);
  const serialized = JSON.stringify(telemetry.events.map(event => event.properties));
  for (const privateValue of ['TelemetryGiven', 'TelemetryFamily', 'telemetry-private@example.com', 'do-not-record-this']) expect(serialized).not.toContain(privateValue);
  expect(telemetry.events.some(event => event.event === 'lead_conversion_created')).toBe(false);
  // Export only a property allowlist: no project token, distinct/session/device IDs or personal input.
  const keys = ['guide_id', 'form_id', 'cta_id', 'cta_intent', 'cta_location', 'cta_position', 'cta_component', 'page_type', 'source_page_path', 'destination_path', 'download_trigger', 'has_email'];
  await testInfo.attach('sanitized-guide-event-evidence', { body: JSON.stringify(downloads().map(event => ({ event: event.event, properties: Object.fromEntries(keys.filter(key => key in event.properties).map(key => [key, event.properties[key]])) })), null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('guide-download-success.png'), caret: 'initial' });
});
