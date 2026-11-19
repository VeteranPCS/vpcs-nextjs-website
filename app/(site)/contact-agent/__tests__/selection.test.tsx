// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '../page';
import { submitContactAgentLead } from '../actions';

const address = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(address.query) }));
vi.mock('posthog-js', () => ({ default: { __loaded: false } }));
vi.mock('../actions', () => ({ submitContactAgentLead: vi.fn() }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/leads/customer-navigation', () => ({ navigateCustomerSuccess: vi.fn() }));
vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(), formTrackingPayload: () => ({}), trackFormStarted: vi.fn(),
  trackFormSubmitAttempted: vi.fn(), trackFormSubmissionFailed: vi.fn(), trackFormValidationFailed: vi.fn(),
}));

const input = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
/** A same-page change of address, as next/link, Back and Forward produce. */
function go(view: ReturnType<typeof render>, query: string) {
  address.query = query;
  window.history.replaceState(null, '', query ? `/contact-agent?${query}` : '/contact-agent');
  act(() => { view.rerender(<Page />); });
}
function open(query: string) {
  address.query = query;
  window.history.replaceState(null, '', query ? `/contact-agent?${query}` : '/contact-agent');
  return render(<Page />);
}

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false }))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

describe('agent contact page follows the address', () => {
  it('shows and submits agent B after a same-page change from agent A', async () => {
    vi.mocked(submitContactAgentLead).mockResolvedValue({ success: true, outcome: 'accepted', redirectUrl: '/thank-you' });
    const view = open('form=agent&fn=Alpha&id=partner-a&state=texas');
    expect(heading()).toBe('Contact Alpha');
    expect(input('state')).toBeNull();
    fireEvent.change(input('firstName')!, { target: { value: 'Synthetic' } });
    fireEvent.change(input('email')!, { target: { value: 'qa@example.com' } });

    go(view, 'form=agent&fn=Bravo&id=partner-b&state=florida');
    expect(heading()).toBe('Contact Bravo');
    expect(input('state')).toBeNull();
    // What the visitor typed is kept.
    expect(input('firstName')!.value).toBe('Synthetic');
    expect(input('email')!.value).toBe('qa@example.com');

    for (const [id, value] of Object.entries({ lastName: 'QA', currentBase: 'Denver', destinationBase: 'Tampa' })) {
      fireEvent.change(input(id)!, { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(submitContactAgentLead).toHaveBeenCalledTimes(1));
    const [formData, query] = vi.mocked(submitContactAgentLead).mock.calls[0]!;
    expect(query).toBe('?form=agent&fn=Bravo&id=partner-b&state=florida');
    expect(formData).toMatchObject({ firstName: 'Synthetic', state: 'FL' });
  });

  it('returns to agent A when the address does (Back)', () => {
    const view = open('form=agent&fn=Alpha&id=partner-a&state=texas');
    go(view, 'form=agent&fn=Bravo&id=partner-b&state=florida');
    go(view, 'form=agent&fn=Alpha&id=partner-a&state=texas');
    expect(heading()).toBe('Contact Alpha');
  });

  it('asks for the state again when the new address names none', () => {
    const view = open('form=agent&fn=Alpha&id=partner-a&state=texas');
    expect(input('state')).toBeNull();
    go(view, 'form=agent&fn=Bravo&id=partner-b');
    expect(heading()).toBe('Contact Bravo');
    // The picker is back and empty: Texas belonged to the previous selection.
    expect(input('state')!.value).toBe('');
  });

  it('keeps a state the visitor picked themselves', () => {
    const view = open('form=agent');
    expect(heading()).toBe('Contact Us');
    fireEvent.change(input('state')!, { target: { value: 'CO' } });
    go(view, 'form=agent&fn=Bravo&id=partner-b');
    expect(input('state')!.value).toBe('CO');
  });
});
