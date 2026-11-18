import { test, expect, type Page } from '@playwright/test';
import { fixtureImpact } from './helpers';

// A visitor who picks an agent on a state page lands here with that agent in the query string.
// Every "Find an Agent" link on this page points back at the page itself; none of them may
// drop the selection, because the lead is submitted with whatever the address bar holds.
const AGENT_ID = 'E2EAGENT0000001';
const cardUrl = `/contact-agent?form=agent&fn=Test&id=${AGENT_ID}&state=texas`;
const desktopHeader = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;

async function openSelectedAgent(page: Page) {
  await fixtureImpact(page);
  await page.goto(cardUrl);
  // The heading only names the agent after hydration, so links are client-routed from here on.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact Test');
}

async function clickHeaderFindAgent(page: Page) {
  if (desktopHeader(page)) {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Find an Agent', exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mobile navigation' });
  await dialog.getByRole('link', { name: 'Find an Agent', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function expectSelectionKept(page: Page) {
  // Client routing is asynchronous: give a regression time to rewrite the address.
  await page.waitForTimeout(750);
  const url = new URL(page.url());
  expect(url.pathname).toBe('/contact-agent');
  expect(Object.fromEntries(url.searchParams)).toEqual({ form: 'agent', fn: 'Test', id: AGENT_ID, state: 'texas' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact Test');
}

test('header Find an Agent keeps the selected agent in the address', async ({ page }) => {
  await openSelectedAgent(page);
  await page.evaluate(() => window.scrollTo(0, 400));
  await clickHeaderFindAgent(page);
  await expectSelectionKept(page);
  // Unchanged visible result: the page returns to the top, where the form starts.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // Repeat clicks are common on this page and must stay harmless.
  await clickHeaderFindAgent(page);
  await expectSelectionKept(page);
});

test('menu and footer agent links keep the selected agent in the address', async ({ page }) => {
  await openSelectedAgent(page);
  if (desktopHeader(page)) {
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Contact' }).click();
    await page.locator('#desktop-navigation-panel').getByRole('link', { name: /Match With an Agent/ }).click();
  } else {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mobile navigation' });
    await dialog.getByRole('button', { name: 'Contact' }).click();
    await dialog.getByRole('link', { name: /Match With an Agent/ }).click();
  }
  await expectSelectionKept(page);
  await page.locator('a[href="/contact-agent"]').filter({ hasText: 'Find an Agent', visible: true }).last().click();
  await expectSelectionKept(page);
});

// Enable only after launching this loopback dev server with LEAD_DRY_RUN=1.
// Production deliberately ignores LEAD_DRY_RUN and must never run this test.
test('the selected agent reaches the lead submission after a header click', async ({ page }) => {
  test.skip(process.env.E2E_LEAD_DRY_RUN !== '1', 'Requires an explicitly provisioned dry-run development server');
  const submissions: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.headers()['next-action']) submissions.push(request.postData() ?? ''); });
  await openSelectedAgent(page);
  await clickHeaderFindAgent(page);
  await page.locator('#firstName').fill('RoutingFix');
  await page.locator('#lastName').fill('Verification');
  await page.locator('#email').fill('routing-fix-verification@example.com');
  await page.locator('#currentBase').fill('Fixture Base');
  await page.locator('#destinationBase').fill('Fixture Destination');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0]).toContain(`id=${AGENT_ID}`);
  expect(submissions[0]).toContain('state=texas');
  await expect(page).toHaveURL(/\/thank-you/);
  expect(submissions).toHaveLength(1);
});
