// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactForm from '@/components/contactpage/ContactForm/ContactForm';
import KeepInTouch from '@/components/homepage/KeepInTouch/KeepInTouch';

const { submit, navigate } = vi.hoisted(() => ({ submit: vi.fn(), navigate: vi.fn() }));
vi.mock('@/services/salesForcePostFormsService', () => ({ contactPostForm: submit, KeepInTouchForm: submit }));
vi.mock('@/lib/leads/customer-navigation', () => ({ navigateCustomerSuccess: navigate }));
vi.mock('next/navigation', () => ({ usePathname: () => '/test' }));
vi.mock('@next/third-parties/google', () => ({ sendGTMEvent: vi.fn() }));
vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(),
  formTrackingPayload: () => ({}),
  trackFormStarted: vi.fn(),
  trackFormSubmitAttempted: vi.fn(),
  trackFormSubmissionFailed: vi.fn(),
  trackFormValidationFailed: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://www.veteranpcs.com');
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe.each([
  ['contact', ContactForm],
  ['newsletter', KeepInTouch],
] as const)('%s form redirect', (_name, Form) => {
  it('navigates to a relative thank-you page instead of following the provider URL', async () => {
    submit.mockResolvedValue({ success: true, outcome: 'accepted', redirectUrl: 'https://www.veteranpcs.com/thank-you?from=provider' });
    const { container } = render(<Form />);
    const form = container.querySelector('form');
    if (!form) throw new Error('Expected form');
    for (const [name, value] of [['firstName', 'Alex'], ['lastName', 'Example'], ['email', 'alex@example.test']]) {
      const field = form.querySelector(`input[name="${name}"]`);
      if (!field) throw new Error(`Expected ${name} input`);
      fireEvent.change(field, { target: { value } });
    }

    fireEvent.submit(form);

    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/thank-you'));
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
