import { expect, test } from '@playwright/test';
import { fixtureImpact } from './helpers';
test('homepage keeps its core mobile and desktop paths usable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Together, We’ll Make It Home.', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByTestId('homepage-state-map').locator('svg')).toBeVisible();
  await expect(page.getByTestId('homepage-state-map').getByRole('link', { name: 'View VeteranPCS agents in Texas' })).toHaveAttribute('href', '/texas');
  await expect(page.getByRole('combobox', { name: 'Select a State' })).toBeVisible();
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 768 && width < 1200) {
    const mission = page.getByRole('region', { name: 'Our Mission. Your Move.' });
    const intro = await mission.locator('div').first().boundingBox();
    const firstStep = await mission.locator('li').first().boundingBox();
    expect(firstStep!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
    const stepTitleLines = await mission.locator('li h3').first().evaluate((node) => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight));
    expect(stepTitleLines).toBeLessThanOrEqual(2.1);
  }
  {
    await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Home Price' }).fill('650000');
    await expect(page.locator('output')).toHaveText('$2,000');
  }
  await page.getByRole('tab', { name: 'Browse Resources' }).click();
  await expect(page.getByRole('link', { name: 'VeteranPCS Bonus' })).toHaveAttribute('href', '/pcs-resources#move-in-bonus');
  await page.getByRole('tab', { name: 'Browse by State' }).click();
  await expect(page.getByRole('link', { name: 'Choose your state' })).toHaveAttribute('href', '#state-map');
  await page.getByRole('tab', { name: 'Find an Agent' }).click();
  await page.route('**/api/v1/location-search?**', (route) => route.fulfill({ json: { outcome: 'needs_state', message: 'Which state is Springfield in?', states: [{ name: 'Virginia', code: 'VA' }] } }));
  const search = page.getByRole('textbox', { name: 'City, state, base, or ZIP code' });
  await search.fill('Springfield');
  await page.getByRole('button', { name: 'Find an Agent', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Choose a state' })).toBeVisible();
  await expect(search).toHaveValue('Springfield');
  await page.unroute('**/api/v1/location-search?**');
  await page.route('**/api/v1/location-search?**', (route) => route.fulfill({ status: 503, json: {} }));
  await search.fill('Texas');
  await page.getByRole('button', { name: 'Find an Agent', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Search is unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Show review 2' }).click();
  await expect(page.getByRole('button', { name: 'Show review 2' })).toHaveAttribute('aria-current', 'true');
  const guide = page.getByRole('button', { name: 'Download Now', exact: true });
  await guide.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(guide).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `/private/tmp/steph-homepage-${testInfo.project.name}.png`, fullPage: true });
});

test('homepage source impact and lender geometry preserve verified data',async({page},testInfo)=>{
 await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:true,data:{available:true,cashBackAmount:'$720,400',charityAmount:'$69,760',totalVolumeSold:'1'}}}));await page.goto('/');await expect(page.locator('[data-site-header]')).toContainText('$720,400');
 const width=page.viewportSize()!.width;const ribbon=page.getByRole('region',{name:'Our community impact'});await expect(ribbon).toContainText('$720,400');await expect(ribbon.getByRole('link',{name:'See Our Impact'})).toHaveAttribute('href','/impact');
 if(width>=1200) { const art=await page.locator('img[src*="hero-house-check"]').boundingBox();expect(art!.width).toBeGreaterThan(550);expect(art!.width).toBeLessThan(640);const band=await ribbon.boundingBox();expect(band!.height).toBeGreaterThanOrEqual(210);expect(band!.height).toBeLessThanOrEqual(260);expect((await ribbon.getByRole('img',{name:'VeteranPCS',exact:true}).boundingBox())!.width).toBe(90); }
 const lender=page.locator('section[aria-labelledby="home-lender-title"]');await expect(lender.getByLabel('Verified community impact')).toContainText('$720,400');if(width>=1200)expect((await lender.getByRole('link',{name:'Contact a VA Loan Expert'}).boundingBox())!.width).toBe(415);
 if(width<768) { const guideTitle=lender.getByRole('heading',{name:'Get the Free VA Loan Guide'});const lines=await guideTitle.evaluate(node=>node.getBoundingClientRect().height/parseFloat(getComputedStyle(node).lineHeight));expect(lines).toBeLessThanOrEqual(3);const button=await lender.getByRole('button',{name:'Download Guide',exact:true}).boundingBox();const title=await guideTitle.boundingBox();expect(button!.y).toBeGreaterThan(title!.y+title!.height);expect(button!.width).toBeGreaterThanOrEqual(width-70); }
 for(const [name,region] of [['impact',ribbon],['lender',lender]] as const){await region.scrollIntoViewIfNeeded();await region.locator('img').evaluateAll(images=>Promise.all(images.filter(image=>image.getClientRects().length>0).map(image=>(image as HTMLImageElement).decode().catch(()=>{}))));await page.screenshot({path:testInfo.outputPath(`homepage-${name}-corrected.png`),caret:'initial'});}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.unroute('**/api/v1/impact');await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:false,data:null}}));await page.reload();await expect(page.getByLabel('Verified community impact')).toContainText('Giving Back');await expect(page.getByLabel('Verified community impact')).not.toContainText('$');await expect(ribbon.getByRole('link',{name:'See Our Impact'})).toHaveAttribute('href','/impact');
});


test('homepage explicit map activation, source art and responsive content', async ({ page }, testInfo) => {
  await fixtureImpact(page); await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const width = page.viewportSize()!.width;
  const tabs = page.getByRole('tablist', { name: 'Find your next home' });
  await tabs.getByRole('tab', { name: 'Find an Agent' }).press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Browse by State' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Find an Agent' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Where are you moving?' })).toBeFocused();
  const map = page.getByTestId('homepage-state-map');
  await expect(map.getByRole('link')).toHaveCount(52);
  const fills = await map.locator('.st0,.st2,.st3').evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).fill))]);
  expect(fills).toEqual(['rgb(169, 31, 35)']);
  const bonus = page.getByRole('region', { name: 'Estimated VeteranPCS Bonus' });
  await expect(bonus).toBeVisible();
  if (width < 768) {
    // Read together: explicit map activation may still be smoothly scrolling.
    const fields = await bonus.evaluate(node => {
      const price = node.querySelector('input[type="number"]')!.getBoundingClientRect();
      const amount = node.querySelector('output')!.getBoundingClientRect();
      const action = node.querySelector('a')!.getBoundingClientRect();
      return { priceBottom: price.bottom, amountTop: amount.top, amountBottom: amount.bottom, actionTop: action.top };
    });
    expect(fields.amountTop).toBeGreaterThan(fields.priceBottom);
    expect(fields.actionTop).toBeGreaterThan(fields.amountBottom);
  }
  expect((await bonus.boundingBox())!.y).toBeGreaterThan((await map.boundingBox())!.y);
  const impact = page.getByRole('region', { name: 'Our community impact' });
  const experts = impact.locator('div').filter({ hasText: /^Veteran & MilitarySpouse Experts$/ });
  if (width < 768) { await expect(experts).toBeHidden(); await expect(impact.getByText('Military Charities')).toBeVisible(); await expect(impact.getByText('Focused', { exact: false })).toBeVisible(); }
  else await expect(experts).toBeVisible();
  const hero = page.locator('section[aria-labelledby="home-hero-title"]');
  if (width < 768) {
    expect(await hero.locator('h1').evaluate(node => getComputedStyle(node).textAlign)).toBe('center');
    expect(await hero.locator('p[class*="heroSubtitle"]').evaluate(node => getComputedStyle(node).textAlign)).toBe('center');
  }
  await hero.scrollIntoViewIfNeeded(); await testInfo.attach('hero', { body: await hero.screenshot(), contentType: 'image/png' });
  await bonus.scrollIntoViewIfNeeded(); await testInfo.attach('bonus', { body: await bonus.screenshot(), contentType: 'image/png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});

test('homepage resources search preserves inputs and navigates with normalized queries', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section[aria-labelledby="home-hero-title"] form img[src*="search.svg"]')).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Find your next home' });
  await page.getByRole('textbox', { name: 'City, state, base, or ZIP code' }).fill('San Diego');
  await tabs.getByRole('tab', { name: 'Browse Resources' }).click();
  await expect(page.getByRole('search', { name: 'Homepage resources' }).locator('img[src*="search.svg"]')).toBeVisible();
  const resource = page.getByRole('searchbox', { name: 'Search resources, guides, and tools' });
  await resource.fill('  VA    loan  ');
  await tabs.getByRole('tab', { name: 'Find an Agent' }).click();
  await expect(page.getByRole('textbox', { name: 'City, state, base, or ZIP code' })).toHaveValue('San Diego');
  await tabs.getByRole('tab', { name: 'Browse Resources' }).click(); await expect(resource).toHaveValue('  VA    loan  ');
  await page.getByRole('button', { name: 'Search Resources', exact: true }).click();
  await expect(page).toHaveURL(/\/pcs-resources\?q=VA\+loan#resource-library$/);
  await expect(page.getByRole('heading', { name: 'Military Moving Toolkit' })).toBeVisible();
  await page.goto('/'); await tabs.getByRole('tab', { name: 'Browse Resources' }).click();
  await page.getByRole('button', { name: 'Search Resources', exact: true }).click();
  await expect(page).toHaveURL(/\/pcs-resources\?view=all#resource-library$/);
});

test('partner carousel contains seventeen distinct verified organizations and accessible controls', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const partners = page.getByRole('region', { name: 'Features & Partners' });
  await partners.scrollIntoViewIfNeeded();
  await expect(partners.locator('li')).toHaveCount(17);
  const width = page.viewportSize()!.width;
  await expect(partners.getByRole('link')).toHaveCount(width >= 1280 ? 5 : width >= 768 ? 3 : 2);
  const ids = await partners.locator('li').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-partner-id')));
  expect(new Set(ids).size).toBe(17);
  await expect(partners.locator('a[href="https://ivmf.syracuse.edu/news/veteran-and-military-spouse-owned-businesses-to-help-your-next-pcs-move"]')).toHaveCount(1);
  const visited = new Set<string>();
  for (let index = 0; index < 17; index++) {
    for (const name of await partners.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') ?? ''))) visited.add(name);
    await partners.getByRole('button', { name: 'Next partners' }).click();
  }
  expect(visited.size).toBe(17); expect(visited.has('Hiring Our Heroes')).toBe(true); expect(visited.has('Hire Heroes USA')).toBe(true);
  const visibleLinks = partners.getByRole('link');
  await visibleLinks.first().focus();
  for (let index = 1; index < await visibleLinks.count(); index++) { await page.keyboard.press('Tab'); await expect(visibleLinks.nth(index)).toBeFocused(); }
  await page.keyboard.press('Tab'); await expect(partners.getByRole('button', { name: 'Previous partners' })).toBeFocused();
  await expect(partners.getByRole('button', { name: 'Pause partner carousel' })).toBeVisible();
  await partners.getByRole('button', { name: 'Pause partner carousel' }).click();
  await expect(partners.getByRole('button', { name: 'Play partner carousel' })).toHaveAttribute('aria-pressed', 'true');
  await partners.getByRole('button', { name: 'Previous partners' }).click();
  await partners.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
  await testInfo.attach('partners', { body: await partners.screenshot(), contentType: 'image/png' });
});

test('partner autoplay pauses on hover, focus, hidden documents and reduced motion', async ({ page }) => {
  await page.clock.install(); await page.goto('/');
  const partners = page.getByRole('region', { name: 'Features & Partners' });
  const visibleNames = () => partners.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  await partners.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
  const initial = await visibleNames(); await page.clock.runFor(3100); expect(await visibleNames()).not.toEqual(initial);
  await partners.hover(); const hovered = await visibleNames(); await page.clock.runFor(6100); expect(await visibleNames()).toEqual(hovered);
  await partners.getByRole('button', { name: 'Next partners' }).focus(); await page.mouse.move(0, 0);
  const focused = await visibleNames(); await page.clock.runFor(6100); expect(await visibleNames()).toEqual(focused);
  await page.getByRole('heading', { name: 'Where are you moving?' }).focus();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await visibleNames(); await page.clock.runFor(6100); expect(await visibleNames()).toEqual(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' }); const reduced = await visibleNames(); await page.clock.runFor(6100); expect(await visibleNames()).toEqual(reduced);
});

test('homepage responsive boundaries keep only the experts impact column mobile-hidden', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Boundary checks run once.');
  for (const width of [767, 768, 1279, 1280]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
    const experts = page.locator('section[aria-label="Our community impact"] > div').filter({ hasText: 'Veteran & Military' });
    if (width < 768) await expect(experts).toBeHidden(); else await expect(experts).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Features & Partners' }).getByRole('link')).toHaveCount(width >= 1280 ? 5 : width >= 768 ? 3 : 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await testInfo.attach(`boundary-${width}`, { body: await page.locator('section[aria-label="Our community impact"]').screenshot(), contentType: 'image/png' });
  }
});

test('every homepage state preserves red fill through keyboard focus and pointer hover', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Complete state interaction coverage runs once.');
  await page.goto('/'); const map = page.getByTestId('homepage-state-map'); await map.scrollIntoViewIfNeeded();
  for (const link of await map.getByRole('link').all()) {
    await link.focus(); await link.hover({ force: true });
    const colors = await link.locator('.st0,.st2,.st3').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fill));
    expect(colors.length).toBeGreaterThan(0); expect(colors.every(color => color === 'rgb(169, 31, 35)')).toBe(true);
  }
});
