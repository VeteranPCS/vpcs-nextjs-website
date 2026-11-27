import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { COLORADO_RELOCATION_GUIDE as guide } from '../lib/guides/colorado-relocation';
import { CONTACT_PREFILL_STORAGE_KEY } from '../lib/leads/contact-prefill';
import { assertNoOverflow, interceptTelemetry, leadTimingReady } from './helpers';

const PDF_SHA256 = 'b816103bade949338238a93ec77ad930f95a65a04128fbb04d95aa4bf95227e1';
const privateValues = ['ColoradoTelemetryGiven', 'ColoradoTelemetryFamily', 'colorado-telemetry-private@example.com', 'private-colorado-query'];

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
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1', 'Requires a loopback mock server with dry-run enabled');
  const pageErrors: string[] = [];
  page.on('pageerror', error => { pageErrors.push(error.message); });
  const telemetry = await interceptTelemetry(page);
  let postHogRequests = 0;
  page.context().on('request', request => {
    const { hostname, pathname } = new URL(request.url());
    if (/^\/ingest(?:\/|$)/.test(pathname) || hostname === 'posthog.com' || hostname.endsWith('.posthog.com')) {
      postHogRequests += 1;
    }
  });
  let attempts = 0;
  let contactSubmissions = 0;
  await page.route('**/contact-agent**', async route => {
    if (route.request().method() === 'POST') { contactSubmissions += 1; await route.abort('blockedbyclient'); return; }
    await route.continue();
  });
  let releaseAcceptedRequest: (() => void) | undefined;
  const acceptedRequestGate = new Promise<void>(resolve => { releaseAcceptedRequest = resolve; });
  await page.route('**/colorado**', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      attempts += 1;
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
    const placement = await promotion.evaluate(section => ({
      precedingRegion: section.previousElementSibling?.getAttribute('aria-label'),
      bannerBottom: section.previousElementSibling?.getBoundingClientRect().bottom,
      guideTop: section.getBoundingClientRect().top,
    }));
    expect(placement.precedingRegion).toBe('VeteranPCS lending support');
    expect(placement.bannerBottom).toBeDefined();
    expect(placement.guideTop).toBeGreaterThanOrEqual(placement.bannerBottom ?? Number.POSITIVE_INFINITY);
    await promotion.scrollIntoViewIfNeeded();
    await promotion.screenshot({ path: testInfo.outputPath('colorado-guide-promotion.png'), caret: 'initial' });
    const contact = page.getByRole('link', { name: 'Find a Colorado Agent', exact: true });
    await expect(contact).toBeVisible();
    const contactHref = await contact.getAttribute('href');
    expect(contactHref).toBeTruthy();
    const contactUrl = new URL(contactHref ?? '', page.url());
    expect(contactUrl.pathname).toBe('/contact-agent');
    expect(contactUrl.searchParams.get('state')).toBe('colorado');
    expect(contactUrl.searchParams.get('id')).toBeNull();
    expect(contactUrl.searchParams.get('fn')).toBeNull();

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
    expect(await googleDownloads(page)).toHaveLength(0);

    await trigger.click();
    await expect(dialog).toBeVisible();
    const timingReady = leadTimingReady();
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
    expect(await googleDownloads(page)).toHaveLength(0);

    await email.fill('colorado-telemetry-private@example.com');
    const honeypot = dialog.locator('input[name=company_website]');
    await honeypot.evaluate((input: HTMLInputElement) => { input.value = 'synthetic-filled-honeypot'; });
    await submit.click();
    await expect(dialog.getByRole('alert')).toContainText('couldn’t accept');
    expect(await googleDownloads(page)).toHaveLength(0);
    await honeypot.evaluate((input: HTMLInputElement) => { input.value = ''; });
    await timingReady;

    const automaticDownload = page.waitForEvent('download');
    await submit.click();
    await expect.poll(() => attempts).toBe(2);
    await expect(dialog.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    // A second submit event during the pending request must not create a second lead.
    await dialog.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(attempts).toBe(2);
    releaseAcceptedRequest?.();
    await expect(dialog.getByRole('status')).toContainText('Your download has started.');
    await expect(dialog.getByRole('region', { name: 'Meet Tyler Parker' }).getByRole('link', { name: 'Find a Colorado Agent', exact: true })).toBeFocused();
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
    await dialog.getByRole('link', { name: 'Download again', exact: true }).click();
    const repeatedDownload = await manualDownload;
    expect(repeatedDownload.suggestedFilename()).toBe(guide.fileName);
    expect(await repeatedDownload.failure()).toBeNull();
    expect(attempts).toBe(2);
    expect(await googleDownloads(page)).toHaveLength(1);
    const authorCard = dialog.getByRole('region', { name: 'Meet Tyler Parker' });
    await expect(authorCard.getByRole('heading', { name: guide.author, exact: true })).toBeVisible();
    await expect(authorCard).toContainText('Air Force Veteran');
    await expect(authorCard).toContainText(guide.brokerage);
    const portrait = authorCard.getByRole('img', { name: guide.author, exact: true });
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(authorCard.getByRole('link', { name: 'Find a Colorado Agent', exact: true })).toBeVisible();
    // The generic nonproduction link does not persist accepted contact details.
    expect(await page.evaluate(key => sessionStorage.getItem(key), CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    await assertNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('colorado-guide-success.png'), caret: 'initial' });

    const oldPdf = await page.request.get('/downloads/colorado-pcs-guide.pdf');
    expect(oldPdf.ok()).toBe(true);
    const oldBytes = await oldPdf.body();
    expect(oldBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(createHash('sha256').update(oldBytes).digest('hex')).toBe('de08483cf591ba9f8dcad0436c12894423726258491ac20cbdefed554530db76');
    expect(postHogRequests).toBe(0);
    const googleEvents = await googleDownloads(page);
    const serialized = JSON.stringify({ posthog: telemetry.events, google: googleEvents });
    for (const privateValue of privateValues) expect(serialized.includes(privateValue), 'Contact values and query strings must not appear in analytics').toBe(false);
    // Export safe fields only, never project tokens, contact data, or anonymous identifiers.
    await testInfo.attach('colorado-guide-analytics', {
      body: JSON.stringify({
        postHogRequests,
        googleDataLayer: googleEvents.map(event => ({ event: event.event, content: event.content })),
      }, null, 2), contentType: 'application/json',
    });

    // Verify navigation to the general form without submitting it.
    await dialog.getByRole('link', { name: 'Find a Colorado Agent', exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === '/contact-agent'
      && !url.searchParams.has('id')
      && !url.searchParams.has('fn')
      && url.searchParams.get('state') === guide.stateSlug);
    await expect(page.getByRole('heading', { level: 1, name: /Contact Us|match you with an agent/ })).toBeVisible();
    await expect(page.locator('#firstName')).toHaveValue('');
    await expect(page.locator('#lastName')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('');
    expect(await page.evaluate(key => sessionStorage.getItem(key), CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    for (const privateValue of privateValues) expect(decodeURIComponent(page.url()).includes(privateValue), 'Contact details must not enter the URL').toBe(false);
    expect(postHogRequests).toBe(0);
    const handoffAnalytics = JSON.stringify({ posthog: telemetry.events, google: await googleDownloads(page) });
    for (const privateValue of privateValues) expect(handoffAnalytics.includes(privateValue), 'Contact prefill must not enter analytics').toBe(false);
    expect(contactSubmissions).toBe(0);
    expect(attempts).toBe(2);

    // Reloading keeps the generic form blank.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Contact Us|match you with an agent/ })).toBeVisible();
    await expect(page.locator('#firstName')).toHaveValue('');
    await expect(page.locator('#lastName')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('');
    expect(postHogRequests).toBe(0);
    expect(contactSubmissions).toBe(0);
    expect(pageErrors).toEqual([]);
  } finally {
    releaseAcceptedRequest?.();
  }
});
