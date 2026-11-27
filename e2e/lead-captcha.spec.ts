import { expect, test, type Page } from '@playwright/test';
import { fixtureImpact } from './helpers';

const fakeCaptchaToken = 'synthetic-playwright-captcha-token';

async function openForm(page: Page) {
  await fixtureImpact(page);
  await page.goto('/contact-agent?form=agent&state=colorado');
  await page.locator('#firstName').fill('Synthetic');
  await page.locator('#lastName').fill('Captcha');
  await page.locator('#email').fill('captcha@example.test');
  await page.locator('#currentBase').fill('Fixture Base');
  await page.locator('#destinationBase').fill('Fixture Destination');
  return page.getByRole('button', { name: 'Submit', exact: true });
}

test.describe('website CAPTCHA with an intercepted provider', () => {
  test.skip(process.env.E2E_LEAD_CAPTCHA_REQUIRED !== '1', 'Requires a loopback server configured for required CAPTCHA');

  test('the form blocks before challenge and sends the solved token only on submit', async ({ page, baseURL }, testInfo) => {
    const posts: string[] = [];
    await page.route(url => url.origin === new URL(baseURL!).origin, route => {
      const request = route.request();
      if (request.method() !== 'POST') return route.fallback();
      if (request.headers()['next-action']) posts.push(request.postData() ?? '');
      // At this UI boundary we observe the request without ever reaching the app server.
      return route.abort();
    });
    await page.route('https://www.google.com/recaptcha/api.js?*', route => route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.grecaptcha = {
          render(container, opts) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Solve test challenge';
            button.addEventListener('click', () => opts.callback(${JSON.stringify(fakeCaptchaToken)}));
            container.append(button);
            return 1;
          },
          reset() {}
        };
        window.vpcsLeadCaptchaLoaded();
      `,
    }));

    const submit = await openForm(page);
    await expect(page.getByRole('button', { name: 'Solve test challenge' })).toBeVisible();
    await submit.click();
    await expect(page.getByText('Complete the security check before submitting.')).toBeVisible();
    expect(posts).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('group', { name: 'Security verification' }).screenshot({ path: testInfo.outputPath('verification-required.png') });

    await page.getByRole('button', { name: 'Solve test challenge' }).click();
    await submit.click();
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toContain(fakeCaptchaToken);
    expect(posts[0]).not.toContain('captcha_settings');
    await expect(page.getByText(/couldn.t confirm/i)).toBeVisible();
    await page.getByRole('button', { name: 'Solve test challenge' }).click();
    expect(posts).toHaveLength(1);
    await expect(submit).toBeDisabled();
  });
});
