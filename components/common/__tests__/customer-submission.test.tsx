// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentForm from '@/components/ContactAgents/ContactAgent';
import LenderForm from '@/components/ContactLender/ContactLender';
import { navigateCustomerSuccess } from '@/lib/leads/customer-navigation';
import type { CustomerSubmitResponse } from '@/lib/leads/submission-outcome';

vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({ trackFormStarted: vi.fn(), trackFormSubmitAttempted: vi.fn(), trackFormSubmissionFailed: vi.fn(), trackFormValidationFailed: vi.fn() }));
vi.mock('@/lib/leads/customer-navigation', () => ({ navigateCustomerSuccess: vi.fn() }));

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
function fill(contact: 'email' | 'phone' = 'email') {
  for (const [id, value] of Object.entries({ firstName: 'Synthetic', lastName: 'QA', currentBase: 'Denver', destinationBase: 'Boulder', [contact]: contact === 'email' ? 'qa@example.com' : '(719) 555-0100' })) {
    fireEvent.change(input(id), { target: { value } });
  }
}

describe.each([['agent', AgentForm], ['lender', LenderForm]] as const)('%s customer interactions', (_kind, Form) => {
  beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });
  afterEach(cleanup);

  it('focuses the summary, links to invalid fields, and never sends invalid data', async () => {
    const submit = vi.fn(); render(<Form onSubmit={submit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const summary = await screen.findByRole('region', { name: 'Please check the following fields' });
    expect(document.activeElement).toBe(summary);
    expect(input('firstName').getAttribute('aria-invalid')).toBe('true');
    expect(input('firstName').getAttribute('aria-describedby')).toContain('firstName-error');
    await userEvent.click(screen.getByRole('link', { name: /First name:/ }));
    expect(document.activeElement).toBe(input('firstName'));
    expect(submit).not.toHaveBeenCalled();
  });

  it.each(['email', 'phone'] as const)('accepts %s-only, resets, and navigates once', async (contact) => {
    const submit = vi.fn(async () => ({ success: true, outcome: 'accepted', redirectUrl: '/thank-you' } as const));
    render(<Form onSubmit={submit} derivedStateCode="CO" />); fill(contact);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(navigateCustomerSuccess).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(input('firstName').value).toBe('');
  });

  it('retains values, clears stale not-sent alerts on invalid attempts, and accepts server field errors', async () => {
    const submit = vi.fn<() => Promise<CustomerSubmitResponse>>()
      .mockResolvedValueOnce({ success: false, outcome: 'not_sent' })
      .mockResolvedValueOnce({ success: false, outcome: 'validation_error', fieldErrors: { email: 'Invalid email address' } });
    render(<Form onSubmit={submit} derivedStateCode="CO" />); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t send');
    expect(input('firstName').value).toBe('Synthetic');
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ state: 'CO' }));
    fireEvent.change(input('firstName'), { target: { value: '   ' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByRole('region', { name: 'Please check the following fields' });
    expect(screen.queryByRole('alert')).toBeNull(); expect(submit).toHaveBeenCalledTimes(1);
    fireEvent.change(input('firstName'), { target: { value: 'Synthetic' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(input('email').getAttribute('aria-invalid')).toBe('true'));
    expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'CO' }));
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Please check the following fields' }));
  });

  it('retains the attempt reference and blocks resending after edits and remount', async () => {
    const submit = vi.fn<(_data: { submission_attempt_id: string }) => Promise<CustomerSubmitResponse>>()
      .mockRejectedValue(new Error('connection lost'));
    const view = render(<Form onSubmit={submit} derivedStateCode="CO" />); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('may already have reached us');
    const attempt = submit.mock.calls[0]?.[0].submission_attempt_id;
    expect(attempt).toMatch(/^[0-9a-f-]{36}$/);
    if (!attempt) throw new Error('Expected the generated attempt ID');
    expect(alert.textContent).toContain(attempt);
    fireEvent.change(input('destinationBase'), { target: { value: 'Aurora' } });
    fireEvent.submit(view.container.querySelector('form')!);
    expect(submit).toHaveBeenCalledTimes(1);
    view.unmount();
    render(<Form onSubmit={submit} derivedStateCode="CO" />);
    expect(screen.getByRole('alert').textContent).toContain(attempt);
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
    expect(navigateCustomerSuccess).not.toHaveBeenCalled();
  });

  it('preserves the opaque attempt ID on recoverable retry across reloads and edits', async () => {
    const submit = vi.fn<(_data: { submission_attempt_id: string }) => Promise<CustomerSubmitResponse>>()
      .mockResolvedValueOnce({ success: false, outcome: 'retry_later', retryAt: Date.now() + 60_000 })
      .mockResolvedValueOnce({ success: true, outcome: 'accepted' });
    const view = render(<Form onSubmit={submit} derivedStateCode="CO" />); fill();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Try again after');
    const id = submit.mock.calls[0]?.[0].submission_attempt_id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const storage = Object.values(sessionStorage);
    expect(storage).toContain(`retry:${id}`);
    expect(storage.join()).not.toMatch(/Synthetic|qa@example\.com/);
    view.unmount();
    render(<Form onSubmit={submit} derivedStateCode="CO" />);
    expect(screen.getByRole('alert').textContent).toContain('couldn’t verify');
    fill();
    fireEvent.change(input('destinationBase'), { target: { value: 'Aurora' } });
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(navigateCustomerSuccess).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[1]?.[0].submission_attempt_id).toBe(id);
    expect(Object.values(sessionStorage)).not.toContain(`retry:${id}`);
  });

  it.each(['rejected', 'review_required'] as const)('closes a %s reference before sending a corrected attempt', async (outcome) => {
    const submit = vi.fn<(_data: { submission_attempt_id: string }) => Promise<CustomerSubmitResponse>>()
      .mockResolvedValueOnce({ success: false, outcome: 'retry_later' })
      .mockResolvedValueOnce({ success: false, outcome: 'validation_error', fieldErrors: { email: 'Check the email address' } })
      .mockResolvedValueOnce({ success: false, outcome })
      .mockResolvedValueOnce({ success: true, outcome: 'accepted' });
    render(<Form onSubmit={submit} derivedStateCode="CO" />); fill();
    const button = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(button);
    await screen.findByRole('alert');
    const id = submit.mock.calls[0]?.[0].submission_attempt_id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.values(sessionStorage)).toContain(`retry:${id}`);

    await userEvent.click(button);
    await waitFor(() => expect(input('email').getAttribute('aria-invalid')).toBe('true'));
    expect(submit.mock.calls[1]?.[0].submission_attempt_id).toBe(id);
    expect(Object.values(sessionStorage)).toContain(`retry:${id}`);
    fireEvent.change(input('email'), { target: { value: 'corrected@example.com' } });
    await userEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toContain(id);
    expect(submit.mock.calls[2]?.[0].submission_attempt_id).toBe(id);
    expect(Object.values(sessionStorage)).not.toContain(`retry:${id}`);

    fireEvent.change(input('destinationBase'), { target: { value: 'Aurora' } });
    await userEvent.click(button);
    await waitFor(() => expect(navigateCustomerSuccess).toHaveBeenCalledTimes(1));
    const correctedId = submit.mock.calls[3]?.[0].submission_attempt_id;
    expect(correctedId).toMatch(/^[0-9a-f-]{36}$/);
    expect(correctedId).not.toBe(id);
  });

  it('locks synchronously across repeated submissions before React rerenders', async () => {
    let resolve!: (value: CustomerSubmitResponse) => void;
    const submit = vi.fn(() => new Promise<CustomerSubmitResponse>((done) => { resolve = done; }));
    const view = render(<Form onSubmit={submit} derivedStateCode="CO" />); fill();
    const form = view.container.querySelector('form')!;
    fireEvent.submit(form); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect((screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve({ success: false, outcome: 'unconfirmed' }));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
