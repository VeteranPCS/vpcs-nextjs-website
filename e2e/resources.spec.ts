import {test,expect} from '@playwright/test';
import sharp from 'sharp';

test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{const url=new URL(route.request().url());return ['localhost','127.0.0.1'].includes(url.hostname)?route.continue():route.abort();});
 await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:true,data:{cashBackAmount:'$720,400',charityAmount:'$69,760',available:true,totalVolumeSold:'1'}}}));
});

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
 await page.getByRole('region',{name:'TRUSTED MILITARY RESOURCES'}).getByRole('button',{name:'View All Resources'}).click();await expect(page.getByRole('region',{name:'TRUSTED MILITARY RESOURCES'}).getByRole('link',{name:'Military Spouse Chamber of Commerce',exact:true})).toBeVisible();
});

test('resources composition stays readable across assigned viewport',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/pcs-resources');await expect(page.getByRole('heading',{name:'Military Moving Toolkit',level:1})).toBeVisible();
 await expect(page.getByTestId('resources-hero-photo').locator('img')).toHaveAttribute('src',/resources-hero-photo-region\.png/);
 await expect(page.getByRole('navigation',{name:'What do you need today?'}).getByRole('link')).toHaveCount(6);await expect(page.getByRole('region',{name:'FEATURED MILITARY TOOLS'}).getByRole('article')).toHaveCount(4);await expect(page.getByRole('region',{name:'BROWSE RESOURCES BY CATEGORY'}).getByRole('link')).toHaveCount(5);await expect(page.locator('#resource-library article')).toHaveCount(4);
 const featuredImages=page.locator('#resource-library article img');
 for(const [index,name] of ['packing','house','duty-station','signing'].entries()){await expect(featuredImages.nth(index)).toHaveAttribute('src',new RegExp(`resources-featured-${name}`));}
 await expect(page.getByRole('region',{name:'EXPLORE BY DUTY STATION'}).getByRole('link')).toHaveCount(7);
 const viewport=page.viewportSize()!;expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
 const tool=page.getByRole('region',{name:'FEATURED MILITARY TOOLS'}).getByRole('article').first();const rect=await tool.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(viewport.width===360?320:viewport.width<=390?170:220);
 const headingLines=await tool.locator('h3').evaluate(el=>el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight));expect(headingLines).toBeLessThanOrEqual(3);
 // Scroll sections to load lazy images before recording the whole page.
 for(const id of ['library-title','installations-title','partners-title'])await page.locator(`#${id}`).scrollIntoViewIfNeeded();await page.locator('#resources-title').scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath(`resources-${viewport.width}.png`),fullPage:true,caret:'initial'});expect(errors).toEqual([]);
});

// Enter a query in the server-rendered field before client chunks hydrate it.
test('resources preserves early input through hydration',async({page})=>{
 await page.route('**/api/v1/impact',route=>route.fulfill({json:{success:true,data:{cashBackAmount:'$720,400',charityAmount:'$69,760',totalVolumeSold:'1',available:true}}}));
 let release!:()=>void;
 const ready=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/_next/static/**',async route=>{if(route.request().resourceType()==='script')await ready;await route.continue();});
 try {
  await page.goto('/pcs-resources',{waitUntil:'commit'});
  const search=page.getByRole('searchbox',{name:'Search resources, guides, and tools'});
  await search.fill('PCS checklist');
  release();
  // The impact fetch is triggered by mounted client effects, without a timing delay.
  await expect(page.locator('[data-site-header]')).toContainText('$720,400');
  await expect(search).toHaveValue('PCS checklist');
  await page.getByRole('button',{name:'Search resources',exact:true}).click();
  await expect(page).toHaveURL(/q=PCS\+checklist#resource-library$/);
  await expect(page.locator('#library-title')).toHaveText('SEARCH RESULTS');
 } finally {release();}
});


test('source organization logos load, link correctly, and preserve expanded resources',async({page},info)=>{
 await page.goto('/pcs-resources');
 const section=page.getByRole('region',{name:'TRUSTED MILITARY RESOURCES'});
 const names=['Military OneSource','Hiring Our Heroes','Military Spouse Chamber of Commerce','Bunker Labs','USO'];
 const urls=['https://www.militaryonesource.mil/','https://www.hiringourheroes.org/','https://milspousechamber.org/','https://ivmf.syracuse.edu/bunker-labs/','https://www.uso.org/'];
 await expect(section.getByRole('link')).toHaveCount(5);
 for(const [index,name] of names.entries()){
  const link=section.getByRole('link',{name,exact:true});await expect(link).toHaveAttribute('href',urls[index]!);
  const image=link.locator('img');await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const bounds=await image.boundingBox();expect(bounds!.width).toBeGreaterThan(90);expect(bounds!.height).toBeGreaterThanOrEqual(50);
 }
 const y=await section.evaluate(el=>el.getBoundingClientRect().top+scrollY);
 await page.evaluate(({y,h})=>scrollTo(0,y-h-12),{y,h:(page.viewportSize()?.width??0)>=1280?208:128});
 await page.screenshot({path:info.outputPath('organization-row.png'),caret:'initial'});
 await section.getByRole('button',{name:'View All Resources'}).click();
 await expect(section.getByRole('link',{name:'Squared Away',exact:true})).toBeVisible();await expect(section.getByRole('link',{name:'Porch',exact:true})).toBeVisible();await expect(section.getByRole('link',{name:'USO',exact:true})).toBeVisible();
});

test('wide hero blends its native photo boundary without a vertical stripe',async({page},info)=>{
 test.skip((page.viewportSize()?.width??0)!==1920,'The reproduced seam is most exposed at the wide viewport.');
 await page.goto('/pcs-resources');await expect(page.locator('[data-site-header]')).toContainText(/given back/i);
 const frame=page.getByTestId('resources-hero-photo');const image=frame.locator('img');await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const hero=await page.getByRole('region',{name:'Military Moving Toolkit'}).boundingBox();const edge=1920-hero!.height*424/247;
 const buffer=await page.screenshot({path:info.outputPath('hero-boundary.png'),caret:'initial'});
 const {data,info:bitmap}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let total=0,samples=0;
 // The exposed photo boundary is right of the copy; average across a vertical band
 // so individual flag folds do not count as a persistent rectangular image edge.
 for(let y=Math.round(hero!.y+hero!.height*.16);y<hero!.y+hero!.height*.62;y++)for(let channel=0;channel<3;channel++){
  total+=Math.abs(data[(y*bitmap.width+Math.floor(edge)-1)*3+channel]!-data[(y*bitmap.width+Math.floor(edge)+1)*3+channel]!);samples++;
 }
 // Old multi-background rendering measured53.3; the corrected blend measures~2.8.
 expect(total/samples).toBeLessThan(15);
});


test('guide strip triggers do not restyle the dialog close control',async({page},info)=>{
 await page.goto('/pcs-resources');const strip=page.getByRole('region',{name:'Free downloadable guides'});
 const trigger=strip.getByRole('button',{name:'Get VA Loan Guide'});await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Free VA Loan Guide'});const close=dialog.getByRole('button',{name:'Close',exact:true});
 await expect(dialog.getByRole('heading',{name:'Free VA Loan Guide'})).toHaveCSS('font-size','26px');await expect(close).toHaveCSS('padding','0px');expect((await close.boundingBox())!.width).toBeLessThanOrEqual(48);
 await page.screenshot({path:info.outputPath('guide-strip-dialog.png'),caret:'initial'});await close.click();await expect(trigger).toBeFocused();
});
