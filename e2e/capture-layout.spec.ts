import { test, expect } from '@playwright/test';
import { fixtureImpact, assertNoOverflow } from './helpers';

// Page ancestor styles must not leak into shared form titles, privacy copy,
// or controls. Exercise every Resources placement with the real rendered dialog.
test('Resources guide dialogs keep their title and controls clear at every placement', async ({ page }, testInfo) => {
  await fixtureImpact(page);
  const surfaces = [
    { name: 'featured-va', query: '', title: 'Free VA Loan Guide', strip: false },
    { name: 'library-va', query: '?view=all', title: 'Free VA Loan Guide', strip: false },
    { name: 'library-homebuyer', query: '?view=all', title: 'Free First-Time Homebuyer Guide', strip: false },
    { name: 'strip-va', query: '', title: 'Free VA Loan Guide', strip: true },
    { name: 'strip-homebuyer', query: '', title: 'Free First-Time Homebuyer Guide', strip: true },
  ];
  for (const surface of surfaces) {
    await page.goto(`/pcs-resources${surface.query}`);
    await expect(page.locator('[data-site-header]')).toContainText('$676,500');
    const trigger = surface.strip
      ? page.getByRole('region', { name: 'Free downloadable guides' }).getByRole('button', { name: surface.name === 'strip-va' ? 'Get VA Loan Guide' : 'Get Homebuyer Guide', exact: true })
      : page.locator('#resource-library article').filter({ has: page.getByRole('heading', { name: surface.title, exact: true }) }).getByRole('button', { name: 'Download Guide' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: surface.title });
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    const heading = dialog.getByRole('heading', { name: surface.title });
    await expect(dialog).toBeVisible();
    expect(await heading.evaluate(element => getComputedStyle(element).fontSize)).toBe('26px');
    expect(await dialog.locator('.steph-small').evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
    const bounds = await dialog.boundingBox(), closeBounds = await close.boundingBox(), titleBounds = await heading.boundingBox();
    expect(bounds).not.toBeNull(); expect(closeBounds).not.toBeNull(); expect(titleBounds).not.toBeNull();
    if (!bounds || !closeBounds || !titleBounds) throw new Error('Dialog controls were not laid out');
    expect(closeBounds.width).toBeGreaterThanOrEqual(44);
    expect(closeBounds.width).toBeLessThanOrEqual(48);
    expect(closeBounds.x + closeBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(closeBounds.x).toBeGreaterThanOrEqual(titleBounds.x + titleBounds.width);
    expect(closeBounds.y).toBeLessThanOrEqual(bounds.y + 12);
    const first = dialog.getByLabel('First name');
    expect(await first.locator('..').evaluate(element => getComputedStyle(element).textAlign)).toBe('left');
    await close.focus(); await page.keyboard.press('Tab'); await expect(first).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused();
    await assertNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${surface.name}-${page.viewportSize()!.width}.png`) });
    await close.click(); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await trigger.click(); await dialog.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  }
});

for (const surface of [
  { name: 'homebuyer hero', route: '/', title: 'Free First-Time Homebuyer Guide', trigger: 'Download Now' },
  { name: 'VA landing', route: '/va-loan-help', title: 'Free VA Loan Guide', trigger: 'Get Your Free Guide' },
]) test(`shared guide dialog remains isolated on ${surface.name}`, async ({ page }, testInfo) => {
  await fixtureImpact(page); await page.goto(surface.route);
  await expect(page.locator('[data-site-header]')).toContainText('$676,500');
  const trigger = page.getByRole('button', { name: surface.trigger, exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: surface.title });
  await expect(dialog).toBeVisible();
  expect(await dialog.getByRole('heading', { name: surface.title }).evaluate(element => getComputedStyle(element).fontSize)).toBe('26px');
  expect(await dialog.locator('.steph-small').evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  expect((await close.boundingBox())!.width).toBe(44);
  await close.focus(); await page.keyboard.press('Tab'); await expect(dialog.getByLabel('First name')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`${surface.name}-${page.viewportSize()!.width}.png`) });
  await dialog.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  await assertNoOverflow(page);
});
