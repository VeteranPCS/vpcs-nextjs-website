// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), push: vi.fn(), gtm: vi.fn() }));
vi.mock('@/services/salesForcePostFormsService', () => ({ contactPostForm: mocks.submit, KeepInTouchForm: mocks.submit, vaLoanGuideForm: mocks.submit, homebuyerGuideForm: mocks.submit, internshipFormSubmission: mocks.submit, GetListedAgentsPostForm: mocks.submit, GetListedLendersPostForm: mocks.submit }));
vi.mock('@/services/clientMediaAccountService', () => ({ clientMediaAccountService: { fetchAccounts: vi.fn(async () => []) } }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks, usePathname: () => '/test' }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: mocks.gtm }));
vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({ captureAnalyticsEvent: vi.fn(), formTrackingPayload: () => ({}), trackFormStarted: vi.fn(), trackFormSubmitAttempted: vi.fn(), trackFormSubmissionFailed: vi.fn(), trackFormValidationFailed: vi.fn(), trackCtaClicked: vi.fn() }));
import { maintenanceNotSent } from '@/lib/leads/intake-maintenance';
import ContactForm from '@/components/contactpage/ContactForm/ContactForm';
import KeepInTouch from '@/components/homepage/KeepInTouch/KeepInTouch';
import VaGuide from '@/components/homepage/VaLoanGuideDownload';
import HomeGuide from '@/components/homepage/VeteranPCSWorksComp/HomebuyerGuideDownload';
import PcsGuide from '@/components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide';
import DownloadGuide from '@/components/common/DownloadGuideComponent';
import InternshipForm from '@/components/Internship/internshipapplication/InternshipForm';
import QuestionForm from '@/components/VALoanLanding/QuestionForm';
import AgentListing from '@/app/(site)/get-listed-agents/page';
import LenderListing from '@/app/(site)/get-listed-lenders/page';

beforeEach(() => {
 vi.clearAllMocks(); mocks.submit.mockReset(); mocks.submit.mockResolvedValue(maintenanceNotSent());
 vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fillForm(form: HTMLFormElement) {
 for (const select of form.querySelectorAll<HTMLSelectElement>('select')) {
   const option = Array.from(select.options).find(o => o.value === 'CO') ?? Array.from(select.options).find(o => o.value && !o.disabled);
   if(option) fireEvent.change(select, { target: { value: option.value } });
 }
 for (const input of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')) {
   if (!input.name || input.name === 'company_website' || input.type === 'hidden' || input.type === 'checkbox' || input.type === 'radio') continue;
   let value = 'Example';
   if (/email/i.test(input.name) || input.type === 'email') value = 'alex@example.test';
   else if (/phone|mobile/i.test(input.name) || input.type === 'tel') value = '7195550100';
   else if (input.name === '00N4x00000QPLQY') value = '12/31/2099';
   fireEvent.change(input, { target: { value } });
 }
 for (const toggle of form.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="listbox"]')) {
   fireEvent.click(toggle); fireEvent.click(screen.getByRole('option', { name: 'CO' }));
 }
}
const guideProps = { icon:'/icon/test.svg', iconAlt:'Guide', headerText:'Guide', contentText:'Guide details', downloadButtonText:'Download', secondaryButtonText:'More', secondaryButtonLink:'/', downloadFileName:'VA-Loan-Guide.pdf', downloadDisplayName:'Guide' };

describe.each([
 ['contact', <ContactForm key="contact"/>], ['newsletter', <KeepInTouch key="newsletter"/>], ['VA guide', <VaGuide key="VA guide"/>], ['homebuyer guide', <HomeGuide key="homebuyer guide"/>],
 ['PCS guide', <PcsGuide key="PCS guide"/>], ['shared VA download', <DownloadGuide key="shared VA download" {...guideProps}/>],
 ['shared homebuyer download', <DownloadGuide key="shared homebuyer download" {...guideProps} guideId="first_time_homebuyer_guide"/>],
 ['internship', <InternshipForm key="internship"/>], ['VA question', <QuestionForm key="VA question"/>],
] as const)('%s maintenance UI', (_name, component) => {
 it('keeps entered details and reports not sent without redirects, downloads, conversion events or automatic retry', async () => {
   const view = render(component);
   const form = view.container.querySelector('form')!;
   fillForm(form);
   const before = Array.from(form.querySelectorAll<HTMLInputElement>('input')).filter(input => input.name && input.type !== 'hidden').map(input => [input.name,input.value]);
   fireEvent.submit(form);
   await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
   expect((await screen.findByRole('alert')).textContent).toContain('Your request was not sent');
   for(const [name,value] of before) expect(form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value).toBe(value);
   expect(mocks.push).not.toHaveBeenCalled();
   expect(mocks.gtm).not.toHaveBeenCalled();
   expect(document.querySelector('a[download]')).toBeNull();
   expect(mocks.submit).toHaveBeenCalledTimes(1);
 });
});

describe.each([['agent',AgentListing],['lender',LenderListing]] as const)('%s listing maintenance', (_name, Page) => {
 it('preserves all four steps, unlocks the last step, and submits the same details only on explicit retry', async () => {
   const view=render(<Page/>);
   for(let step=1;step<=4;step++) {
     const form=view.container.querySelector('form')!;
     fillForm(form);
     fireEvent.submit(form);
     if(step<4) await waitFor(()=>expect(view.container.querySelector('form')).not.toBe(form));
   }
   await waitFor(()=>expect(mocks.submit.mock.calls.length, view.container.querySelector('form')?.textContent ?? '').toBe(1));
   const alert=await screen.findByRole('alert');
   expect(alert.textContent).toContain('Your request was not sent');
   expect(mocks.submit).toHaveBeenCalledTimes(1);
   const firstPayload = mocks.submit.mock.calls[0]?.[0];
   expect(firstPayload).toMatchObject({firstName:'Example',email:'alex@example.test',branch_select:expect.any(String)});
   expect(mocks.push).not.toHaveBeenCalled();
   expect(mocks.gtm).not.toHaveBeenCalled();
   const form=view.container.querySelector('form')!;
   await waitFor(()=>expect(form.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false));
   fireEvent.submit(form);
   await waitFor(()=>expect(mocks.submit).toHaveBeenCalledTimes(2));
   expect(mocks.submit.mock.calls[1]?.[0]).toEqual(firstPayload);
   await waitFor(()=>expect(form.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false));
   // A delayed response plus another form-state update cannot start a second request.
   let finish!: (value: unknown) => void;
   mocks.submit.mockReturnValueOnce(new Promise(done => { finish = done; }));
   fireEvent.submit(form);
   await waitFor(()=>expect(mocks.submit).toHaveBeenCalledTimes(3));
   fireEvent.submit(form);
   await act(async()=>{});
   expect(mocks.submit).toHaveBeenCalledTimes(3);
   await act(async()=>{finish(maintenanceNotSent());});
   // Revisiting earlier steps restores the values already collected in this open page.
   fireEvent.click(screen.getByRole('button',{name:'Back'}));
   const previous = view.container.querySelector('form')!;
   expect(previous).not.toBe(form);
   if (_name === 'agent') expect(previous.querySelector<HTMLInputElement>('[name="city"]')?.value).toBe(firstPayload.city);
   else expect(previous.querySelector<HTMLButtonElement>('#primaryState')?.textContent).toContain('CO');

 });
});

describe.each([['agent', AgentListing], ['lender', LenderListing]] as const)('%s listing recovery regressions', (name, Page) => {
 async function reachBlocked() {
  const view=render(<Page/>);
  for(let step=1;step<=4;step++) {
   const form=view.container.querySelector('form')!; fillForm(form); fireEvent.submit(form);
   if(step<4) await waitFor(()=>expect(view.container.querySelector('form')).not.toBe(form));
  }
  await screen.findByRole('alert');
  await waitFor(()=>expect(view.container.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false));
  return view;
 }
 it.each([false, true])('keeps accepted requests locked during navigation (throws: %s)', async (throws)=>{
  if (throws) mocks.push.mockImplementationOnce(() => { throw new Error('Mock navigation failure'); });
  const view=await reachBlocked();
  mocks.submit.mockResolvedValue({redirectUrl:'/thank-you'});
  const form=view.container.querySelector('form')!;
  fireEvent.submit(form);
  await waitFor(()=>expect(mocks.push).toHaveBeenCalledTimes(1));
  // Navigation has been requested, but the router has not unmounted this page yet.
  expect(form.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Back'}));
  expect(view.container.querySelector('form')).toBe(form);
  fireEvent.click(form.querySelector('button[type="submit"]')!);
  fireEvent.submit(form);
  await act(async()=>{});
  expect(mocks.submit).toHaveBeenCalledTimes(2);
 });
 it.each(['Corrected Company', ''])('retains a last-step draft across Back and Next without validation (%s)', async (draft)=>{
  const view=await reachBlocked();
  const field=name==='agent'?'brokerageName':'name';
  const form=view.container.querySelector('form')!;
  const input=form.querySelector<HTMLInputElement>(`[name="${field}"]`)!;
  expect(input).not.toBeNull();
  fireEvent.change(input,{target:{value:draft}});
  fireEvent.click(screen.getByRole('button',{name:'Back'}));
  const previous=view.container.querySelector('form')!;
  fireEvent.submit(previous);
  await waitFor(()=>expect(view.container.querySelector('form')).not.toBe(previous));
  expect(view.container.querySelector<HTMLInputElement>(`[name="${field}"]`)?.value).toBe(draft);
 });
});
