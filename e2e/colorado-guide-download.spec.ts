import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { COLORADO_RELOCATION_GUIDE as guide } from '../lib/guides/colorado-relocation';
import { assertNoOverflow, interceptTelemetry } from './helpers';

const PDF_SHA256 = 'b816103bade949338238a93ec77ad930f95a65a04128fbb04d95aa4bf95227e1';
const privateValues = ['ColoradoTelemetryGiven', 'ColoradoTelemetryFamily', 'colorado-telemetry-private@example.com', 'private-colorado-query'];

// Exercise the real SDK locally; ingestion is intercepted before navigation.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });

async function googleDownloads(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => {
    const layer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? [];
    return layer.filter((entry): entry is Record<string, unknown> => Boolean(
      entry && typeof entry === 'object' && 'event' in entry && entry.event === 'conversion_download',
    ));
  });
}

test('Colorado guide captures a private-safe download after accepted dry-run submission', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1' || process.env.E2E_POSTHOG_LOCAL_CAPTURE !== '1', 'Requires a loopback dry-run server with explicit local SDK capture enabled');
  const pageErrors: string[] = [];
  page.on('pageerror', error => { pageErrors.push(error.message); });
  const telemetry = await interceptTelemetry(page);
  const downloads = () => telemetry.events.filter(event => event.event.startsWith('guide_download_'));
  let attempts = 0;
  let releaseAcceptedRequest: (() => void) | undefined;
  const acceptedRequestGate = new Promise<void>(resolve => { releaseAcceptedRequest = resolve; });
  await page.route('**/colorado**', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      attempts += 1;
      // First attempt never reaches the server; the retry uses its real dry-run action.
      if (attempts === 1) { await route.abort('failed'); return; }
      if (attempts === 2) await acceptedRequestGate;
    }
    await route.continue();
  });

  try {
    // Use the normal state page data path, including read-only Salesforce partner queries.
    await page.goto(`${guide.pagePath}?private_query=private-colorado-query`);
    await expect(page).toHaveTitle(/Colorado/);
    const trigger = page.getByRole('button', { name: 'Download Now', exact: true });
    await expect(trigger).toBeEnabled();
    await assertNoOverflow(page);
    const promotion = page.getByRole('region', { name: guide.title, exact: true });
    await promotion.scrollIntoViewIfNeeded();
    await promotion.screenshot({ path: testInfo.outputPath('colorado-guide-promotion.png'), caret: 'initial' });
    const contact = page.getByRole('link', { name: 'Contact Tyler', exact: true });
    await expect(contact).toBeVisible();
    const contactHref = await contact.getAttribute('href');
    expect(contactHref).toBeTruthy();
    const contactUrl = new URL(contactHref ?? '', page.url());
    expect(contactUrl.pathname).toBe('/contact-agent');
    expect(contactUrl.searchParams.get('state')).toBe('colorado');
    expect(contactUrl.searchParams.get('id')).toBe(guide.authorSalesforceId);

    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: guide.title, exact: true });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'Privacy policy' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(downloads()).toHaveLength(0);
    expect(await googleDownloads(page)).toHaveLength(0);

    await trigger.click();
    await expect(dialog).toBeVisible();
    await assertNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('colorado-guide-modal.png'), caret: 'initial' });
    const submit = dialog.getByRole('button', { name: 'Get my guide', exact: true });
    const firstName = dialog.getByLabel('First name', { exact: true });
    const lastName = dialog.getByLabel('Last name', { exact: true });
    const email = dialog.getByLabel('Email', { exact: true });
    await expect(firstName).toHaveAttribute('maxlength', '40');
    await expect(lastName).toHaveAttribute('maxlength', '80');
    await expect(email).toHaveAttribute('maxlength', '80');
    await submit.click();
    await expect(firstName).toBeFocused();
    await firstName.fill('ColoradoTelemetryGiven');
    await lastName.fill('ColoradoTelemetryFamily');
    await email.fill('invalid-email');
    await submit.click();
    await expect(email).toBeFocused();
    expect(attempts).toBe(0);
    expect(downloads()).toHaveLength(0);
    expect(await googleDownloads(page)).toHaveLength(0);

    await email.fill('colorado-telemetry-private@example.com');
    await submit.click();
    await expect(dialog.getByRole('alert')).toContainText('Please try again');
    await expect.poll(() => downloads().map(event => event.event), { timeout: 15000 }).toEqual(['guide_download_requested']);
    expect(await googleDownloads(page)).toHaveLength(0);

    const automaticDownload = page.waitForEvent('download');
    await submit.click();
    await expect.poll(() => attempts).toBe(2);
    await expect(dialog.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    // A second submit event during the pending request must not create a second lead.
    await dialog.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(attempts).toBe(2);
    releaseAcceptedRequest?.();
    await expect(dialog.getByRole('status')).toContainText('Your guide is ready');
    const downloaded = await automaticDownload;
    expect(downloaded.suggestedFilename()).toBe(guide.fileName);
    expect(await downloaded.failure()).toBeNull();
    const downloadedPath = await downloaded.path();
    if (!downloadedPath) throw new Error('Expected a completed local PDF download');
    const downloadedBytes = await readFile(downloadedPath);
    expect(downloadedBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(createHash('sha256').update(downloadedBytes).digest('hex')).toBe(PDF_SHA256);
    await expect.poll(async () => (await googleDownloads(page)).length).toBe(1);
    expect(await googleDownloads(page)).toEqual([expect.objectContaining({ event: 'conversion_download', content: guide.gaContent })]);

    const manualDownload = page.waitForEvent('download');
    await dialog.getByRole('link', { name: 'Download guide', exact: true }).click();
    const repeatedDownload = await manualDownload;
    expect(repeatedDownload.suggestedFilename()).toBe(guide.fileName);
    expect(await repeatedDownload.failure()).toBeNull();
    await expect.poll(() => downloads().map(event => event.event), { timeout: 15000 }).toEqual([
      'guide_download_requested', 'guide_download_requested', 'guide_download_started',
      'guide_download_requested', 'guide_download_started',
    ]);
    expect(attempts).toBe(2);
    expect(await googleDownloads(page)).toHaveLength(1);
    await expect(dialog.getByRole('link', { name: 'Contact Tyler', exact: true })).toBeVisible();
    await assertNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('colorado-guide-success.png'), caret: 'initial' });

    const oldPdf = await page.request.get('/downloads/colorado-pcs-guide.pdf');
    expect(oldPdf.ok()).toBe(true);
    const oldBytes = await oldPdf.body();
    expect(oldBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(createHash('sha256').update(oldBytes).digest('hex')).toBe('de08483cf591ba9f8dcad0436c12894423726258491ac20cbdefed554530db76');
    const openingEvent = telemetry.events.find(event => event.event === 'cta_clicked' && event.properties.guide_id === guide.id);
    expect(openingEvent?.properties).toMatchObject({ cta_intent: 'download_guide', cta_location: 'state_hero_secondary' });
    for (const event of downloads()) {
      expect(event.properties).toMatchObject({
        guide_id: guide.id, form_id: guide.id, state_code: 'CO', state_slug: 'colorado',
        source_page_path: '/colorado', destination_path: guide.path,
        cta_component: 'lead_capture_dialog', cta_location: 'state_hero_secondary',
        cta_position: 'inline', page_type: 'state_page',
        distinct_id: 'vpcs_d8a351ef-9f74-43bc-826a-6111857758b5',
      });
      expect(event.properties.$current_url).toBeUndefined();
      expect(event.properties.$initial_current_url).toBeUndefined();
    }
    expect(downloads().slice(-2).map(event => event.properties.download_trigger)).toEqual(['manual_link', 'manual_link']);
    expect(telemetry.decodeFailures).toEqual([]);
    expect(telemetry.events.some(event => event.event === 'lead_conversion_created')).toBe(false);
    const googleEvents = await googleDownloads(page);
    const serialized = JSON.stringify({ posthog: telemetry.events, google: googleEvents });
    for (const privateValue of privateValues) expect(serialized.includes(privateValue), 'Contact values and query strings must not appear in analytics').toBe(false);
    // Export safe fields only, never project tokens, contact data, or anonymous identifiers.
    const keys = ['guide_id', 'form_id', 'state_code', 'state_slug', 'source_page_path', 'destination_path', 'cta_location', 'cta_position', 'download_trigger'];
    await testInfo.attach('colorado-guide-analytics', {
      body: JSON.stringify({
        posthog: downloads().map(event => ({ event: event.event, properties: Object.fromEntries(keys.filter(key => key in event.properties).map(key => [key, event.properties[key]])) })),
        google: googleEvents.map(event => ({ event: event.event, content: event.content })),
      }, null, 2), contentType: 'application/json',
    });

    // Navigation alone verifies the separate selected-agent hand-off; never submit this form.
    await dialog.getByRole('link', { name: 'Contact Tyler', exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === '/contact-agent'
      && url.searchParams.get('id') === guide.authorSalesforceId
      && url.searchParams.get('state') === guide.stateSlug);
    await expect(page.getByRole('heading', { level: 1, name: /Contact Tyler/ })).toBeVisible();
    expect(attempts).toBe(2);
    expect(pageErrors).toEqual([]);
  } finally {
    releaseAcceptedRequest?.();
  }
});
