// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));
vi.mock('@/services/salesForcePostFormsService', () => ({ KeepInTouchForm: mocks.submit, vaLoanGuideForm: mocks.submit, homebuyerGuideForm: mocks.submit }));
import LeadCaptureDialog from '../LeadCaptureDialog';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submit.mockReset();
  window.history.replaceState({}, '', '/pcs-resources?q=private-query');
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function openAndFill(kind: 'va-guide' | 'homebuyer-guide' | 'newsletter' = 'va-guide') {
  render(<LeadCaptureDialog kind={kind} initialEmail="private-person@example.com" triggerLabel="Get guide" placement={{ location: 'featured_resources', position: 'card', pageType: 'pcs_resources' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Get guide' }));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'PrivateGivenName' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'PrivateFamilyName' } });
  return screen.getByLabelText('Email').closest('form')!;
}
const downloadEvents = () => mocks.capture.mock.calls.filter(([event]) => event.startsWith('guide_download_'));

describe('guide capture PostHog events', () => {
  it.each([
    ['va-guide', 'va_loan_guide', '/downloads/VA-Loan-Guide.pdf'],
    ['homebuyer-guide', 'first_time_homebuyer_guide', '/downloads/first-time-home-buyer-guide.pdf'],
  ] as const)('tracks %s requests, successful starts and manual downloads with placement and safe properties', async (kind, guideId, destination) => {
    let finish!: (result: { success: boolean }) => void;
    mocks.submit.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const form = openAndFill(kind);
    expect(mocks.capture).toHaveBeenCalledWith('cta_clicked', expect.objectContaining({ cta_intent: 'download_guide', guide_id: guideId, cta_location: 'featured_resources' }));
    // Opening or invalid input alone must not report a download.
    expect(downloadEvents()).toHaveLength(0);
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested']);
    finish({ success: true });
    await screen.findByRole('status');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_started']);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: 'Download guide' }));
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_started', 'guide_download_requested', 'guide_download_started']);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    for (const [, properties] of downloadEvents()) {
      expect(properties).toMatchObject({ guide_id: guideId, form_id: guideId, source_page_path: '/pcs-resources', destination_path: destination, cta_component: 'lead_capture_dialog', cta_location: 'featured_resources', cta_position: 'card', page_type: 'pcs_resources' });
    }
    expect(downloadEvents().map(([, properties]) => properties.download_trigger)).toEqual(['form_submission', 'form_submission', 'manual_link', 'manual_link']);
    const serialized = JSON.stringify(mocks.capture.mock.calls);
    for (const privateValue of ['private-person', 'PrivateGivenName', 'PrivateFamilyName', 'private-query']) expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toContain('lead_conversion_created');
  });
  it('does not report a started download after a failed request; explicit retry is tracked', async () => {
    mocks.submit.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
    const form = openAndFill();
    fireEvent.submit(form);
    await screen.findByRole('alert');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested']);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    fireEvent.submit(form);
    await screen.findByRole('status');
    expect(downloadEvents().map(([event]) => event)).toEqual(['guide_download_requested', 'guide_download_requested', 'guide_download_started']);
  });
  it('does not call downloads or emit guide events for a newsletter', async () => {
    mocks.submit.mockResolvedValue({ success: true });
    fireEvent.submit(openAndFill('newsletter'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('received'));
    expect(downloadEvents()).toHaveLength(0);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});
