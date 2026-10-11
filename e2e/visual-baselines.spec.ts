import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { fixtureImpact } from './helpers';

// Snapshot-only contexts allow Playwright's temporary screenshot stylesheet.
// Browser health and interaction suites exercise the normal application CSP.
test.use({ bypassCSP: true });

// These two source regions passed both independent reviewers. Pages with open
// image-composition dependencies retain evidence captures, not approved snapshots.
test('reviewed navigation frame visual baseline', async ({ page }) => {
  await fixtureImpact(page);
  await page.goto('/');
  const header = page.locator('[data-site-header]');
  await expect(header).toContainText('$676,500');
  await page.evaluate(() => document.fonts.ready);
  await expect(header).toHaveScreenshot('navigation-frame.png', { animations: 'disabled', caret: 'initial', stylePath: join(__dirname, 'screenshot.css') });
});

test('reviewed BAH form and interpretation visual baseline', async ({ page }) => {
  await fixtureImpact(page);
  await page.goto('/bah-calculator');
  await expect(page.locator('[data-site-header]')).toContainText('$676,500');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('bah-form.png', { fullPage: true, animations: 'disabled', caret: 'initial', stylePath: join(__dirname, 'screenshot.css') });
});
