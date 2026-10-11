import { test, expect } from '@playwright/test';
import { fixtureImpact, assertNoOverflow } from './helpers';

const pages = [
  ['home', '/'], ['bah', '/bah-calculator'], ['resources', '/pcs-resources'],
  ['va-loan', '/va-loan-help'], ['article', '/blog/pcs-moves-buying-or-selling-during-relocation'],
] as const;

for (const [name, route] of pages) {
  test(`integrated responsive composition: ${name}`, async ({ page }, info) => {
    const errors: string[] = [], consoleErrors: string[] = [], localFailures: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('response', response => {
      if (new URL(response.url()).origin === new URL(page.url()).origin && response.status() >= 400) {
        localFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    await fixtureImpact(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    // The impact effect resolves after hydration; captures must not alter inputs before hydration.
    await expect(page.locator('[data-site-header]')).toContainText('$676,500');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 600) {
      await page.evaluate(top => scrollTo(0, top), y);
      await page.waitForTimeout(35);
    }
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).filter(image => image.complete && image.naturalWidth > 0).map(image => image.decode().catch(() => undefined)));
      scrollTo(0, 0);
    });
    await assertNoOverflow(page);
    await page.screenshot({ path: info.outputPath(`${name}-full.png`), fullPage: true, caret: 'initial', style: 'nextjs-portal { visibility: hidden; }' });
    await page.screenshot({ path: info.outputPath(`${name}-top.png`), caret: 'initial', style: 'nextjs-portal { visibility: hidden; }' });
    await info.attach('browser-health', { body: JSON.stringify({ errors, consoleErrors, localFailures }, null, 2), contentType: 'application/json' });
    expect(errors).toEqual([]);
    expect(consoleErrors.filter(message => /hydrat|uncaught|unique.*key/i.test(message))).toEqual([]);
    expect(localFailures).toEqual([]);
  });
}

test('adjacent responsive boundaries preserve header and content clearance', async ({ page }) => {
  await fixtureImpact(page);
  for (const width of [767, 768, 1023, 1024, 1279, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-site-header]')).toContainText('$676,500');
    await assertNoOverflow(page);
    const header = await page.locator('[data-site-header]').boundingBox();
    const title = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(header!.height);
    if (width < 768) await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeHidden();
    else await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeVisible();
    if (width < 1280) await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    else await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
  }
});
