import { test, expect, type Page } from '@playwright/test';
import { assertNoOverflow, fixtureImpact, interceptTelemetry } from './helpers';

// The SDK drops automation user agents. This suite intercepts all PostHog traffic.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });

const FLAG = 'desktop-contact-agent-v2';
const selectedAgent = { id: 'E2EAGENT0000001', name: 'Fixture Agent', photo: null, service: 'Army Veteran', brokerage: 'Fixture Realty' };
const selectedUrl = '/contact-agent?form=agent&fn=Fixture&id=E2EAGENT0000001&state=texas';
const variantSelector = '[data-contact-agent-variant]';
const localCapture = process.env.E2E_POSTHOG_LOCAL_CAPTURE === '1';
const requiresLocalCapture = () => test.skip(!localCapture, 'Requires explicit local PostHog capture');
const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const hasDesktopHeader = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;
const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const isFlagsRequest = (url: URL) => /\/flags\/?$/.test(url.pathname);

async function mockTelemetry(page: Page, flags: Record<string, string | boolean>) {
  await fixtureImpact(page);
  const { events, decodeFailures } = await interceptTelemetry(page, flags);
  return {
    exposures: () => events.filter(e => e.event === '$feature_flag_called' && e.properties.$feature_flag === FLAG),
    starts: () => events.filter(e => e.event === 'contact_agent_experiment_form_started'),
    formStarts: () => events.filter(e => e.event === 'form_started' && e.properties.form_id === 'contact_agent'),
    headerScrolls: () => events.filter(e => e.event === 'cta_clicked' && e.properties.cta_id === 'contact_agent_header_scroll'),
    contactPageviews: () => events.filter(e => e.event === '$pageview' && e.properties.$pathname === '/contact-agent'),
    decodeFailures,
  };
}

async function expectCachedAssignment(page: Page, expected: 'test' | 'control' | null) {
  await expect.poll(() => page.evaluate(flag => {
    const key = Object.keys(localStorage).find(key => key.startsWith('ph_') && key.endsWith('_posthog'));
    if (!key) return undefined;
    return JSON.parse(localStorage.getItem(key) ?? '{}').$enabled_feature_flags?.[flag] ?? null;
  }, FLAG)).toBe(expected);
}

async function startOnAnotherPage(page: Page, expected: 'test' | 'control') {
  await page.goto('/how-it-works');
  await expectCachedAssignment(page, expected);
  await expect(heading(page)).toBeVisible();
}

async function openFromHeader(page: Page) {
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
}

async function navigateToSelection(page: Page, url: string) {
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  // The framework can expose its test router before hydration can handle a push.
  await expect(async () => {
    await page.evaluate(href => {
      if (window.location.href === new URL(href, window.location.href).href) return;
      const { next } = window as Window & { next?: { router?: { push(href: string): void } } };
      next?.router?.push(href);
    }, url);
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass({ timeout: 20000 });
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
}

test('a hard load keeps the control layout through delayed hydration', async ({ page }) => {
  const telemetry = await mockTelemetry(page, { [FLAG]: 'test' });
  await page.addInitScript(() => localStorage.setItem('vpcs_exp_desktop_contact_agent_v2', 'test'));
  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route(url => url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js'), async route => {
    await scriptsReady;
    await route.fallback();
  });
  const firstFieldTop = () => page.locator('#firstName').evaluate(element => element.getBoundingClientRect().top);
  let initialTop: number;
  try {
    await page.goto(selectedUrl, { waitUntil: 'commit' });
    await expect(heading(page)).toBeVisible();
    await expect(heading(page)).toHaveText('Contact Us');
    await expect(page.locator(variantSelector)).toHaveCount(0);
    await page.evaluate(async () => { await document.fonts.ready; });
    initialTop = await firstFieldTop();
  } finally {
    releaseScripts();
  }

  await expect(heading(page)).toHaveText('Contact Fixture');
  if (localCapture) {
    await expectCachedAssignment(page, 'test');
    await expect.poll(() => telemetry.contactPageviews().length).toBeGreaterThan(0);
  }
  await expect(heading(page)).toBeVisible();
  await expect(page.locator(variantSelector)).toHaveCount(0);
  expect(Math.abs(await firstFieldTop() - initialTop)).toBeLessThanOrEqual(2);
  expect(telemetry.exposures()).toHaveLength(0);
});

for (const arm of ['test', 'control'] as const) {
  test(`confirmed ${arm} records the rendered desktop exposure and only the first real start`, async ({ page }, testInfo) => {
    requiresLocalCapture();
    const telemetry = await mockTelemetry(page, { [FLAG]: arm });
    await page.addInitScript(agent => sessionStorage.setItem('vpcs_selected_agent', JSON.stringify(agent)), selectedAgent);
    await startOnAnotherPage(page, arm);
    await navigateToSelection(page, selectedUrl);
    await expect(page.locator('#firstName')).toBeVisible();
    await assertNoOverflow(page);

    if (!isDesktop(page)) {
      await expect(heading(page)).toHaveText('Contact Fixture');
      await expect(page.locator(variantSelector)).toHaveCount(0);
      await page.locator('#firstName').focus();
      await page.waitForTimeout(500);
      expect(telemetry.exposures()).toHaveLength(0);
      expect(telemetry.starts()).toHaveLength(0);
      return;
    }
    await expect(page.locator(variantSelector)).toHaveAttribute('data-contact-agent-variant', arm);
    await expect.poll(() => telemetry.exposures().length).toBe(1);
    const exposure = telemetry.exposures()[0]!;
    expect(exposure.properties).toMatchObject({
      $feature_flag_response: arm,
      $pathname: '/contact-agent',
      contact_agent_experiment_view_id: expect.any(String),
    });
    if (arm === 'test') {
      await expect(page.locator('[data-selected-agent-panel]')).toContainText('Fixture Realty');
      const firstField = await page.locator('#firstName').boundingBox();
      const selected = await page.locator('[data-selected-agent-panel]').boundingBox();
      expect(firstField!.x).toBeGreaterThan(selected!.x + selected!.width);
    } else {
      await expect(heading(page)).toHaveText('Contact Fixture');
      await expect(page.locator('[data-selected-agent-panel]')).toHaveCount(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`${arm}-contact.png`) });

    if (arm === 'test' && hasDesktopHeader(page)) {
      await openFromHeader(page);
      await expect(page.locator('#contact-agent-form')).toBeFocused();
      await expect(page.locator('#firstName')).toBeInViewport();
      await expect.poll(() => telemetry.headerScrolls().length).toBe(1);
    }
    expect(telemetry.formStarts()).toHaveLength(0);
    expect(telemetry.starts()).toHaveLength(0);
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 780, height: viewport.height });
    await expect(heading(page)).toBeVisible();
    await page.setViewportSize(viewport);
    await navigateToSelection(page, '/contact-agent?form=agent&fn=Bravo&id=E2EAGENT0000002&state=florida');
    await expect(heading(page)).toContainText('Contact Bravo');
    await expect(page.locator('[data-selected-agent-panel]')).toHaveCount(0);
    expect(telemetry.starts()).toHaveLength(0);
    await page.locator('#firstName').click();
    await page.locator('#lastName').click();
    await expect.poll(() => [telemetry.formStarts().length, telemetry.starts().length]).toEqual([1, 1]);
    expect(telemetry.starts()[0]!.properties.contact_agent_experiment_view_id).toBe(exposure.properties.contact_agent_experiment_view_id);
    expect(telemetry.exposures()).toHaveLength(1);
    expect(telemetry.decodeFailures).toEqual([]);
  });
}

for (const failure of ['partial', 'blocked'] as const) {
  test(`a ${failure} flag response cannot promote a stale assignment`, async ({ page }) => {
    requiresLocalCapture();
    const telemetry = await mockTelemetry(page, { [FLAG]: 'test' });
    await startOnAnotherPage(page, 'test');
    await page.route(isFlagsRequest, route => failure === 'partial'
      ? route.fulfill({ json: { featureFlags: {}, errorsWhileComputingFlags: true } })
      : route.abort());
    const failed = failure === 'partial'
      ? page.waitForResponse(response => isFlagsRequest(new URL(response.url())))
      : page.waitForEvent('requestfailed', { predicate: request => isFlagsRequest(new URL(request.url())) });
    await Promise.all([failed, page.reload()]);
    await navigateToSelection(page, selectedUrl);
    await expect(heading(page)).toHaveText('Contact Fixture');
    await expect(page.locator(variantSelector)).toHaveCount(0);
    expect(telemetry.exposures()).toHaveLength(0);
  });
}

test('a fresh flag-off response replaces a stored test assignment', async ({ page }) => {
  requiresLocalCapture();
  test.skip(!isDesktop(page), 'Desktop visitors can enter the experiment before the flag is turned off');
  const flags: Record<string, string | boolean> = { [FLAG]: 'test' };
  const telemetry = await mockTelemetry(page, flags);
  await startOnAnotherPage(page, 'test');
  await navigateToSelection(page, selectedUrl);
  await expect(page.locator(variantSelector)).toHaveAttribute('data-contact-agent-variant', 'test');
  await expect.poll(() => telemetry.exposures().length).toBe(1);
  await expect.poll(() => telemetry.contactPageviews().length).toBeGreaterThan(0);
  const priorViews = telemetry.contactPageviews().length;

  delete flags[FLAG];
  // Keep the legacy cache alongside the SDK's previously stored assignment.
  await page.evaluate(() => localStorage.setItem('vpcs_exp_desktop_contact_agent_v2', 'test'));
  await Promise.all([page.waitForResponse(response => isFlagsRequest(new URL(response.url()))), page.goto('/how-it-works')]);
  await expectCachedAssignment(page, null);
  await navigateToSelection(page, selectedUrl);
  await expect(heading(page)).toHaveText('Contact Fixture');
  await expect(page.locator(variantSelector)).toHaveCount(0);
  await expect.poll(() => telemetry.contactPageviews().length).toBeGreaterThan(priorViews);
  expect(telemetry.exposures()).toHaveLength(1);
  expect(telemetry.decodeFailures).toEqual([]);
});
