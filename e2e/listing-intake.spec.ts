import { expect, test } from '@playwright/test';
import { fixtureImpact, leadTimingReady } from './helpers';

for (const role of ['agents', 'lenders'] as const) {
  test(`${role} listing sends all four steps once per distinct attempt`, async ({ page }, testInfo) => {
    test.skip(process.env.E2E_LEAD_DRY_RUN !== '1', 'Requires an explicitly provisioned dry-run development server');
    const submissions: Array<Record<string, unknown>> = [];
    const path = `/get-listed-${role}`;
    await page.route(`**${path}`, async route => {
      if (route.request().method() === 'POST') {
        if (!route.request().headers()['next-action']) return route.abort('blockedbyclient');
        const [payload] = JSON.parse(route.request().postData() ?? '[]') as Array<Record<string, unknown>>;
        if (payload) submissions.push(payload);
      }
      return route.continue();
    });
    await fixtureImpact(page);
    await page.goto(path);
    await page.locator('#firstName').fill('Synthetic');
    await page.locator('#lastName').fill('Listing');
    await page.locator('#email').fill('synthetic-listing@example.com');
    await page.locator('#phone').fill('2025550101');
    await page.getByRole('button', { name: 'Go Next' }).click();
    await page.locator('#status_select').selectOption('Veteran');
    await page.locator('#branch_select').selectOption('Army');
    await page.locator('#discharge_status').selectOption('Honorable Discharge');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator(role === 'agents' ? '#state' : '#primaryState').click();
    await page.getByRole('option', { name: 'CO', exact: true }).click();
    if (role === 'agents') {
      await page.locator('#city').fill('Denver');
    } else {
      await page.locator('#localCities').fill('Denver');
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const timingReady = leadTimingReady();
    if (role === 'agents') {
      await page.locator('#licenseNumber').fill('QA-789');
      await page.locator('#brokerageName').fill('Synthetic Brokerage');
      await page.locator('#managingBrokerName').fill('QA Broker');
      await page.locator('#managingBrokerPhone').fill('2025550102');
      await page.locator('#managingBrokerEmail').fill('synthetic-broker@example.com');
    } else {
      await page.locator('#name').fill('Synthetic Mortgage');
      await page.locator('#street').fill('100 Synthetic Street');
    }
    await page.locator('#howDidYouHear').selectOption('Other');
    await page.locator('#tellusMore').fill('Synthetic application note');
    expect(submissions).toHaveLength(0);

    const trap = page.locator('input[name=company_website]');
    await trap.evaluate((input: HTMLInputElement) => { input.value = 'synthetic-filled-honeypot'; });
    const submit = page.getByRole('button', { name: 'Submit Now' });
    await submit.click();
    const alert = page.getByRole('alert').filter({ hasText: 'couldn’t accept' });
    await expect(alert).toContainText('couldn’t accept');
    await expect(page.locator('#tellusMore')).toHaveValue('Synthetic application note');
    await alert.screenshot({ path: testInfo.outputPath('listing-rejection.png') });
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({
      firstName: 'Synthetic', lastName: 'Listing', email: 'synthetic-listing@example.com',
      status_select: 'Veteran', discharge_status: 'Honorable Discharge',
      company_website: 'synthetic-filled-honeypot', tellusMore: 'Synthetic application note',
      ...(role === 'agents' ? { state: 'CO', city: 'Denver', licenseNumber: 'QA-789', otherStates: [] }
        : { primaryState: 'CO', localCities: 'Denver', name: 'Synthetic Mortgage' }),
    });

    await trap.evaluate((input: HTMLInputElement) => { input.value = ''; });
    await timingReady;
    await submit.click();
    await expect(page).toHaveURL(/\/thank-you/);
    expect(submissions).toHaveLength(2);
    const id = submissions[0]?.submission_attempt_id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(submissions[1]).toMatchObject({ company_website: '', submission_attempt_id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(submissions[1]?.submission_attempt_id).not.toBe(id);
  });
}
