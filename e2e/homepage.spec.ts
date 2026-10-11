import { expect, test } from '@playwright/test';
import sharp from 'sharp';
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
  const mobile = (page.viewportSize()?.width ?? 0) < 768;
  if (mobile) await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeHidden();
  else {
    await expect(page.getByRole('heading', { name: 'Estimated VeteranPCS Bonus' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Home Price' }).fill('650000');
    await expect(page.locator('output')).toHaveText('$2,000');
  }
  await page.getByRole('tab', { name: 'Browse Resources' }).click();
  await expect(page.getByRole('link', { name: 'Move-In Bonus Calculator' })).toHaveAttribute('href', '/pcs-resources#move-in-bonus');
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
 if(width>=1200) { const art=await page.locator('img[src*="home-hero-family"]').boundingBox();expect(art!.width).toBeGreaterThan(550);expect(art!.width).toBeLessThan(640);const band=await ribbon.boundingBox();expect(band!.height).toBeGreaterThanOrEqual(210);expect(band!.height).toBeLessThanOrEqual(260);expect((await ribbon.getByRole('img',{name:'VeteranPCS',exact:true}).boundingBox())!.width).toBe(90); }
 const lender=page.locator('section[aria-labelledby="home-lender-title"]');await expect(lender.getByLabel('Verified community impact')).toContainText('$720,400');if(width>=1200)expect((await lender.getByRole('link',{name:'Contact a VA Loan Expert'}).boundingBox())!.width).toBe(415);
 if(width<768) { const guideTitle=lender.getByRole('heading',{name:'Get the Free VA Loan Guide'});const lines=await guideTitle.evaluate(node=>node.getBoundingClientRect().height/parseFloat(getComputedStyle(node).lineHeight));expect(lines).toBeLessThanOrEqual(3);const button=await lender.getByRole('button',{name:'Download Guide',exact:true}).boundingBox();const title=await guideTitle.boundingBox();expect(button!.y).toBeGreaterThan(title!.y+title!.height);expect(button!.width).toBeGreaterThanOrEqual(width-70); }
 for(const [name,region] of [['impact',ribbon],['lender',lender]] as const){await region.scrollIntoViewIfNeeded();await region.locator('img').evaluateAll(images=>Promise.all(images.filter(image=>image.getClientRects().length>0).map(image=>(image as HTMLImageElement).decode().catch(()=>{}))));await page.screenshot({path:testInfo.outputPath(`homepage-${name}-corrected.png`),caret:'initial'});}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.unroute('**/api/v1/impact');await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:false,data:null}}));await page.reload();await expect(page.getByLabel('Verified community impact')).toContainText('Giving Back');await expect(page.getByLabel('Verified community impact')).not.toContainText('$');await expect(ribbon.getByRole('link',{name:'See Our Impact'})).toHaveAttribute('href','/impact');
});


test('homepage preserves the source flag, square calculator pictogram and fifth partner', async ({ page }, testInfo) => {
  await fixtureImpact(page);
  await page.goto('/');
  await expect(page.locator('[data-site-header]')).toContainText('$676,500');
  await page.evaluate(() => document.fonts.ready);
  const width = page.viewportSize()!.width;
  const hero = page.locator('section[aria-labelledby="home-hero-title"]');
  const artwork = hero.locator('img[src*="home-hero-family"]');
  await artwork.evaluate((image: HTMLImageElement) => image.decode());
  if (width < 768) {
    // Sample the visible background beside the roof, above the family: the old
    // search-inclusive gradient made this region a solid navy rectangle.
    const art = await artwork.boundingBox();
    const clip = { x: width - 18, y: Math.ceil(art!.y + 10), width: 12, height: 75 };
    const pixels = await page.screenshot({ clip, caret: 'initial' });
    const { data, info } = await sharp(pixels).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // Raw RGB output contains three bytes for each complete pixel.
    let textured = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      if (Math.max(Math.abs(data[index]! - 6), Math.abs(data[index + 1]! - 28), Math.abs(data[index + 2]! - 68)) > 20) textured++;
    }
    expect(textured / (info.width * info.height)).toBeGreaterThan(0.4);
    const copy = await hero.locator('p[class*="heroSubtitle"]').boundingBox();
    const copyPixels = await page.screenshot({ clip: { x: width - 18, y: Math.ceil(copy!.y + 10), width: 12, height: 50 }, caret: 'initial' });
    const copyRgb = await sharp(copyPixels).removeAlpha().raw().toBuffer();
    let navy = 0;
    for (let index = 0; index < copyRgb.length; index += 3) {
      if (Math.max(Math.abs(copyRgb.readUInt8(index) - 6), Math.abs(copyRgb.readUInt8(index + 1) - 28), Math.abs(copyRgb.readUInt8(index + 2) - 68)) <= 2) navy++;
    }
    expect(navy / (copyRgb.length / 3)).toBeGreaterThan(0.95);
  } else {
    const calculator = page.getByRole('region', { name: 'Estimated VeteranPCS Bonus' });
    const icon = calculator.locator('img[src*="home-calculator-icon"]');
    const box = await icon.boundingBox();
    expect(box!.width).toBe(62);
    expect(box!.height / box!.width).toBeCloseTo(1, 2);
  }
  const tabs = page.getByRole('tablist', { name: 'Find your next home' });
  expect(await tabs.locator('[data-home-pictogram]').evaluateAll((icons) => icons.map((icon) => icon.getAttribute('data-home-pictogram')))).toEqual(['home', 'pin', 'users']);
  await tabs.getByRole('tab', { name: 'Find an Agent' }).press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Browse by State' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Choose your state' })).toBeVisible();
  const mission = page.getByRole('region', { name: 'Our Mission. Your Move.' });
  expect(await mission.locator('[data-mission-pictogram]').evaluateAll((icons) => icons.map((icon) => icon.getAttribute('data-mission-pictogram')))).toEqual(['pin', 'users', 'money', 'giving']);
  const partners = page.getByRole('region', { name: 'Features & Partners' });
  await expect(partners.getByRole('link')).toHaveCount(5);
  const hopkins = partners.getByRole('link', { name: 'Johns Hopkins University', exact: true });
  await expect(hopkins).toHaveAttribute('href', 'https://carey.jhu.edu/');
  const crest = hopkins.locator('span');
  const mark = await crest.boundingBox();
  expect(mark!.width).toBe(width < 768 ? 30 : 44);
  expect(mark!.height).toBe(width < 768 ? 40 : 60);
  await expect(crest).toHaveCSS('overflow', 'hidden');
  await expect(hopkins.getByRole('img')).toHaveAttribute('src', /johns-hopkins/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await testInfo.attach('homepage-correction', { body: await hero.screenshot({ caret: 'initial' }), contentType: 'image/png' });
});
