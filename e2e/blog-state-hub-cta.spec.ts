import { test, expect, type Page } from '@playwright/test';
import { assertNoOverflow, fixtureImpact, interceptTelemetry, type CapturedEvent } from './helpers';

// Real SDK drops automation UAs/webdriver; emulate a human browser only in this test context.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36' });

const FLAG = 'blog-state-hub-cta';
const HUB = '[data-cta-id="blog_state_hub_cta"]';
const needsLocalCapture = () => test.skip(process.env.E2E_POSTHOG_LOCAL_CAPTURE !== '1', 'Requires a loopback server with NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL_CAPTURE=1');
const hubClicks = (events: CapturedEvent[]) => events.filter(event => event.event === 'cta_clicked' && event.properties.cta_id === 'blog_state_hub_cta');

/** The SDK batches events; wait for the click, then make sure a later flush adds no duplicate. */
async function expectOneHubClick(page: Page, events: CapturedEvent[]) {
  await expect.poll(() => hubClicks(events).length, { timeout: 15000 }).toBe(1);
  await page.waitForTimeout(3500);
  expect(hubClicks(events)).toHaveLength(1);
  const [click] = hubClicks(events);
  if (!click) throw new Error('Missing blog_state_hub_cta click');
  return click.properties;
}

const posts = [
  { slug: 'what-military-bases-are-in-california', state: 'california', name: 'California', click: 'inline' },
  { slug: 'what-military-bases-are-in-north-carolina', state: 'north-carolina', name: 'North Carolina', click: 'end' },
  { slug: 'what-military-bases-are-in-washington', state: 'washington', name: 'Washington', click: 'inline' },
  { slug: 'west-virginia-veteran-property-tax-exemptions-2026', state: 'west-virginia', name: 'West Virginia', click: 'end' },
  { slug: 'air-force-bases-in-new-mexico', state: 'new-mexico', name: 'New Mexico', click: 'inline' },
  { slug: 'texas-veteran-property-tax-exemptions-2026', state: 'texas', name: 'Texas', click: 'end' },
] as const;

for (const post of posts) test(`variant links ${post.slug} to /${post.state} and tracks one ${post.click} click`, async ({ page }, info) => {
  needsLocalCapture();
  const telemetry = await interceptTelemetry(page, { [FLAG]: 'test' });
  await fixtureImpact(page);
  await page.goto(`/blog/${post.slug}`);
  const article = page.locator('[data-steph-article]');
  const blocks = article.locator(HUB);
  await expect(blocks).toHaveCount(2);
  const href = `/${post.state}?source=blog&blog_slug=${post.slug}`;
  for (const placement of ['inline', 'end']) {
    const block = article.locator(`${HUB}[data-placement="${placement}"]`);
    await expect(block.getByRole('link')).toHaveAttribute('href', href);
    await expect(block.getByRole('heading')).toContainText(post.name);
  }

  // The block is added after flags load, so it must start below the first screen.
  const inlineTop = await article.locator(`${HUB}[data-placement="inline"]`).evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  expect(inlineTop).toBeGreaterThan(page.viewportSize()?.height ?? 0);
  await assertNoOverflow(page);

  // The mobile sticky footer keeps its contact-form destination.
  const sticky = article.locator('[data-cta-id^="blog_mobile_sticky_"] a');
  expect(await sticky.getAttribute('href')).toMatch(/^\/contact-(agent|lender)\?/);

  const target = article.locator(`${HUB}[data-placement="${post.click}"]`);
  await target.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`state-hub-${post.click}.png`) });
  await target.getByRole('link').click();
  await page.waitForURL(url => url.pathname === `/${post.state}` && url.searchParams.get('blog_slug') === post.slug);

  const click = await expectOneHubClick(page, telemetry.events);
  expect(click).toMatchObject({
    cta_id: 'blog_state_hub_cta', cta_intent: 'state_agent_search', placement: post.click, state_source: 'post',
    state_slug: post.state, content_slug: post.slug, page_type: 'blog_post', destination_path: `/${post.state}`,
    [`$feature/${FLAG}`]: 'test',
  });
  // Exposure must survive the before_send sanitizer for the experiment to count visitors.
  const exposure = telemetry.events.find(event => event.event === '$feature_flag_called' && event.properties.$feature_flag === FLAG);
  expect(exposure?.properties.$feature_flag_response).toBe('test');
  expect(telemetry.decodeFailures).toEqual([]);
});

test('variant offers a state picker on a post with no state', async ({ page }, info) => {
  needsLocalCapture();
  const slug = 'house-hunting-leave-pcs-guide';
  const telemetry = await interceptTelemetry(page, { [FLAG]: 'test' });
  await fixtureImpact(page);
  await page.goto(`/blog/${slug}`);
  const block = page.locator(`${HUB}[data-placement="inline"]`);
  await expect(page.locator(HUB)).toHaveCount(2);
  await expect(block.getByRole('heading')).toHaveText('Where are you PCSing?');
  await expect(block.getByRole('link')).toHaveCount(0);
  await block.scrollIntoViewIfNeeded();

  await block.getByRole('button', { name: 'See agents' }).click();
  await expect(block.getByRole('status')).toHaveText('Choose a state first.');
  await expect(block.getByRole('combobox', { name: 'State' })).toBeFocused();

  await block.getByRole('combobox', { name: 'State' }).selectOption('washington');
  const link = block.getByRole('link', { name: 'See Washington agents' });
  await expect(link).toHaveAttribute('href', `/washington?source=blog&blog_slug=${slug}`);
  await assertNoOverflow(page);
  await page.screenshot({ path: info.outputPath('state-hub-picker.png') });
  expect(hubClicks(telemetry.events)).toHaveLength(0);
  await link.click();
  await page.waitForURL(url => url.pathname === '/washington');

  const click = await expectOneHubClick(page, telemetry.events);
  expect(click).toMatchObject({ placement: 'inline', state_source: 'picker', state_slug: 'washington', content_slug: slug, destination_path: '/washington' });
});

const controlFlags: Record<string, string>[] = [{}, { [FLAG]: 'control' }];
for (const flags of controlFlags) test(`control (${JSON.stringify(flags)}) shows no state hub block`, async ({ page }) => {
  needsLocalCapture();
  const telemetry = await interceptTelemetry(page, flags);
  await fixtureImpact(page);
  await page.goto('/blog/what-military-bases-are-in-california');
  const article = page.locator('[data-steph-article]');
  await expect(article.getByRole('region', { name: 'Plan your next move' })).toBeVisible();
  // Give the flags response time to arrive before asserting absence.
  await expect.poll(() => telemetry.events.some(event => event.event === 'content_viewed'), { timeout: 15000 }).toBe(true);
  await expect(article.locator(HUB)).toHaveCount(0);
  await expect(article.getByRole('link', { name: 'Browse California agents →' })).toHaveCount(1);
});
