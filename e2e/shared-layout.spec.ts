import { test, expect } from '@playwright/test';
import { assertNoOverflow, fixtureImpact } from './helpers';

const routes = ['/', '/texas', '/contact-agent', '/contact-lender', '/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel', '/how-it-works', '/spanish', '/guides', '/va-loan-calculator', '/blog'];
for (const route of routes) {
  test(`shared layout ${route}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await fixtureImpact(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const header = page.locator('[data-site-header]');
    await expect(header).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await assertNoOverflow(page);
    const title = await page.getByRole('heading', { level: 1 }).first().boundingBox();
    const frame = await header.boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(frame!.height - 1);
    await page.screenshot({ path: testInfo.outputPath('first-screen.png') });
    if (route === '/spanish') {
      const heading = page.getByRole('heading', { name: 'Ayuda con el préstamo VA', exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect.poll(async () => {
        const box = await heading.boundingBox();
        return box ? box.x >= 0 && box.x + box.width <= (page.viewportSize()?.width ?? 0) : false;
      }).toBe(true);
      await assertNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath('spanish-support.png') });
    }
    expect(errors).toEqual([]);
  });
}

test('reduced motion and 200 percent equivalent viewport retain usable navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 720, height: 500 });
  await fixtureImpact(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mobile navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'PCS Resources', exact: true }).click();
  await drawer.getByRole('link', { name: 'Explore Free Guides' }).scrollIntoViewIfNeeded();
  await expect(drawer.getByRole('link', { name: 'Explore Free Guides' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await assertNoOverflow(page);
});
