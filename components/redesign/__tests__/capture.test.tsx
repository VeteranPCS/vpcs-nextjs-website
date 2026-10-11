// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({submit:vi.fn()}));
vi.mock('@/services/salesForcePostFormsService',()=>({KeepInTouchForm:mocks.submit,vaLoanGuideForm:mocks.submit,homebuyerGuideForm:mocks.submit}));
vi.mock('@/lib/analytics/client',()=>({captureAnalyticsEvent:vi.fn(),formTrackingPayload:()=>({}),trackFormStarted:vi.fn(),trackFormSubmitAttempted:vi.fn(),trackFormSubmissionFailed:vi.fn(),trackCtaClicked:vi.fn()}));
import LeadCaptureDialog from '../LeadCaptureDialog';
beforeEach(()=>{mocks.submit.mockReset();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(cleanup);
function fill(){fireEvent.change(screen.getByLabelText('First name'),{target:{value:'Test'}});fireEvent.change(screen.getByLabelText('Last name'),{target:{value:'Family'}});}
describe('shared capture',()=>{
 it('opens with email prefilled and collects genuine name fields',async()=>{mocks.submit.mockResolvedValue({success:true});render(<LeadCaptureDialog kind="newsletter" initialEmail="test@example.com" triggerLabel="Subscribe"/>);fireEvent.click(screen.getByText('Subscribe'));expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('test@example.com');fill();fireEvent.submit(screen.getByLabelText('Email').closest('form')!);await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('received'));expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({firstName:'Test',lastName:'Family',email:'test@example.com'}));});
 it('preserves entered details on failure and permits explicit retry',async()=>{mocks.submit.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({success:true});render(<LeadCaptureDialog kind="newsletter" initialEmail="test@example.com" triggerLabel="Subscribe"/>);fireEvent.click(screen.getByText('Subscribe'));fill();fireEvent.submit(screen.getByLabelText('Email').closest('form')!);await screen.findByRole('alert');expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Test');fireEvent.submit(screen.getByLabelText('Email').closest('form')!);await screen.findByRole('status');expect(mocks.submit).toHaveBeenCalledTimes(2);});
 it('suppresses duplicate submissions while a request is pending',async()=>{mocks.submit.mockReturnValue(new Promise(()=>{}));render(<LeadCaptureDialog kind="newsletter" initialEmail="test@example.com" triggerLabel="Subscribe"/>);fireEvent.click(screen.getByText('Subscribe'));fill();const form=screen.getByLabelText('Email').closest('form')!;fireEvent.submit(form);fireEvent.submit(form);expect(mocks.submit).toHaveBeenCalledTimes(1);expect((screen.getByText('Sending…') as HTMLButtonElement).disabled).toBe(true);});
});
