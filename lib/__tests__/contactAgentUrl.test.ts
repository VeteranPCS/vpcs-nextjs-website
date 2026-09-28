import { describe, expect, it } from 'vitest';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import { normalizeStateCode } from '@/lib/states';

describe('state contact destinations', () => {
  it.each(['agent', 'lender'] as const)('preserves state context for a generic %s request', (form) => {
    const url = new URL(buildContactCtaHref({ stateSlug: 'north-carolina', form }), 'https://www.veteranpcs.com');
    expect(url.pathname).toBe(`/contact-${form}`);
    expect(url.searchParams.get('form')).toBe(form);
    expect(normalizeStateCode(url.searchParams.get('state'))).toBe('NC');
    expect(url.searchParams.has('id')).toBe(false);
  });

  it('preserves a selected partner and handles DC', () => {
    const url = new URL(buildContactCtaHref({ stateSlug: 'washington-dc', form: 'lender', salesforceId: 'partner-fixture', firstName: 'Test' }), 'https://www.veteranpcs.com');
    expect(url.pathname).toBe('/contact-lender');
    expect(url.searchParams.get('id')).toBe('partner-fixture');
    expect(normalizeStateCode(url.searchParams.get('state'))).toBe('DC');
  });
});
