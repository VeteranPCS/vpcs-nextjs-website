import { test, expect, type Page } from '@playwright/test';
import { assertNoOverflow, fixtureImpact, interceptTelemetry } from './helpers';

// The SDK drops automation user agents. This suite intercepts all PostHog traffic.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });

const FLAG = 'desktop-contact-agent-v2';
const selectedAgent = { id: 'E2EAGENT0000001', name: 'Fixture Agent', photo: null, service: 'Army Veteran', brokerage: 'Fixture Realty' };
const selectedUrl = '/contact-agent?form=agent&fn=Fixture&id=E2EAGENT0000001&state=texas';
const variantSelector = '[data-contact-agent-variant]';
const requiresLocalCapture = () => test.skip(process.env.E2E_POSTHOG_LOCAL_CAPTURE !== '1', 'Requires explicit local PostHog capture');
const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const hasDesktopHeader = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;
const heading = (page: Page) => page.getByRole('heading', { level: 1 });

async function mockTelemetry(page: Page, flag: 'test' | 'control' | undefined) {
  await fixtureImpact(page);
  const { events, decodeFailures } = await interceptTelemetry(page, flag ? { [FLAG]: flag } : {});
  return {
    exposures: () => events.filter(e => e.event === '$feature_flag_called' && e.properties.$feature_flag === FLAG),
    starts: () => events.filter(e => e.event === 'contact_agent_experiment_form_started'),
    decodeFailures,
  };
}

async function startOnAnotherPage(page: Page, expected: 'test' | 'control') {
  await page.goto('/how-it-works');
  await expect.poll(() => page.evaluate(({ flag, expected }) => {
    return Object.keys(localStorage).some(key => {
      if (!key.startsWith('ph_')) return false;
      try {
        return JSON.parse(localStorage.getItem(key) ?? '{}').$enabled_feature_flags?.[flag] === expected;
      } catch { return false; }
    });
  }, { flag: FLAG, expected })).toBe(true);
  await expect(heading(page)).toBeVisible();
}

async function openFromHeader(page: Page) {
  if (hasDesktopHeader(page)) {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('dialog', { name: 'Mobile navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/contact-agent/);
  await expect(page.locator('#firstName')).toBeVisible();
}

async function navigateToSelection(page: Page, url: string) {
  await page.evaluate((href) => (window as unknown as { next: { router: { push(href: string): void } } }).next.router.push(href), url);
  await expect(page).toHaveURL(url);
}

test('hard loads keep a visible control heading before and after hydration', async ({ page }) => {
  await fixtureImpact(page);
  await page.addInitScript(() => localStorage.setItem('vpcs_exp_desktop_contact_agent_v2', 'test'));
  const scripts = (url: URL) => url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js');
  await page.route(scripts, route => route.abort());
  await page.goto(selectedUrl);
  await expect(heading(page)).toHaveText('Contact Us');
  await expect(page.locator(variantSelector)).toHaveCount(0);
  await page.unroute(scripts);
  await page.reload();
  await expect(heading(page)).toHaveText('Contact Fixture');
  await expect(page.locator(variantSelector)).toHaveCount(0);
});

for (const arm of ['test', 'control'] as const) {
  test(`confirmed ${arm} records the rendered desktop exposure and only the first real start`, async ({ page }, testInfo) => {
    requiresLocalCapture();
    const telemetry = await mockTelemetry(page, arm);
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
    }
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
    await expect.poll(() => telemetry.starts().length).toBe(1);
    expect(telemetry.starts()[0]!.properties.contact_agent_experiment_view_id).toBe(exposure.properties.contact_agent_experiment_view_id);
    expect(telemetry.exposures()).toHaveLength(1);
    expect(telemetry.decodeFailures).toEqual([]);
  });
}

for (const failure of ['partial', 'blocked'] as const) {
  test(`a ${failure} flag response cannot promote a stale assignment`, async ({ page }) => {
    requiresLocalCapture();
    const telemetry = await mockTelemetry(page, 'test');
    await startOnAnotherPage(page, 'test');
    const isFlags = (url: URL) => /\/flags\/?$/.test(url.pathname);
    await page.route(isFlags, route => failure === 'partial'
      ? route.fulfill({ json: { featureFlags: {}, errorsWhileComputingFlags: true } })
      : route.abort());
    const failed = failure === 'partial'
      ? page.waitForResponse(response => isFlags(new URL(response.url())))
      : page.waitForEvent('requestfailed', { predicate: request => isFlags(new URL(request.url())) });
    await Promise.all([failed, page.reload()]);
    await openFromHeader(page);
    await expect(page.locator(variantSelector)).toHaveCount(0);
    expect(telemetry.exposures()).toHaveLength(0);
  });
}
