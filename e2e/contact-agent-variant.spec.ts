import { test, expect, type Page, type Request } from '@playwright/test';
import { gunzipSync } from 'node:zlib';
import { fixtureImpact } from './helpers';

// desktop-contact-agent-v2: a desktop-only treatment of /contact-agent behind a PostHog flag.
// The rules under test: phones and tablets never change, the layout is decided before first
// paint and never switches afterwards, and nothing the treatment does counts as a form start.
const FLAG = 'desktop-contact-agent-v2';
const CACHE_KEY = 'vpcs_exp_desktop_contact_agent_v2';
const AGENT = { id: 'E2EAGENT0000001', name: 'Fixture Agent', photo: null, service: 'Army Veteran', brokerage: 'Fixture Realty' };
const cardUrl = `/contact-agent?form=agent&fn=Fixture&id=${AGENT.id}&state=texas`;
// Mirrors DESKTOP_CONTACT_AGENT_MEDIA; the Playwright projects have a mouse and hover.
const treatmentApplies = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const desktopHeader = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;

type Layout = { variant: string | null; heading: number; firstField: number; cardLeft: number; submitWidth: number; panelShown: boolean; headingText: string };
async function layout(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const top = (element: Element | null) => Math.round((element?.getBoundingClientRect().top ?? 0) + window.scrollY);
    const shown = (element: Element | null) => Boolean(element && getComputedStyle(element).display !== 'none');
    const heading = document.querySelector('h1')!;
    const firstField = document.querySelector('#firstName')!;
    return {
      variant: document.querySelector('[data-contact-agent-variant]')?.getAttribute('data-contact-agent-variant') ?? null,
      heading: top(heading),
      firstField: top(firstField),
      cardLeft: Math.round(firstField.closest('.border')!.getBoundingClientRect().left),
      submitWidth: Math.round(document.querySelector('button[type=submit]')!.getBoundingClientRect().width),
      panelShown: shown(document.querySelector('[data-selected-agent-panel]')),
      headingText: [...heading.querySelectorAll('span')].filter(shown).map((span) => span.textContent).join(''),
    };
  });
}

/** Hard load with the variant the SDK cached on an earlier page, as a returning visitor has. */
async function hardLoad(page: Page, cached: 'test' | 'control' | null, url = cardUrl) {
  await fixtureImpact(page);
  await page.addInitScript(([key, value, agent]) => {
    if (value) window.localStorage.setItem(key as string, value as string);
    window.sessionStorage.setItem('vpcs_selected_agent', JSON.stringify(agent));
  }, [CACHE_KEY, cached, AGENT] as const);
  await page.goto(url);
  await expect(page.locator('#firstName')).toBeVisible();
  // Hydration is complete once the heading names the agent.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact Fixture');
}

test('the treatment changes desktop only; phones and tablets match control exactly', async ({ page, browser }) => {
  await hardLoad(page, 'control');
  const control = await layout(page);
  expect(control).toMatchObject({ variant: 'control', panelShown: false, headingText: 'Contact Fixture' });

  const context = await browser.newContext({ viewport: page.viewportSize()! });
  const treated = await context.newPage();
  await hardLoad(treated, 'test');
  const test = await layout(treated);
  expect(test.variant).toBe('test');

  if (treatmentApplies(page)) {
    // The first field moves up by the removed blank band and the form sits in a right column.
    expect(test.firstField).toBeLessThan(control.firstField - 250);
    expect(test.cardLeft).toBeGreaterThan(control.cardLeft + 100);
    expect(test.submitWidth).toBe(456);
    expect(test).toMatchObject({ panelShown: true, headingText: 'Contact Fixture Agent' });
    expect(await treated.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  } else {
    expect({ ...test, variant: 'control' }).toEqual(control);
  }
  await context.close();
});

test('a visitor whose variant is unknown before first paint keeps the control page', async ({ page }) => {
  await hardLoad(page, 'control');
  const control = await layout(page);
  await page.evaluate((key) => window.localStorage.removeItem(key), CACHE_KEY);
  const context = await page.context().browser()!.newContext({ viewport: page.viewportSize()! });
  const fresh = await context.newPage();
  await hardLoad(fresh, null);
  // Give late-arriving flags every chance to (wrongly) switch the painted layout.
  await fresh.waitForTimeout(750);
  expect({ ...(await layout(fresh)), variant: 'control' }).toEqual(control);
  expect((await layout(fresh)).variant).toBe('unknown');
  await context.close();
});

test('header Find an Agent reveals the form in the treatment without focusing a field', async ({ page }) => {
  test.skip(!desktopHeader(page), 'The header button is only visible from 1280px wide');
  await hardLoad(page, 'test');
  await page.evaluate(() => {
    (window as unknown as { __formFocus: string[] }).__formFocus = [];
    document.querySelector('form')!.addEventListener('focusin', (event) => (window as unknown as { __formFocus: string[] }).__formFocus.push((event.target as Element).id));
    window.scrollTo(0, 900);
  });
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
  const region = page.locator('#contact-agent-form');
  await expect(region).toBeFocused();
  await expect(region).toHaveAttribute('data-highlight', 'true');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(60);
  await expect(page.locator('#firstName')).toBeInViewport();
  expect(await page.evaluate(() => (window as unknown as { __formFocus: string[] }).__formFocus)).toEqual([]);
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('form')))).toBe(false);
  // The selected agent survives, as it does in control.
  expect(new URL(page.url()).searchParams.get('id')).toBe(AGENT.id);
  await expect(region).not.toHaveAttribute('data-highlight', 'true', { timeout: 4000 });
});

/* ---- Real SDK, intercepted: exposure and form-start accounting ---- */

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

/** Runs the real SDK against an intercepted PostHog that assigns `variant`. Nothing leaves the machine. */
async function interceptPostHog(page: Page, variant: 'test' | 'control') {
  const events: CapturedEvent[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });
  await page.context().route(url => url.pathname.startsWith('/ingest') || url.hostname.endsWith('posthog.com'), async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (/\/(?:e|batch)\/?$/.test(path)) {
      try { events.push(...decodeEvents(request)); } catch { /* undecodable batches are not this test's subject */ }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
    } else if (path.endsWith('.js')) {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        featureFlags: { [FLAG]: variant }, featureFlagPayloads: {}, supportedCompression: ['gzip-js'],
        flags: { [FLAG]: { key: FLAG, enabled: true, variant, reason: { code: 'condition_match', condition_index: 0, description: 'fixture' }, metadata: { id: 1, version: 1 } } },
      }) });
    }
  });
  await page.context().route(url => /(?:google-analytics\.com|analytics\.google\.com|googletagmanager\.com|bing\.com)$/.test(url.hostname), route => route.fulfill({ status: 204, body: '' }));
  const named = (name: string) => events.filter((event) => event.event === name);
  return { events, named, exposures: () => named('$feature_flag_called').filter((event) => event.properties.$feature_flag === FLAG) };
}

test.describe('with the real SDK', () => {
  // The SDK drops automation user agents; emulate a person's browser in this block only.
  test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });

  test('an in-site visit applies the assigned variant before paint and counts one honest exposure', async ({ page }) => {
    test.skip(process.env.E2E_POSTHOG_LOCAL_CAPTURE !== '1', 'Requires a loopback server with explicit local SDK capture enabled');
    const posthog = await interceptPostHog(page, 'test');
    await fixtureImpact(page);
    await page.goto('/how-it-works');
    // Flags arrive on this earlier page, as they do for visitors coming from a state page.
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), CACHE_KEY)).toBe('test');

    if (desktopHeader(page)) {
      await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('dialog', { name: 'Mobile navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
    }
    await expect(page).toHaveURL(/\/contact-agent/);
    await expect(page.locator('#firstName')).toBeVisible();
    expect((await layout(page)).variant).toBe('test');

    if (!treatmentApplies(page)) {
      // Phones and tablets are outside the experiment: unchanged page, no exposure.
      await page.waitForTimeout(1500);
      expect(posthog.exposures()).toHaveLength(0);
      return;
    }
    await expect.poll(() => posthog.exposures().length).toBe(1);
    expect(posthog.exposures()[0]!.properties).toMatchObject({ $feature_flag_response: 'test', $pathname: '/contact-agent' });

    if (desktopHeader(page)) {
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
      await expect(page.locator('#contact-agent-form')).toBeFocused();
      await expect.poll(() => posthog.named('cta_clicked').filter((event) => event.properties.cta_id === 'contact_agent_header_scroll').length).toBe(1);
      // The ordinary header click is still recorded in this arm, so repeat clicks stay comparable.
      expect(posthog.named('cta_clicked').filter((event) => event.properties.cta_id === 'header_desktop_find_agent' && event.properties.$pathname === '/contact-agent')).toHaveLength(1);
    }
    // Nothing so far is a form start: not the page view, not the scroll, not the moved focus.
    await page.waitForTimeout(1000);
    expect(posthog.named('form_started')).toHaveLength(0);

    await page.locator('#firstName').click();
    await expect.poll(() => posthog.named('form_started').length).toBe(1);
    expect(posthog.named('form_started')[0]!.properties).toMatchObject({ form_id: 'contact_agent', [`$feature/${FLAG}`]: 'test' });
    expect(posthog.exposures()).toHaveLength(1);
  });
});
