// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadCaptcha, LeadCaptchaProvider } from '../LeadCaptcha';
import { useLeadSubmission } from '../useLeadSubmission';

type Options = { callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void; size: string };
const google = { render: vi.fn((_mount: HTMLElement, _options: Options) => 7), reset: vi.fn() };
const browser = window as Window & { grecaptcha?: typeof google; vpcsLeadCaptchaLoaded?: () => void };
const attempt = 'd54f08e6-c79a-4cb4-8779-758644307ac1';
const required = { mode: 'required', siteKey: 'public-fixture' } as const;
const action = vi.fn();

function Fixture({ formId = 'captcha-fixture' }: { formId?: string }) {
  const submission = useLeadSubmission(formId);
  return <section aria-label={formId}>
    <LeadCaptcha control={submission.captcha} />
    <button type="button" onClick={() => void submission.submit({ email: 'fixture@example.invalid' }, action)}>Submit fixture</button>
    {submission.failure && <output>{submission.failure.outcome}</output>}
  </section>;
}

function activate(index: number, token = 'synthetic-token') {
  act(() => google.render.mock.calls[index]![1].callback(token));
}

describe('shared CAPTCHA lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(attempt);
    google.render.mockClear();
    google.reset.mockClear();
    action.mockReset();
    browser.grecaptcha = google;
  });

  afterEach(() => {
    cleanup();
    delete browser.grecaptcha;
    vi.useRealTimers();
  });

  it('defaults to unavailable without issuing a UUID, storing state, or calling an action', () => {
    render(<Fixture />);
    fireEvent.click(screen.getByText('Submit fixture'));
    expect(screen.getByRole('status').textContent).toMatch(/unavailable/);
    expect(crypto.randomUUID).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
    expect(action).not.toHaveBeenCalled();
  });

  it('preserves the retry reference when server readback still needs a fresh challenge', async () => {
    action.mockResolvedValueOnce({ outcome: 'retry_later', success: false })
      .mockResolvedValueOnce({ outcome: 'validation_error', success: false, fieldErrors: { captchaToken: 'Challenge required' } })
      .mockResolvedValueOnce({ outcome: 'accepted', success: true });
    render(<LeadCaptchaProvider config={required}><Fixture /></LeadCaptchaProvider>);
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(1));
    const submit = screen.getByText('Submit fixture');
    fireEvent.click(submit);
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Security verification' }));
    expect(action).not.toHaveBeenCalled();
    expect(crypto.randomUUID).not.toHaveBeenCalled();
    activate(0);
    fireEvent.click(submit);
    await screen.findByText('retry_later');
    expect(sessionStorage.getItem('vpcs:lead-pending:v1:captcha-fixture')).toBe('retry:' + attempt);
    expect(action).toHaveBeenCalledWith({ email: 'fixture@example.invalid', submission_attempt_id: attempt, captchaToken: 'synthetic-token' });
    fireEvent.click(submit);
    await screen.findByText('validation_error');
    expect(action).toHaveBeenLastCalledWith({ email: 'fixture@example.invalid', submission_attempt_id: attempt });
    expect(sessionStorage.getItem('vpcs:lead-pending:v1:captcha-fixture')).toBe('retry:' + attempt);
    expect(google.reset).toHaveBeenCalledTimes(1);
    activate(0, 'fresh-token');
    fireEvent.click(submit);
    await waitFor(() => expect(sessionStorage.length).toBe(0));
    expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ submission_attempt_id: attempt, captchaToken: 'fresh-token' }));
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it('recovers a saved reference without a widget when the server confirms the Lead', async () => {
    sessionStorage.setItem('vpcs:lead-pending:v1:captcha-fixture', 'retry:' + attempt);
    action.mockResolvedValueOnce({ outcome: 'accepted', success: true, submissionId: attempt });
    render(<LeadCaptchaProvider config={{ mode: 'unavailable' }}><Fixture /></LeadCaptchaProvider>);
    fireEvent.click(screen.getByText('Submit fixture'));
    await waitFor(() => expect(sessionStorage.length).toBe(0));
    expect(action).toHaveBeenCalledExactlyOnceWith({ email: 'fixture@example.invalid', submission_attempt_id: attempt });
    expect(crypto.randomUUID).not.toHaveBeenCalled();
    expect(google.reset).not.toHaveBeenCalled();
  });

  it('never unlocks uncertainty with a fresh widget callback or a remount', async () => {
    action.mockRejectedValue(new Error('response unavailable'));
    const wrap = <LeadCaptchaProvider config={required}><Fixture /></LeadCaptchaProvider>;
    const view = render(wrap);
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(1));
    activate(0);
    fireEvent.click(screen.getByText('Submit fixture'));
    await screen.findByText('unconfirmed');
    view.unmount();
    render(wrap);
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(2));
    activate(0, 'stale-callback');
    activate(1, 'fresh-token');
    fireEvent.click(screen.getByText('Submit fixture'));
    expect(action).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('vpcs:lead-pending:v1:captcha-fixture')).toBe(attempt);
  });

  it('loads one exact script, renders independently, and ignores unmounted callbacks', async () => {
    delete browser.grecaptcha;
    const view = render(<LeadCaptchaProvider config={required}><Fixture formId="first" /><Fixture formId="second" /></LeadCaptchaProvider>);
    const expectedScript = 'https://www.google.com/recaptcha/api.js?onload=vpcsLeadCaptchaLoaded&render=explicit';
    const scripts = Array.from(document.scripts).filter(script => script.src === expectedScript);
    expect(scripts).toHaveLength(1);
    browser.grecaptcha = google;
    act(() => browser.vpcsLeadCaptchaLoaded?.());
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(2));
    activate(0);
    fireEvent.click(within(screen.getByRole('region', { name: 'second' })).getByText('Submit fixture'));
    expect(action).not.toHaveBeenCalled();
    view.unmount();
    expect(() => activate(0, 'late-token')).not.toThrow();
    scripts[0]?.remove();
  });

  it('rejects widget expiration and allows an explicit widget reload after error', async () => {
    render(<LeadCaptchaProvider config={required}><Fixture /></LeadCaptchaProvider>);
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(1));
    activate(0);
    act(() => google.render.mock.calls[0]![1]['expired-callback']());
    fireEvent.click(screen.getByText('Submit fixture'));
    expect(action).not.toHaveBeenCalled();
    act(() => google.render.mock.calls[0]![1]['error-callback']());
    fireEvent.click(screen.getByText('Reload security check'));
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(2));
    expect(google.render.mock.calls[1]![1].size).toBe('compact');
  });

  it('resets at ninety seconds to reserve time for server admission, without creating an attempt', async () => {
    render(<LeadCaptchaProvider config={required}><Fixture /></LeadCaptchaProvider>);
    await waitFor(() => expect(google.render).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();
    activate(0);
    act(() => vi.advanceTimersByTime(90_000));
    expect(google.reset).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByText('Submit fixture'));
    expect(action).not.toHaveBeenCalled();
    expect(crypto.randomUUID).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
