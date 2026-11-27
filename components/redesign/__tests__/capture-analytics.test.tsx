// @vitest-environment jsdom
import React from 'react';
import { renderWithCaptchaOff as render } from '@/components/common/__tests__/render-with-captcha-off';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeadSubmitResult } from '@/lib/leads/submission-outcome';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), capture: vi.fn(), gtm: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: mocks.gtm }));
vi.mock('@/services/salesForcePostFormsService', () => ({ KeepInTouchForm: mocks.submit, vaLoanGuideForm: mocks.submit, homebuyerGuideForm: mocks.submit, coloradoRelocationGuideForm: mocks.submit }));
import LeadCaptureDialog from '../LeadCaptureDialog';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submit.mockReset();
  mocks.capture.mockReset();
  mocks.gtm.mockReset();
  window.history.replaceState({}, '', '/pcs-resources?q=private-query');
  window.sessionStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function openAndFill(kind: 'va-guide' | 'homebuyer-guide' | 'newsletter' | 'colorado-relocation-guide' = 'va-guide', allowAuthorContact = false) {
  const colorado = kind === 'colorado-relocation-guide';
  if (colorado) window.history.replaceState({}, '', '/colorado?private-query=do-not-record');
  render(<LeadCaptureDialog kind={kind} allowAuthorContact={allowAuthorContact} initialEmail="private-person@example.com" triggerLabel="Get guide" placement={colorado
    ? { location: 'state_guide_section', position: 'inline', pageType: 'state_page' }
    : { location: 'featured_resources', position: 'card', pageType: 'pcs_resources' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Get guide' }));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'PrivateGivenName' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'PrivateFamilyName' } });
  const form = screen.getByLabelText('Email').closest('form');
  if (!form) throw new Error('Expected guide form');
  return form;
}
const downloadEvents = () => mocks.capture.mock.calls.filter(([event]) => event.startsWith('guide_download_'));

describe('guide capture analytics', () => {
  it.each([
    ['va-guide', 'va_loan_guide', '/downloads/VA-Loan-Guide.pdf', 'VA Loan Guide'],
    ['homebuyer-guide', 'first_time_homebuyer_guide', '/downloads/first-time-home-buyer-guide.pdf', 'First Time Home Buyer Guide'],
    ['colorado-relocation-guide', 'colorado_relocation_guide', '/downloads/colorado-relocation-guide-tyler-parker-v7.pdf', 'Colorado Relocation Guide'],
  ] as const)('tracks %s requests, successful starts and manual downloads without personal input', async (kind, guideId, destination, gaContent) => {
    let finish: ((result: LeadSubmitResult) => void) | undefined;
    mocks.submit.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const form = openAndFill(kind);
    const colorado = kind === 'colorado-relocation-guide';
    expect(mocks.capture).toHaveBeenCalledWith('cta_clicked', expect.objectContaining({ cta_intent: 'download_guide', guide_id: guideId }));
    expect(downloadEvents()).toHaveLength(0);
    expect(mocks.gtm).not.toHaveBeenCalled();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested']);
    expect(mocks.gtm).not.toHaveBeenCalled();
    if (!finish) throw new Error('Expected pending submission');
    finish({ success: true, outcome: 'accepted' });
    await screen.findByRole('status');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_started']);
    expect(mocks.gtm).toHaveBeenCalledExactlyOnceWith({ event: 'conversion_download', content: gaContent });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: colorado ? 'Download again' : 'Download guide' }));
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_started', 'guide_download_requested', 'guide_download_started']);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(mocks.gtm).toHaveBeenCalledTimes(1);
    for (const [, properties] of downloadEvents()) {
      expect(properties).toMatchObject({
        guide_id: guideId,
        form_id: guideId,
        source_page_path: colorado ? '/colorado' : '/pcs-resources',
        destination_path: destination,
        cta_component: 'lead_capture_dialog',
        cta_location: colorado ? 'state_guide_section' : 'featured_resources',
        cta_position: colorado ? 'inline' : 'card',
        page_type: colorado ? 'state_page' : 'pcs_resources',
        ...(colorado ? { state_code: 'CO', state_slug: 'colorado' } : {}),
      });
    }
    expect(downloadEvents().map(([, properties]) => properties.download_trigger)).toEqual(['form_submission', 'form_submission', 'manual_link', 'manual_link']);
    const serialized = JSON.stringify([...mocks.capture.mock.calls, ...mocks.gtm.mock.calls]);
    for (const privateValue of ['private-person', 'PrivateGivenName', 'PrivateFamilyName', 'private-query', 'do-not-record']) expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toContain('lead_conversion_created');
  });

  it('does not report conversion after a failed request; explicit retry is tracked', async () => {
    mocks.submit.mockResolvedValueOnce({ success: false, outcome: 'not_sent' }).mockResolvedValueOnce({ success: true, outcome: 'accepted' });
    const form = openAndFill('colorado-relocation-guide');
    fireEvent.submit(form);
    await screen.findByRole('alert');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested']);
    expect(mocks.gtm).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    fireEvent.submit(form);
    await screen.findByRole('status');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_requested', 'guide_download_started']);
    expect(mocks.gtm).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['rejected', 'couldn’t accept'],
    ['review_required', 'need to verify'],
    ['retry_later', 'couldn’t verify'],
    ['unconfirmed', 'may already have reached us'],
  ] as const)('shows %s without starting a download or conversion', async (outcome, message) => {
    mocks.submit.mockResolvedValue({ success: false, outcome, submissionId: 'test-reference' });
    const form = openAndFill('colorado-relocation-guide');
    fireEvent.submit(form);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(message);
    expect(screen.queryByRole('status')).toBeNull();
    expect(mocks.gtm).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    if (outcome === 'unconfirmed') {
      expect(alert.textContent).toContain('test-reference');
      expect((screen.getByRole('button', { name: 'Get my guide' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.submit(form);
      expect(mocks.submit).toHaveBeenCalledTimes(1);
    }
  });

  it('preserves success and downloading when both analytics providers throw', async () => {
    mocks.submit.mockResolvedValue({ success: true, outcome: 'accepted' });
    mocks.capture.mockImplementation(() => { throw new Error('PostHog blocked'); });
    mocks.gtm.mockImplementation(() => { throw new Error('GTM blocked'); });
    fireEvent.submit(openAndFill('colorado-relocation-guide'));
    await screen.findByRole('status');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('keeps the manual link after the browser blocks the automatic download', async () => {
    mocks.submit.mockResolvedValue({ success: true, outcome: 'accepted' });
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(() => { throw new Error('Download blocked'); });
    fireEvent.submit(openAndFill('colorado-relocation-guide'));
    await screen.findByRole('status');
    expect(screen.getByRole('link', { name: 'Download again' }).getAttribute('href')).toBe('/downloads/colorado-relocation-guide-tyler-parker-v7.pdf');
    expect(screen.getByRole('status').textContent).toContain('Your guide is ready.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('uses real name limits and focuses the missing name without submitting or tracking a download', () => {
    const form = openAndFill('colorado-relocation-guide');
    expect(screen.getByLabelText('First name').getAttribute('maxlength')).toBe('40');
    expect(screen.getByLabelText('Last name').getAttribute('maxlength')).toBe('80');
    expect(screen.getByLabelText('Email').getAttribute('maxlength')).toBe('80');
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: '   ' } });
    fireEvent.submit(form);
    expect(document.activeElement).toBe(screen.getByLabelText('First name'));
    expect(screen.getByRole('alert').textContent).toContain('first name');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(downloadEvents()).toHaveLength(0);
    expect(mocks.gtm).not.toHaveBeenCalled();
  });

  it('treats Contact Tyler as a separate selected-agent action after download', async () => {
    mocks.submit.mockResolvedValue({ success: true, outcome: 'accepted' });
    fireEvent.submit(openAndFill('colorado-relocation-guide', true));
    await screen.findByRole('status');
    expect(sessionStorage.getItem('vpcs_selected_agent')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Your download has started.');
    expect(screen.getByRole('img', { name: 'Tyler Parker' }).getAttribute('src')).toContain('001Rg00000pmUUk.webp');
    expect(screen.getByRole('region', { name: 'Meet Tyler Parker' }).textContent).toContain('Air Force Veteran');
    expect(screen.getByRole('link', { name: 'Download again' }).classList.contains('steph-button')).toBe(false);
    const contact = screen.getByRole('link', { name: 'Contact Tyler' });
    expect(contact.classList.contains('steph-button')).toBe(true);
    expect(document.activeElement).toBe(contact);
    expect(window.location.pathname).toBe('/colorado');
    expect(contact.getAttribute('href')).toBe('/contact-agent?form=agent&fn=Tyler&id=001Rg00000pmUUk&state=colorado');
    // Prevent jsdom navigation after exercising the link's normal click handler.
    contact.addEventListener('click', event => event.preventDefault());
    fireEvent.click(contact);
    expect(JSON.parse(sessionStorage.getItem('vpcs_selected_agent') ?? '{}')).toMatchObject({ id: '001Rg00000pmUUk', name: 'Tyler Parker', brokerage: 'Solid Oak Realty, Inc.' });
    expect(mocks.capture).toHaveBeenCalledWith('cta_clicked', expect.objectContaining({ cta_intent: 'contact_agent', cta_location: 'guide_download_success', partner_salesforce_id: '001Rg00000pmUUk' }));
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(mocks.gtm).toHaveBeenCalledTimes(1);
  });

  it('offers a generic Colorado contact after a nonproduction download', async () => {
    mocks.submit.mockResolvedValue({ success: true, outcome: 'accepted' });
    fireEvent.submit(openAndFill('colorado-relocation-guide'));
    await screen.findByRole('status');
    const contact = screen.getByRole('link', { name: 'Find a Colorado Agent' });
    expect(contact.getAttribute('href')).toBe('/contact-agent?form=agent&state=colorado');
    expect(document.activeElement).toBe(contact);
    expect(screen.queryByRole('link', { name: 'Contact Tyler' })).toBeNull();
  });

  it('does not call downloads or emit guide events for a newsletter', async () => {
    mocks.submit.mockResolvedValue({ success: true, outcome: 'accepted' });
    fireEvent.submit(openAndFill('newsletter'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('received'));
    expect(downloadEvents()).toHaveLength(0);
    expect(mocks.gtm).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});
