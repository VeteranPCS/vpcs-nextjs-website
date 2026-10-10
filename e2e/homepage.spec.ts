import { expect, test } from '@playwright/test';
test('homepage keeps its core mobile and desktop paths usable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Together, We’ll Make It Home.', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByTestId('homepage-state-map').locator('svg')).toBeVisible();
  await expect(page.getByTestId('homepage-state-map').getByRole('link', { name: 'View VeteranPCS agents in Texas' })).toHaveAttribute('href', '/texas');
  await expect(page.getByRole('combobox', { name: 'Select a State' })).toBeVisible();
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 768 && width < 1200) {
    const mission = page.getByRole('region', { name: 'Our Mission. Your Move.' });
    const intro = await mission.locator('div').first().boundingBox();
    const firstStep = await mission.locator('li').first().boundingBox();
    expect(firstStep!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
    const stepTitleLines = await mission.locator('li h3').first().evaluate((node) => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight));
    expect(stepTitleLines).toBeLessThanOrEqual(2.1);
  }
  const mobile = (page.viewportSize()?.width ?? 0) < 768;
  if (mobile) await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeHidden();
  else {
    await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Home Price' }).fill('650000');
    await expect(page.locator('output')).toHaveText('$2,000');
  }
  await page.getByRole('tab', { name: 'Browse Resources' }).click();
  await expect(page.getByRole('link', { name: 'Move-In Bonus Calculator' })).toHaveAttribute('href', '/pcs-resources#move-in-bonus');
  await page.getByRole('tab', { name: 'Browse by State' }).click();
  await expect(page.getByRole('link', { name: 'Choose your state' })).toHaveAttribute('href', '#state-map');
  await page.getByRole('tab', { name: 'Find an Agent' }).click();
  await page.route('**/api/v1/location-search?**', (route) => route.fulfill({ json: { outcome: 'needs_state', message: 'Which state is Springfield in?', states: [{ name: 'Virginia', code: 'VA' }] } }));
  const search = page.getByRole('textbox', { name: 'City, state, base, or ZIP code' });
  await search.fill('Springfield');
  await page.getByRole('button', { name: 'Find an Agent', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose a state' })).toBeVisible();
  await expect(search).toHaveValue('Springfield');
  await page.unroute('**/api/v1/location-search?**');
  await page.route('**/api/v1/location-search?**', (route) => route.fulfill({ status: 503, json: {} }));
  await search.fill('Texas');
  await page.getByRole('button', { name: 'Find an Agent', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Search is unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Show review 2' }).click();
  await expect(page.getByRole('button', { name: 'Show review 2' })).toHaveAttribute('aria-current', 'true');
  const guide = page.getByRole('button', { name: 'Download Now', exact: true });
  await guide.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(guide).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `/private/tmp/steph-homepage-${testInfo.project.name}.png`, fullPage: true });
});
