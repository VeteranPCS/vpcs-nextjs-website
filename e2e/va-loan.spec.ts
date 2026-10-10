import { expect,test } from '@playwright/test';
import { assertNoOverflow,fixtureImpact } from './helpers';
test('VA landing keeps qualified benefits, routes and responsive form usable',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await fixtureImpact(page);await page.goto('/va-loan-help');
 await expect(page.getByRole('heading',{level:1,name:'VA Loan Made for You.'})).toBeVisible();
 const sourceImages=['va-hero-photo-region','va-resource-guide','va-resource-calculator','va-resource-moving','va-resource-family'];
 for(const name of sourceImages)await expect(page.locator(`main img[src*="${name}"]`)).toHaveCount(1);
 await expect(page.getByRole('link',{name:'Get Pre-Approved Today'})).toHaveAttribute('href','/contact-lender');
 await expect(page.getByRole('link',{name:'Check Your Eligibility'})).toHaveAttribute('href','/contact-lender');
 await expect(page.getByRole('link',{name:'Try Our VA Loan Calculator'})).toHaveAttribute('href','/va-loan-calculator');
 await expect(page.getByRole('link',{name:'Request a Call Connect with a VA loan expert.'})).toHaveAttribute('href','/contact');
 const hero=await page.getByTestId('va-hero-visual').boundingBox(),invite=await page.getByTestId('va-calculator-invitation').boundingBox();
 expect(invite!.x).toBeGreaterThanOrEqual(hero!.x);expect(invite!.x+invite!.width).toBeLessThanOrEqual(hero!.x+hero!.width+1);
 expect(invite!.y+invite!.height).toBeLessThanOrEqual(hero!.y+hero!.height+1);
 const form=page.getByRole('form',{name:'Ask a VA loan question'});await form.getByRole('button',{name:/Ask a VA Loan Expert/}).click();
 await expect(form.getByText('Enter your VA loan question.')).toBeVisible();await expect(form.getByText('Enter your first name.')).toBeVisible();
 await form.getByLabel('What’s your question?').fill('How does VA eligibility work?');await form.getByLabel('First name').fill('Alex');await form.getByLabel('Last name').fill('Smith');await form.getByLabel('Email address').fill('alex@example.com');
 await page.screenshot({path:`/private/tmp/steph-va-loan-form-${testInfo.project.name}.png`,fullPage:true});
 let attempts=0;
 await page.route('**/va-loan-help',async route=>{
  if(route.request().method()!=='POST'||!route.request().headers()['next-action'])return route.continue();
  attempts++;
  const payload=route.request().postData()??'';
  expect(payload).toContain('firstName');expect(payload).toContain('additionalComments');expect(payload).toContain('form_rendered_at');expect(payload).toContain('alex@example.com');
  if(attempts===1){await new Promise(resolve=>setTimeout(resolve,350));return route.fulfill({status:503,body:'Unavailable'});}
  return route.fulfill({status:200,contentType:'text/x-component',body:'0:{"a":"$@1","f":"","b":"test"}\n1:{"success":true}\n'});
 });
 await form.getByRole('button',{name:/Ask a VA Loan Expert/}).click();await expect(form.getByRole('button',{name:'Sending…'})).toBeDisabled();await form.evaluate(node=>{node.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));node.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});await expect(form.getByRole('alert')).toBeVisible();expect(attempts).toBe(1);await expect(form.getByLabel('First name')).toHaveValue('Alex');
 await form.getByRole('button',{name:/Ask a VA Loan Expert/}).click();await expect(page.getByRole('status').filter({hasText:'We received your VA loan question'})).toBeVisible();expect(attempts).toBe(2);
 await assertNoOverflow(page);expect(errors).toEqual([]);
 for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=650){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(50);}await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:`/private/tmp/steph-va-loan-${testInfo.project.name}.png`,fullPage:true});
});
