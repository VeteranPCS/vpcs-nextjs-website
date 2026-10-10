import {test,expect} from '@playwright/test';

test('resources search preserves URL state, empty results, refresh and back',async({page})=>{
 await page.goto('/pcs-resources');
 const search=page.getByRole('searchbox',{name:'Search resources, guides, and tools'});
 await search.fill('PCS checklist');await page.getByRole('button',{name:'Search resources',exact:true}).click();
 await expect(page).toHaveURL(/q=PCS\+checklist#resource-library$/);await expect(page.locator('#library-title')).toHaveText('SEARCH RESULTS');await expect(page.locator('#resource-library')).toContainText('The Ultimate PCS Checklist');
 await page.reload();await expect(search).toHaveValue('PCS checklist');await expect(page.locator('#resource-library')).toContainText('The Ultimate PCS Checklist');
 await search.fill('zzx-no-resource-998');await page.getByRole('button',{name:'Search resources',exact:true}).click();await expect(page.getByRole('status')).toContainText('No resources found');
 await page.goBack();await expect(search).toHaveValue('PCS checklist');await expect(page.locator('#resource-library')).toContainText('The Ultimate PCS Checklist');
 await page.getByRole('button',{name:'Reset search and filters'}).click();await expect(search).toHaveValue('');await expect(page.locator('#library-title')).toHaveText('FEATURED RESOURCES');await expect(search).toBeFocused();
 await page.getByRole('button',{name:'Search resources',exact:true}).click();await expect(page.locator('#library-title')).toHaveText('ALL RESOURCES');await expect(page.locator('#resource-library article')).toHaveCount(12);
 await page.getByRole('button',{name:'Show More Resources'}).click();await expect(page.locator('#resource-library article')).toHaveCount(24);
});

test('resources categories, genuine destinations, bonus permalink and guide capture',async({page})=>{
 await page.goto('/pcs-resources');
 const categories=page.getByRole('region',{name:'BROWSE RESOURCES BY CATEGORY'});
 await categories.getByRole('link',{name:/Military Finance/}).click();await expect(page).toHaveURL(/category=military-finance/);await expect(page.locator('#library-title')).toHaveText('MILITARY FINANCE');
 await expect(page.getByRole('link',{name:'Calculate BAH',exact:true})).toHaveAttribute('href','/bah-calculator');await expect(page.getByRole('link',{name:'Calculate Now',exact:true})).toHaveAttribute('href','/va-loan-calculator');
 await expect(page.getByRole('link',{name:'View Checklist',exact:true}).first()).toHaveAttribute('href','/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel');
 await page.goto('/pcs-resources#move-in-bonus');await expect(page.getByRole('button',{name:'Estimated VeteranPCS Move-In Bonus'})).toHaveAttribute('aria-expanded','true');
 const price=page.getByRole('textbox',{name:'Planned home price'});await price.fill('650000');await expect(page.locator('#resource-bonus-panel output')).toHaveText('$2,000');await price.fill('1000000');await expect(page.locator('#resource-bonus-panel output')).toHaveText('$4,000');await price.fill('');await expect(page.locator('#resource-bonus-panel output')).toHaveText('—');
 await page.getByRole('button',{name:'Estimated VeteranPCS Move-In Bonus'}).click();await expect(price).not.toBeVisible();await page.getByRole('button',{name:'See My Bonus',exact:true}).click();await expect(price).toBeVisible();
 const trigger=page.getByRole('button',{name:'Get Homebuyer Guide',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'Free First-Time Homebuyer Guide'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('textbox',{name:'First name'})).toBeVisible();await dialog.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
 await page.getByRole('region',{name:'TRUSTED MILITARY RESOURCES'}).getByRole('button',{name:'View All Resources'}).click();await expect(page.getByRole('region',{name:'TRUSTED MILITARY RESOURCES'}).getByRole('link',{name:/MILITARY SPOUSE CHAMBER/})).toBeVisible();
});

test('resources composition stays readable across assigned viewport',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/pcs-resources');await expect(page.getByRole('heading',{name:'Military Moving Toolkit',level:1})).toBeVisible();
 expect(await page.getByRole('region',{name:'Military Moving Toolkit'}).evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('resources-hero-clean-region.png');
 await expect(page.getByRole('navigation',{name:'What do you need today?'}).getByRole('link')).toHaveCount(6);await expect(page.getByRole('region',{name:'FEATURED MILITARY TOOLS'}).getByRole('article')).toHaveCount(4);await expect(page.getByRole('region',{name:'BROWSE RESOURCES BY CATEGORY'}).getByRole('link')).toHaveCount(5);await expect(page.locator('#resource-library article')).toHaveCount(4);
 const featuredImages=page.locator('#resource-library article img');
 for(const [index,name] of ['packing','house','duty-station','signing'].entries()){await expect(featuredImages.nth(index)).toHaveAttribute('src',new RegExp(`resources-featured-${name}`));}
 await expect(page.getByRole('region',{name:'EXPLORE BY DUTY STATION'}).getByRole('link')).toHaveCount(7);
 const viewport=page.viewportSize()!;expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
 const tool=page.getByRole('region',{name:'FEATURED MILITARY TOOLS'}).getByRole('article').first();const rect=await tool.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(viewport.width===360?320:viewport.width<=390?170:220);
 const headingLines=await tool.locator('h3').evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));expect(headingLines).toBeLessThanOrEqual(3);
 // Scroll sections to load lazy images before recording the whole page.
 for(const id of ['library-title','installations-title','partners-title'])await page.locator(`#${id}`).scrollIntoViewIfNeeded();await page.locator('#resources-title').scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath(`resources-${viewport.width}.png`),fullPage:true});expect(errors).toEqual([]);
});
