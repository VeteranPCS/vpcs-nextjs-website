import { describe, expect, it } from 'vitest';
import { buildContactCtaHref, isGenericSameContactAgentLink } from '@/lib/contactAgentUrl';
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

describe('generic links back to the agent contact page', () => {
  it.each([
    '/contact-agent',
    '/contact-agent?form=agent',
    '/contact-agent/',
    buildContactCtaHref({ form: 'agent' }),
    new URL('https://www.veteranpcs.com/contact-agent?form=agent'),
  ])('holds %s on the page, so the current agent and state survive', (target) => {
    expect(isGenericSameContactAgentLink(target, '/contact-agent')).toBe(true);
    expect(isGenericSameContactAgentLink(target, '/contact-agent/')).toBe(true);
  });

  it.each([
    ['another agent', buildContactCtaHref({ form: 'agent', firstName: 'Bravo', salesforceId: 'partner-b', stateSlug: 'florida' })],
    ['an agent id alone', '/contact-agent?form=agent&id=partner-b'],
    ['a first name alone', '/contact-agent?fn=Bravo'],
    ['a state request', buildContactCtaHref({ form: 'agent', stateSlug: 'florida' })],
  ])('lets a link that names %s navigate', (_name, target) => {
    expect(isGenericSameContactAgentLink(target, '/contact-agent')).toBe(false);
  });

  it.each(['/', '/texas', '/contact', '/contact-lender', '/contact-agent-info'])('navigates normally from %s', (current) => {
    expect(isGenericSameContactAgentLink('/contact-agent?form=agent', current)).toBe(false);
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
    expect(isGenericSameContactAgentLink(target, '/contact-agent')).toBe(false);
  });
});
