// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const action=vi.hoisted(()=>vi.fn());
vi.mock('@/services/salesForcePostFormsService',()=>({contactPostForm:action}));
vi.mock('@/lib/analytics/client',()=>({formTrackingPayload:()=>({vpcs_attribution:'retained'}),trackFormStarted:vi.fn(),trackFormSubmitAttempted:vi.fn(),trackFormValidationFailed:vi.fn(),trackFormSubmissionFailed:vi.fn()}));
vi.mock('@next/third-parties/google',()=>({sendGTMEvent:vi.fn()}));
import QuestionForm from '../QuestionForm';
function fill() {
 fireEvent.change(screen.getByLabelText('First name'),{target:{value:' Alex '}});
 fireEvent.change(screen.getByLabelText('Last name'),{target:{value:' Smith '}});
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'alex@example.com'}});
 fireEvent.change(screen.getByLabelText('What’s your question?'),{target:{value:' Can I reuse my VA benefit? '}});
}
describe('VA loan question form',()=>{
 beforeEach(()=>{cleanup();sessionStorage.clear();action.mockReset();});
 it('validates required fields and invalid email before sending',()=>{
  render(<QuestionForm/>);fireEvent.submit(screen.getByRole('form'));
  expect(action).not.toHaveBeenCalled();expect(screen.getByText('Enter your first name.')).toBeTruthy();
  fill();fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'invalid'}});fireEvent.submit(screen.getByRole('form'));
  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();expect(action).not.toHaveBeenCalled();
 });
 it('maps the trimmed question and preserves spam timing and attribution',async()=>{
  action.mockResolvedValue({success:true,outcome:'accepted'});render(<QuestionForm/>);fill();fireEvent.submit(screen.getByRole('form'));
  await screen.findByRole('status');
  expect(action).toHaveBeenCalledWith(expect.objectContaining({firstName:'Alex',lastName:'Smith',email:'alex@example.com',additionalComments:'Can I reuse my VA benefit?',company_website:'',form_rendered_at:expect.any(Number),vpcs_attribution:'retained'}));
 });
 it('blocks duplicate submits while pending and keeps details for explicit retry',async()=>{
  let resolve!:(value:unknown)=>void;action.mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValueOnce({success:true,outcome:'accepted'});
  render(<QuestionForm/>);fill();const form=screen.getByRole('form');fireEvent.submit(form);fireEvent.submit(form);
  expect(action).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Sending…'}).hasAttribute('disabled')).toBe(true);
  await act(async()=>{resolve({success:false,outcome:'not_sent'});});
  expect(screen.queryByRole('status')).toBeNull();expect(screen.getByRole('alert')).toBeTruthy();expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe(' Alex ');
  fireEvent.submit(form);await screen.findByRole('status');expect(action).toHaveBeenCalledTimes(2);
  expect(action.mock.calls[0]?.[0].submission_attempt_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(action.mock.calls[0]?.[0].submission_attempt_id).toBe(action.mock.calls[1]?.[0].submission_attempt_id);
 });
 it('recovers from an exception without treating it as success',async()=>{
  action.mockRejectedValue(new Error('Network'));render(<QuestionForm/>);fill();fireEvent.submit(screen.getByRole('form'));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('may already have reached us'));
  expect(screen.queryByRole('status')).toBeNull();expect(screen.getByRole('button',{name:/Ask a VA Loan Expert/}).hasAttribute('disabled')).toBe(true);
 });
});
