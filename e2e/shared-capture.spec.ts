import { test, expect } from '@playwright/test';
import { fixtureImpact, leadTimingReady } from './helpers';

// Enable only after launching this loopback dev server with LEAD_DRY_RUN=1.
// Production deliberately ignores LEAD_DRY_RUN and must never run this test.
test('guide capture validates, traps focus, submits once, and restores focus', async ({ page }, testInfo) => {
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1', 'Requires an explicitly provisioned dry-run development server');
  let submissions = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.headers()['next-action']) submissions += 1; });
  await fixtureImpact(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Download Now', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Free First-Time Homebuyer Guide' });
  await expect(dialog).toBeVisible();
  const timingReady = leadTimingReady();
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  await expect(dialog.getByLabel('First name')).toBeFocused();
  await dialog.getByLabel('First name').fill('Redesign');
  await dialog.getByLabel('Last name').fill('Verification');
  await dialog.getByLabel('Email', { exact: true }).fill('redesign-verification@example.com');
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('guide-dialog.png') });
  await timingReady;
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  await expect(dialog.getByRole('status')).toContainText('Your guide is ready.');
  expect(submissions).toBe(1);
  expect((await downloaded).suggestedFilename()).toBe('first-time-home-buyer-guide.pdf');
  expect(new URL(page.url()).origin).toBe(new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100').origin);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('an unconfirmed guide submission stays blocked after reloading the tab', async ({ page }) => {
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1', 'Requires an explicitly provisioned dry-run development server');
  await fixtureImpact(page);
  let submissions = 0;
  await page.route('**/pcs-resources', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      submissions += 1;
      return route.abort('failed');
    }
    return route.continue();
  });
  await page.goto('/pcs-resources');
  const trigger = page.getByRole('region', { name: 'Free downloadable guides' }).getByRole('button', { name: 'Get VA Loan Guide' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Free VA Loan Guide' });
  await dialog.getByLabel('First name').fill('Synthetic');
  await dialog.getByLabel('Last name').fill('QA');
  await dialog.getByLabel('Email', { exact: true }).fill('guide-qa@example.com');
  const submit = dialog.getByRole('button', { name: 'Get my guide' });
  await submit.click();
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('may already have reached us');
  await expect(submit).toBeDisabled();
  const reference = (await alert.innerText()).match(/Reference ([0-9a-f-]{36})/)?.[1];
  if (!reference) throw new Error('Missing submission reference');

  await page.reload();
  await trigger.click();
  await expect(alert).toContainText(reference);
  await expect(submit).toBeDisabled();
  expect(submissions).toBe(1);
});

test('guide triggers wait for their dialog to mount before accepting input', async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script' && new URL(route.request().url()).pathname.startsWith('/_next/')) await scriptsReady;
    await route.continue();
  });
  await fixtureImpact(page);
  try {
    await page.goto('/pcs-resources', { waitUntil: 'commit' });
    const trigger = page.getByRole('region', { name: 'Free downloadable guides' }).getByRole('button', { name: 'Get VA Loan Guide' });
    await expect(trigger).toBeVisible();
    // Server-rendered controls must not silently accept a click before the
    // client portal exists. Release the real scripts; no hydration state is mocked.
    await expect(trigger).toBeDisabled();
    releaseScripts();
    await expect(trigger).toBeEnabled();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Free VA Loan Guide' });
    await expect(dialog).toBeVisible();
    await dialog.press('Escape');
    await expect(trigger).toBeFocused();
  } finally {
    releaseScripts();
  }
});
