import { describe, expect, it } from 'vitest';
import { buildContactCtaHref, isSameContactAgentPage } from '@/lib/contactAgentUrl';
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

describe('links back to the agent contact page', () => {
  it.each([
    '/contact-agent',
    '/contact-agent?form=agent',
    '/contact-agent/',
    buildContactCtaHref({ form: 'agent' }),
    new URL('https://www.veteranpcs.com/contact-agent?form=agent'),
  ])('treats %s as the same page while on /contact-agent', (target) => {
    expect(isSameContactAgentPage(target, '/contact-agent')).toBe(true);
    expect(isSameContactAgentPage(target, '/contact-agent/')).toBe(true);
  });

  it.each(['/', '/texas', '/contact', '/contact-lender', '/contact-agent-info'])('navigates normally from %s', (current) => {
    expect(isSameContactAgentPage('/contact-agent?form=agent', current)).toBe(false);
  });

  it.each([
    '/contact-lender?form=lender',
    '/contact',
    '/texas',
    'https://example.com/contact-agent',
    'mailto:info@veteranpcs.com',
    undefined,
    null,
    { pathname: '/contact-agent' },
  ])('leaves %s alone while on /contact-agent', (target) => {
    expect(isSameContactAgentPage(target, '/contact-agent')).toBe(false);
  });
});
