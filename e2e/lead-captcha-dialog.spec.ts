import { expect, test } from '@playwright/test';
import { fixtureImpact } from './helpers';

test('the guide dialog keeps the external challenge interactive and restores the page', async ({ page, baseURL }) => {
  test.skip(process.env.E2E_LEAD_CAPTCHA_REQUIRED !== '1', 'Requires a loopback server configured for required CAPTCHA');

  const ownOrigin = new URL(baseURL!).origin;
  const captchaOrigin = 'https://www.google.com';
  let requestCount = 0;
  let releaseRequest!: () => void;
  const holdRequest = new Promise<void>((resolve) => { releaseRequest = resolve; });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === ownOrigin) {
      if (request.method() === 'GET') return route.fallback();
      if (request.method() === 'POST' && request.headers()['next-action']) {
        requestCount++;
        await holdRequest;
      }
      return route.abort();
    }
    if (url.origin === captchaOrigin && url.pathname === '/recaptcha/api.js') {
      return route.fulfill({ contentType: 'application/javascript', body: `
        window.grecaptcha = {
          render(container, options) {
            const anchor = document.createElement('button');
            anchor.type = 'button';
            anchor.textContent = 'Open synthetic challenge';
            anchor.onclick = () => {
              const outer = document.createElement('div');
              outer.id = 'synthetic-challenge';
              outer.style.cssText = 'position:fixed;left:24px;top:24px;z-index:2000000000';
              const inner = document.createElement('div');
              const frame = document.createElement('iframe');
              frame.title = 'Synthetic image challenge';
              inner.append(frame);
              outer.append(inner);
              document.body.append(outer);
              frame.onload = () => {
                frame.focus();
                frame.contentWindow.postMessage('synthetic-focus', 'https://www.google.com');
              };
              setTimeout(() => { frame.src = 'https://www.google.com/recaptcha/api2/bframe?k=synthetic'; }, 0);
              window.addEventListener('message', event => {
                if (event.source !== frame.contentWindow || event.origin !== 'https://www.google.com' || event.data !== 'synthetic-solved') return;
                outer.remove();
                options.callback('synthetic-challenge-token');
                anchor.focus();
              }, { once: true });
            };
            container.append(anchor);
            return 1;
          },
          reset() {}
        };
        window.vpcsLeadCaptchaLoaded();
      ` });
    }
    if (url.origin === captchaOrigin && url.pathname === '/recaptcha/api2/bframe') {
      return route.fulfill({ contentType: 'text/html', body: "<button onclick=\"parent.postMessage('synthetic-solved','*')\">Choose synthetic image</button><script>addEventListener('message', (event) => { if (event.source === parent && event.data === 'synthetic-focus') document.querySelector('button').focus(); });</script>" });
    }
    return route.abort();
  });
  await fixtureImpact(page);
  await page.goto('/pcs-resources');
  await page.evaluate(() => {
    const before = document.createElement('div');
    before.id = 'already-inert';
    before.inert = true;
    document.body.append(before);
  });

  const trigger = page.getByRole('region', { name: 'Free downloadable guides' }).getByRole('button', { name: 'Get VA Loan Guide' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Free VA Loan Guide' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Privacy policy' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();

  const outsider = page.locator('#late-background');
  await page.evaluate(() => {
    const outside = document.createElement('div');
    outside.id = 'late-background';
    outside.innerHTML = '<div><iframe src="https://unrelated.invalid/recaptcha/api2/bframe"></iframe></div>';
    document.body.append(outside);
  });
  await expect(outsider).toHaveJSProperty('inert', true);
  const anchor = dialog.getByRole('button', { name: 'Open synthetic challenge' });
  await anchor.click();
  const challenge = page.locator('#synthetic-challenge');
  const frame = page.frameLocator('iframe[title="Synthetic image challenge"]');
  await expect(challenge).toHaveJSProperty('inert', false);
  const image = frame.getByRole('button', { name: 'Choose synthetic image' });
  await expect(image).toBeFocused();
  await image.press('Enter');
  await expect(challenge).toHaveCount(0);
  await expect(anchor).toBeFocused();

  await dialog.getByLabel('First name').fill('Synthetic');
  await dialog.getByLabel('Last name').fill('Captcha');
  await dialog.getByLabel('Email', { exact: true }).fill('modal@example.invalid');
  await dialog.getByRole('button', { name: 'Get my guide' }).click();
  try {
    await expect.poll(() => requestCount).toBe(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
  } finally {
    releaseRequest();
  }
  await expect(dialog.getByRole('alert')).toContainText(/couldn.t confirm/);
  await dialog.getByRole('button', { name: 'Close' }).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(outsider).toHaveJSProperty('inert', false);
  await expect(page.locator('#already-inert')).toHaveJSProperty('inert', true);

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(requestCount).toBe(1);
});
