import { test, expect } from '@playwright/test';

const rates = { year: '2026', zipCode: '01234', rank: 'E05', mha: 'TEST DUTY STATION', withDependents: 2842, withoutDependents: 2400, difference: 442, isValid: true };

test('BAH calculator is explicit, accessible, and responsive', async ({ page }, testInfo) => {
    let calls = 0;
    await page.route('**/api/v1/bah', async route => {
        calls += 1;
        expect(route.request().postDataJSON()).toEqual({ zipCode: '01234', rank: '5', year: '26' });
        await route.fulfill({ json: { success: true, data: rates } });
    });
    await page.goto('/bah-calculator');
    await expect(page).toHaveTitle(/2026 BAH Calculator/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2026 Basic Allowance For Housing (BAH)');
    await expect(page.locator('#bah-calculator')).toHaveCount(1);
    await expect(page.locator('#bah-calculator img[src*="calculator.svg"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /VA Loan Calculator Estimate/ }).locator('img')).toHaveAttribute('src', /asset-28\.svg/);
    await expect(page.locator('section[aria-labelledby="bah-tools-title"] > div > img')).toHaveAttribute('src', /icons(?:%2F|\/)star\.svg/);
    await page.getByLabel('Pay Grade', { exact: true }).selectOption('5');
    await page.getByLabel('Duty Station ZIP Code').fill('01234');
    await page.waitForTimeout(650); expect(calls).toBe(0);
    await page.getByRole('button', { name: 'Calculate My BAH' }).click();
    await expect(page.getByTestId('bah-monthly')).toHaveText('$2,400');
    await page.getByLabel('Dependents', { exact: true }).selectOption('yes');
    await expect(page.getByTestId('bah-monthly')).toHaveText('$2,842');
    await expect(page.getByTestId('bah-annual')).toHaveText('$34,104');
    expect(calls).toBe(1);
    await page.getByLabel('Estimated Home Price').fill('420000');
    await expect(page.getByTestId('bah-bonus')).toHaveText('$1,200');
    expect(calls).toBe(1);
    for (const width of [360, 390, 767, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.getByRole('button', { name: 'Calculate My BAH' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const form = await page.locator('form').filter({ has: page.getByLabel('Duty Station ZIP Code') }).boundingBox();
        const result = await page.getByRole('heading', { name: 'Your 2026 BAH', exact: true }).boundingBox();
        expect(form).not.toBeNull(); expect(result).not.toBeNull();
        if (form && result && width < 768) expect(result.y).toBeGreaterThan(form.y + form.height);
        if (width === 768) {
            const guide = await page.getByRole('link', { name: /First Time Home Buyer Guide/ }).boundingBox();
            expect(guide).not.toBeNull();
            if (guide) expect(guide.width).toBeGreaterThanOrEqual(width - 80);
        }
        const price = await page.getByLabel('Estimated Home Price').boundingBox();
        const bonus = await page.getByTestId('bah-bonus').boundingBox();
        const agent = await page.getByRole('link', { name: /Find a Veteran or Mil Spouse Agent/ }).boundingBox();
        expect(price).not.toBeNull(); expect(bonus).not.toBeNull(); expect(agent).not.toBeNull();
        if (price && bonus && agent) {
            if (width < 768) {
                expect(bonus.y).toBeGreaterThan(price.y + price.height);
                expect(agent.y).toBeGreaterThan(bonus.y + bonus.height);
            } else {
                expect(bonus.x).toBeGreaterThan(price.x + price.width);
                if (width >= 1024) expect(agent.x).toBeGreaterThan(bonus.x + bonus.width);
                else expect(agent.y).toBeGreaterThan(bonus.y + bonus.height);
            }
        }
        const meaning = page.getByRole('region', { name: 'What does your BAH mean?' });
        const homeIcon = await meaning.locator('img[src*="asset-26.svg"]').boundingBox();
        const bonusIcon = await meaning.locator('img[src*="asset-28.svg"]').boundingBox();
        if (homeIcon && bonusIcon && price && bonus) {
            expect(homeIcon.x + homeIcon.width).toBeLessThan(price.x);
            expect(bonusIcon.x + bonusIcon.width).toBeLessThan(bonus.x);
            expect(homeIcon.width).toBeGreaterThanOrEqual(width >= 1101 ? 100 : 70);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        const title = await page.getByRole('heading', { level: 1 }).boundingBox();
        const header = await page.locator('[data-site-header]').boundingBox();
        if (title && header) expect(title.y).toBeGreaterThanOrEqual(header.y + header.height);
        await page.screenshot({ path: testInfo.outputPath(`bah-${width}.png`), fullPage: true });
        await page.getByRole('region', { name: 'What does your BAH mean?' }).screenshot({ path: testInfo.outputPath(`bah-interpretation-${width}.png`) });
    }
    await expect(page.getByRole('link', { name: /PCS Checklists/ })).toHaveAttribute('href', '/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel');
    await expect(page.getByRole('link', { name: /First Time Home Buyer Guide/ })).toHaveAttribute('href', '/guides#homebuyer-guide');
});


test('BAH bonus details opens the real explanation page', async ({ page }, testInfo) => {
    await page.goto('/bah-calculator');
    const details = page.getByRole('link', { name: 'See bonus details.', exact: true });
    await expect(details).toHaveAttribute('href', '/how-it-works');
    await details.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('bonus-details-link.png'), caret: 'initial' });
    await details.click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole('heading', { name: 'How the VeteranPCS Bonus Works', exact: true })).toBeVisible();
    expect((await page.request.get('/how-it-works')).status()).toBe(200);
    await expect(page.getByText('404 - Page Not Found', { exact: true })).not.toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('bonus-details-destination.png'), caret: 'initial' });
});
