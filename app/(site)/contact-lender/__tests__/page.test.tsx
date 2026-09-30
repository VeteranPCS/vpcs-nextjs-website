// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from '../page';
import { submitContactLenderLead } from '../actions';
import { sendGTMEvent } from '@next/third-parties/google';
const seen = vi.hoisted(() => ({ response: undefined as unknown }));
vi.mock('../actions', () => ({ submitContactLenderLead: vi.fn() }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
vi.mock('@/lib/analytics/client', () => ({ formTrackingPayload: () => ({ vpcs_visitor_id: 'vpcs_test' }) }));
vi.mock('@/components/ContactLender/ContactLender', () => ({
  default: ({ onSubmit }: { onSubmit: (data: object) => Promise<unknown> }) =>
    <button onClick={async () => { seen.response = await onSubmit({ firstName: 'QA' }); }}>Test callback</button>,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); seen.response = undefined; });
describe('lender page callback', () => {
  it.each(['not_sent', 'unconfirmed'] as const)('preserves %s through the page even when GTM throws', async (outcome) => {
    const response = { success: false, outcome, submissionId: 'ref' } as const;
    vi.mocked(submitContactLenderLead).mockResolvedValue(response);
    vi.mocked(sendGTMEvent).mockImplementationOnce(() => { throw new Error('blocked analytics'); });
    render(<Page />); fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(seen.response).toEqual(response));
    expect(submitContactLenderLead).toHaveBeenCalledTimes(1);
  });
  it('returns accepted results without a second page-owned navigation', async () => {
    const response = { success: true, outcome: 'accepted', redirectUrl: '/thank-you' } as const;
    vi.mocked(submitContactLenderLead).mockResolvedValue(response);
    render(<Page />); fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(seen.response).toEqual(response));
    expect(window.location.pathname).toBe('/');
  });
});
