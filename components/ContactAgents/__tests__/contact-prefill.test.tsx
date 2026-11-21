// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactAgent from '../ContactAgent';
import { CONTACT_PREFILL_STORAGE_KEY, storeContactPrefill } from '@/lib/leads/contact-prefill';
import { captureAnalyticsEvent, trackFormStarted } from '@/lib/analytics/client';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-image={String(props.src)} /> }));
vi.mock('@/components/Concierge', () => ({ useConcierge: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({
  captureAnalyticsEvent: vi.fn(), trackFormStarted: vi.fn(), trackFormSubmitAttempted: vi.fn(),
  trackFormSubmissionFailed: vi.fn(), trackFormValidationFailed: vi.fn(),
}));
vi.mock('@/lib/leads/customer-navigation', () => ({ navigateCustomerSuccess: vi.fn() }));

const agentId = '001Rg00000pmUUk';
const query = `?form=agent&fn=Tyler&id=${agentId}&state=colorado`;
const details = { firstName: 'PrefillGiven', lastName: 'PrefillFamily', email: 'prefill-private@example.test' };
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); window.history.replaceState({}, '', `/contact-agent${query}`); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });

describe.each(['control', 'test'] as const)('contact prefill in the %s variant', variant => {
  it('consumes once on mount without submission or analytics and preserves subsequent edits', () => {
    const submit = vi.fn();
    storeContactPrefill(agentId, details);
    const experiment = { variant, viewId: 'prefill-test-view' };
    const view = render(<StrictMode><ContactAgent onSubmit={submit} urlSearch={query} derivedStateCode="CO" experiment={experiment} /></StrictMode>);
    expect(input('First name*').value).toBe(details.firstName);
    expect(input('Last name*').value).toBe(details.lastName);
    expect(input('Email').value).toBe(details.email);
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
    expect(trackFormStarted).not.toHaveBeenCalled();

    fireEvent.change(input('First name*'), { target: { value: '' } });
    fireEvent.change(input('Email'), { target: { value: 'edited@example.test' } });
    view.rerender(<StrictMode><ContactAgent onSubmit={submit} urlSearch={`${query}&other=changed`} derivedStateCode="CO" experiment={{ ...experiment, viewId: 'rerender-view' }} /></StrictMode>);
    expect(input('First name*').value).toBe('');
    expect(input('Email').value).toBe('edited@example.test');
    expect(submit).not.toHaveBeenCalled();

    view.unmount();
    render(<ContactAgent onSubmit={submit} urlSearch={query} derivedStateCode="CO" experiment={experiment} />);
    expect(input('First name*').value).toBe('');
    expect(input('Email').value).toBe('');
    expect(submit).not.toHaveBeenCalled();
  });

  it('leaves a different agent form empty and consumes the mismatched handoff', () => {
    storeContactPrefill(agentId, details);
    render(<ContactAgent onSubmit={vi.fn()} urlSearch="?id=001Rg00000otherX" experiment={{ variant, viewId: 'wrong-target' }} />);
    expect(input('First name*').value).toBe('');
    expect(input('Last name*').value).toBe('');
    expect(input('Email').value).toBe('');
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
  });

  it('still renders editable empty fields when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked'); });
    const submit = vi.fn();
    render(<ContactAgent onSubmit={submit} urlSearch={query} experiment={{ variant, viewId: 'blocked-storage' }} />);
    fireEvent.change(input('First name*'), { target: { value: 'Manual' } });
    expect(input('First name*').value).toBe('Manual');
    expect(input('Email').value).toBe('');
    expect(submit).not.toHaveBeenCalled();
  });
});
