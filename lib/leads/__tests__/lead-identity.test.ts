import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalEmail, emailIdentityHash, leadPayloadHash, normalizedPhone } from '@/lib/leads/identity';

type IdentityVector = { label: string; input: string | null; canonical: string | null };

// Apex runs the same fixture to avoid subtly different matching policies.
const vectors = JSON.parse(readFileSync(new URL(
  '../../../salesforce/spam-intake/metadata/staticresources/VpcsSpamIdentityVectors.resource', import.meta.url,
), 'utf8')) as IdentityVector[];

describe('Salesforce and website identity vectors', () => {
  it.each(vectors)('$label', ({ input, canonical }) => {
    expect(canonicalEmail(input ?? '')).toBe(canonical);
    if (canonical && input) {
      expect(emailIdentityHash(input)).toBe(createHash('sha256').update(canonical, 'utf8').digest('hex'));
    }
  });
});

describe('phone-only identity normalization', () => {
  it.each(['2025550100', '(202) 555-0100', '+1 (202) 555-0100', '1-202-555-0100'])(
    'shares a bucket for equivalent address %s', input => {
      expect(normalizedPhone(input)).toBe('+12025550100');
    },
  );

  it('distinguishes a neighboring number and declines unusable keys', () => {
    expect(normalizedPhone('202-555-0101')).toBe('+12025550101');
    expect(normalizedPhone('202-555')).toBeNull();
    expect(normalizedPhone('')).toBeNull();
    expect(normalizedPhone()).toBeNull();
  });

  it('normalizes international numbers with a full country code', () => {
    expect(normalizedPhone('+44 20 7946 0958')).toBe('+442079460958');
  });
});

describe('business payload binding', () => {
  const key = 'ab'.repeat(32);
  const volatile = new Set(['visitor', 'captcha', 'retURL']);

  it('uses HMAC over stable sorted entries and ignores volatile fields', () => {
    const initial = new URLSearchParams({ state: 'CO', retURL: '/first', email: 'original@example.test' });
    const reordered = new URLSearchParams({ visitor: 'second', email: 'original@example.test', state: 'CO', captcha: 'x' });
    const expected = createHmac('sha256', Buffer.from(key, 'hex'))
      .update(JSON.stringify([['email', 'original@example.test'], ['state', 'CO']])).digest('hex');
    expect(leadPayloadHash(initial, volatile, key)).toBe(expected);
    expect(leadPayloadHash(reordered, volatile, key)).toBe(expected);
    expect(leadPayloadHash(initial, volatile, 'cd'.repeat(32))).not.toBe(expected);
    expect(() => leadPayloadHash(initial, volatile, 'malformed-key')).toThrow();
    initial.set('state', 'FL');
    expect(leadPayloadHash(initial, volatile, key)).not.toBe(expected);
  });
});
