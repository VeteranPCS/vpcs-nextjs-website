import { test, expect } from '@playwright/test';
import { fixtureImpact } from './helpers';

test('article action and concierge remain independently reachable', async ({ page }, testInfo) => {
  await fixtureImpact(page);
  await page.goto('/blog/pcs-moves-buying-or-selling-during-relocation');
  const launcher = page.getByRole('button', { name: 'Open chat with VeteranPCS concierge' });
  await expect(launcher).toBeVisible();
  const sticky = page.locator('[data-steph-article] > [data-cta-id^="blog_mobile_sticky_"]');
  const width = page.viewportSize()!.width;
  if (width < 1200) {
    await expect(sticky).toBeVisible();
    const action = await sticky.boundingBox();
    const chat = await launcher.boundingBox();
    expect(chat!.y + chat!.height).toBeLessThanOrEqual(action!.y - 12);
  } else {
    await expect(sticky).toBeHidden();
  }
  await launcher.click();
  await expect(page.getByRole('dialog', { name: 'VeteranPCS Concierge' })).toBeVisible();
  await page.getByRole('button', { name: 'Close concierge', exact: true }).click();
  await expect(launcher).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('article-controls.png') });
});
