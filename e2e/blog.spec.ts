import { test, expect } from '@playwright/test';
import { assertNoOverflow, fixtureImpact } from './helpers';
const slug='pcs-moves-buying-or-selling-during-relocation';
test('article structure, heading targets, long title and mobile sticky clearance',async({page},info)=>{
  await fixtureImpact(page);await page.goto(`/blog/${slug}`);const article=page.locator('[data-steph-article]');await expect(article.getByRole('heading',{level:1})).toHaveText("PCS Moves Made Easier: A Veteran's Guide to Buying or Selling During Relocation");
  const headerBottom=await page.locator('[data-site-header]').evaluate(el=>el.getBoundingClientRect().bottom);const breadcrumbTop=await article.getByRole('navigation',{name:'Breadcrumb'}).evaluate(el=>el.getBoundingClientRect().top);expect(breadcrumbTop).toBeGreaterThanOrEqual(headerBottom);
  await assertNoOverflow(page);const width=page.viewportSize()?.width??0;
  const sidebar=article.getByRole('complementary',{name:'Article resources'});
  if(width<1200){const summary=article.locator('summary');await expect(summary).toBeVisible();await summary.click();const target=article.getByRole('navigation',{name:'Article contents'}).getByRole('link').first();const href=await target.getAttribute('href');await target.click();const top=await page.locator(href??'#missing').evaluate(el=>el.getBoundingClientRect().top);expect(top).toBeGreaterThanOrEqual(126);const bodyRect=await article.getByRole('article',{name:'Article body'}).boundingBox(),sideRect=await sidebar.boundingBox();expect(sideRect?.y).toBeGreaterThan((bodyRect?.y??0)+(bodyRect?.height??0));const sticky=article.locator('[data-cta-id="blog_mobile_sticky_agent"]');await expect(sticky).toBeVisible();await article.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().bottom+scrollY-innerHeight));const final=await sidebar.locator('section').last().boundingBox(),stickyRect=await sticky.boundingBox();expect((final?.y??0)+(final?.height??0)).toBeLessThanOrEqual((stickyRect?.y??0)+1);
  }else{await expect(sidebar.getByRole('navigation',{name:'Table of Contents'})).toBeVisible();await expect(article.locator('[data-cta-id="blog_mobile_sticky_agent"]')).toBeHidden();}
  const tocIds=await sidebar.locator('nav[aria-label="Table of Contents"]').getByRole('link',{includeHidden:true}).evaluateAll(links=>links.map(link=>link.getAttribute('href')?.slice(1)));
  for(const id of tocIds)expect(await article.locator(`[id="${id}"]`).count()).toBe(1);
  const json=await page.locator(`script#json-ld-blog-${slug}`).textContent();expect(JSON.parse(json??'{}').headline).toContain('PCS Moves Made Easier');const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');expect(new URL(canonical??'').pathname).toBe(`/blog/${slug}`);expect(JSON.parse(json??'{}')['@id']).toBe(canonical);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('article-top.png')});await article.getByRole('region',{name:'Free homebuyer guide'}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('article-guide.png')});
});
test('TOC and prefilled guide dialog support keyboard close without sending a lead',async({page})=>{
  await page.goto(`/blog/${slug}`);const guide=page.getByRole('region',{name:'Free homebuyer guide'});await guide.getByRole('textbox',{name:'Email address'}).fill('preview@example.com');const trigger=guide.getByRole('button',{name:'Get My Free Guide'});const guideGeometry=await trigger.evaluate(button=>{const range=document.createRange();range.selectNodeContents(button);const label=range.getBoundingClientRect(),rect=button.getBoundingClientRect();return{left:label.left-rect.left,right:rect.right-label.right};});expect(guideGeometry.left).toBeGreaterThanOrEqual(19);expect(guideGeometry.right).toBeGreaterThanOrEqual(19);await trigger.click();const dialog=page.getByRole('dialog',{name:'Free First-Time Homebuyer Guide'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Email'})).toHaveValue('preview@example.com');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();await assertNoOverflow(page);
});
test('all resource destinations are real and genuine review carousel changes quote',async({page})=>{
  await page.goto(`/blog/${slug}`);const resources=page.getByRole('region',{name:'Helpful PCS Resources',exact:true});await expect(resources.getByRole('link')).toHaveCount(4);expect(await resources.getByRole('link').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).toEqual(['/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel','/bah-calculator','/blog/category/us-military-bases','/va-loan-help']);const quote=page.getByRole('region',{name:'Customer reviews'});await expect(quote).toContainText('Breanna Walker');await quote.getByRole('button',{name:'Next customer review'}).click();await expect(quote).toContainText('Hailey Jensen');await quote.getByRole('button',{name:'Previous customer review'}).click();await expect(quote).toContainText('Breanna Walker');const platforms=page.getByRole('link',{name:'See all platforms →'});await expect(platforms).toHaveAttribute('href','#article-social-platforms');await platforms.click();await expect(page.locator('#article-social-platforms')).toBeVisible();expect(await page.locator('#article-social-platforms a').count()).toBeGreaterThan(0);const related=page.getByRole('region',{name:'Related articles'});await expect(related.getByRole('link')).toHaveCount(4);await related.scrollIntoViewIfNeeded();for(const image of await related.locator('img').all())await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('VA posts retain lender intent, subject state and embedded partner attribution',async({page})=>{
  await page.goto('/blog/texas-va-loan-benefits-for-military-homebuyers');const article=page.locator('[data-steph-article]');await expect(article.getByRole('heading',{level:1})).toContainText('Texas VA Loan Benefits');await assertNoOverflow(page);
  const contacts=article.getByRole('link',{name:'Find a lender in Texas',exact:true});expect(await contacts.count()).toBeGreaterThanOrEqual(3);for(const href of await contacts.evaluateAll(links=>links.map(link=>link.getAttribute('href'))))expect(href).toBe('/contact-lender?form=lender&state=texas');
  const mdxContacts=article.locator('[data-article-body] a[href*="contact-"]');expect(await mdxContacts.count()).toBeGreaterThan(0);
});


test('bonus promotion loads the exact family image and keeps its blended photo below the CTA', async ({ page }, info) => {
  await fixtureImpact(page);
  await page.goto(`/blog/${slug}`);
  await expect(page.locator('[data-site-header]')).toContainText('$676,500');
  const promo = page.getByRole('complementary', { name: 'Article resources' }).locator('section').filter({ has: page.getByRole('heading', { name: 'VeteranPCS Bonus' }) });
  const photo = promo.getByRole('img', { name: 'VeteranPCS family receiving a move-in bonus check' });
  await promo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await photo.getAttribute('src')).toContain('blog-bonus-family.webp');
  const cta = promo.getByRole('link', { name: 'Learn More' });
  await expect(cta).toHaveAttribute('href', '/pcs-resources#move-in-bonus');
  const ctaBounds = await cta.boundingBox(), photoBounds = await photo.boundingBox(), promoBounds = await promo.boundingBox();
  expect(photoBounds!.y).toBeGreaterThan(ctaBounds!.y + ctaBounds!.height);
  expect(photoBounds!.width).toBeLessThanOrEqual(promoBounds!.width);
  const blend = await photo.evaluate(el => {
    const parent = el.parentElement!;
    const layer = getComputedStyle(parent, '::before');
    return { height: parseFloat(layer.height), imageHeight: el.getBoundingClientRect().height, pointerEvents: layer.pointerEvents, background: layer.backgroundImage };
  });
  expect(blend.height).toBeGreaterThan(80);
  expect(blend.height).toBeLessThan(blend.imageHeight / 2);
  expect(blend.pointerEvents).toBe('none');
  expect(blend.background).toContain('linear-gradient');
  await promo.screenshot({ path: info.outputPath('bonus-photo-blend.png'), caret: 'initial' });
});
