import { test, expect } from '@playwright/test';

// Browser tests run only against the loopback dry-run server configured by the coordinator.
// No test submits a lead. The impact fixture exercises a verified response shape.
test.beforeEach(async ({ page }, testInfo) => {
  await page.route(/https:\/\/.*(?:posthog|google-analytics|googletagmanager|clarity|vercel-insights)/, route => route.abort());
  const available = !testInfo.title.startsWith('unavailable impact');
  await page.route('**/api/v1/impact', route => route.fulfill({ json: { success: true, data: { available, cashBackAmount: available ? '$712,345' : '$500,000', charityAmount: available ? '$67,890' : '$50,000', totalVolumeSold: '$211 Million' } } }));
  await page.goto('/');
  await expect(page.locator('[data-site-header]')).toBeVisible();
});

test('responsive navigation, menu content, and keyboard dismissal', async ({ page }, testInfo) => {
  const header = page.locator('[data-site-header]');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect(header.getByText('$712,345').first()).toBeVisible();
  await expect(header).toHaveJSProperty('offsetHeight', (viewport?.width ?? 0) >= 1280 ? 208 : 128);
  if ((viewport?.width ?? 0) >= 1280) {
    const nav = header.getByRole('navigation', { name: 'Primary navigation' });
    await expect(header.getByRole('button', { name: 'Open navigation' })).toBeHidden();
    const resources = nav.getByRole('button', { name: 'PCS Resources', exact: true });
    await resources.press('ArrowDown');
    const panel = header.locator('#desktop-navigation-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Ultimate PCS Checklist & Timeline' })).toBeFocused();
    await expect(panel.getByRole('link', { name: 'Military Bases in Hawaii' })).toHaveAttribute('href', '/blog/what-military-bases-are-in-hawaii');
    await page.screenshot({ path: testInfo.outputPath('desktop-pcs-resources.png') });
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden(); await expect(resources).toBeFocused();
    for (const label of ['VA Loan', 'Mission', 'Contact']) {
      const button = nav.getByRole('button', { name: label, exact: true });
      await button.click(); await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`desktop-${label.toLowerCase().replaceAll(' ', '-')}.png`) });
    }
    await expect(panel.getByRole('link', { name: '719-782-5065' })).toHaveAttribute('href', 'tel:7197825065');
    await expect(panel.getByRole('link', { name: 'info@veteranpcs.com' })).toHaveAttribute('href', 'mailto:info@veteranpcs.com');
    await page.locator('body').click({ position: { x: 5, y: Math.min(viewport?.height ?? 800, 700) } });
    await expect(panel).toBeHidden();
  } else {
    const toggle = header.getByRole('button', { name: 'Open navigation' });
    await toggle.click();
    const dialog = page.getByRole('dialog', { name: 'Mobile navigation' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'VA Loan', exact: true })).toBeFocused();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('.site-header-addition')).toHaveJSProperty('inert', true);
    const chat = page.getByRole('button', { name: 'Open chat with VeteranPCS concierge', includeHidden: true });
    if (await chat.count()) await expect(chat).toHaveJSProperty('inert', true);
    await page.screenshot({ path: testInfo.outputPath('mobile-root.png') });
    await header.getByRole('button', { name: 'Close navigation' }).press('Tab');
    await expect(dialog.getByRole('button', { name: 'VA Loan', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(header.getByRole('button', { name: 'Close navigation' })).toBeFocused();
    for (const label of ['VA Loan', 'PCS Resources', 'Mission', 'Contact']) {
      await dialog.getByRole('button', { name: label, exact: true }).click();
      const back = dialog.getByRole('button', { name: 'Back', exact: true });
      await expect(back).toBeFocused();
      await expect(dialog.getByRole('heading', { name: label, exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`mobile-${label.toLowerCase().replaceAll(' ', '-')}.png`) });
      await back.click();
      await expect(dialog.getByRole('button', { name: label, exact: true })).toBeFocused();
    }
    await dialog.getByRole('button', { name: 'PCS Resources', exact: true }).click();
    const promo = dialog.getByRole('link', { name: 'Explore Free Guides' });
    await promo.scrollIntoViewIfNeeded(); await expect(promo).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await dialog.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('mobile-scroll-promo-footer.png') });
    const footer = dialog.getByText('Helping military families', { exact: true });
    await footer.scrollIntoViewIfNeeded(); await expect(footer).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('mobile-footer.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0); await expect(header.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(page.locator('.site-header-addition')).toHaveJSProperty('inert', false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('breakpoint change closes mobile drawer and releases its scroll lock', async ({ page }) => {
  await page.setViewportSize({ width: 1279, height: 800 });
  const toggle = page.getByRole('button', { name: 'Open navigation' }); await toggle.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.getByRole('button', { name: 'PCS Resources', exact: true })).toBeVisible();
});

test('navigation links close the drawer and preserve customer form destinations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = page.getByRole('dialog');
  const agent = dialog.getByRole('link', { name: 'Find an Agent', exact: true });
  await expect(agent).toHaveAttribute('href', '/contact-agent?form=agent');
  await dialog.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(dialog.getByRole('link', { name: 'Contact a VA Loan Expert' })).toHaveAttribute('href', '/contact-lender?form=lender');
  await dialog.getByRole('link', { name: 'Contact Us', exact: true }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('unavailable impact never leaks an unsupported numeric fallback into the header', async ({ page }) => {
  const header = page.locator('[data-site-header]');
  await expect(header.getByText('Giving back').first()).toBeVisible();
  await expect(header).not.toContainText('$500,000');
  await expect(header).not.toContainText('$50,000');
});

for (const width of [1280, 1440, 1920]) {
  test(`desktop Contact and Mission match reviewed panel proportions at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const header = page.locator('[data-site-header]');
    await expect(header).toContainText('$712,345');
    const panel = header.locator('#desktop-navigation-panel');
    await header.getByRole('button', { name: 'Contact', exact: true }).click();
    const contact = panel.getByRole('complementary', { name: 'Contact details' });
    const contactBounds = await contact.boundingBox();
    expect(contactBounds?.width).toBeCloseTo(186, 0);
    expect(contactBounds?.height).toBeCloseTo(239, 0);
    const panelContent = panel.locator('[data-section="contact"]');
    expect((await panelContent.boundingBox())?.height).toBeCloseTo(281, -1);
    for (const link of await contact.getByRole('link').all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(contactBounds!.x);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(contactBounds!.x + contactBounds!.width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(contactBounds!.y + contactBounds!.height);
    }
    await page.keyboard.press('Escape');
    await expect(header.getByRole('button', { name: 'Contact', exact: true })).toBeFocused();
    await header.getByRole('button', { name: 'Mission', exact: true }).click();
    expect((await panel.getByRole('complementary', { name: 'Our mission' }).boundingBox())?.width).toBeCloseTo(499, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
