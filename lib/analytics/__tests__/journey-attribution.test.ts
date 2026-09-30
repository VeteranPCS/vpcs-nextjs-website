import { describe, expect, it, vi } from 'vitest';
import { createJourneyTracker, customerJourneyProperties, safeSessionEntryPath, validSessionId } from '../journey-attribution';
import { sanitizeAnalyticsProperties } from '../sanitizer';

const A = '01994000-0000-7000-8000-123456789012';
const B = '01994000-0000-7000-8000-123456789013';
function setup() {
  let id = A;
  let optedOut = false;
  let enabled = true;
  let storage = true;
  let notify: (id: string) => void = () => {};
  const sdk = { onSessionId: (callback: (id: string) => void) => { notify = callback; callback(id); return vi.fn(); },
    get_session_id: () => id, has_opted_out_capturing: () => optedOut };
  const tracker = createJourneyTracker(() => enabled, () => { if (!storage) throw Error('blocked'); return true; });
  return { tracker, sdk, rotate: (next: string) => { id = next; notify(id); },
    optOut: (value: boolean) => { optedOut = value; }, flag: (value: boolean) => { enabled = value; },
    blockStorage: () => { storage = false; } };
}

describe('customer session attribution privacy', () => {
  it('accepts SDK UUIDs without treating their numeric segments as phone numbers', () => {
    expect(validSessionId(A)).toBe(A);
    expect(sanitizeAnalyticsProperties({ $session_id: A, posthog_session_id: A })).toEqual({ $session_id: A, posthog_session_id: A });
  });
  it.each(['', 'not-a-session', A + 'x', A.replace('-7000-', '-0000-'), 123, null])('omits invalid id %s', (id) => {
    expect(customerJourneyProperties('contact_agent', { posthog_session_id: id, journey_attribution_version: 1 }, true)).toEqual({});
  });
  it('strips query/fragment, preserves approved article and state paths', () => {
    expect(safeSessionEntryPath('https://www.veteranpcs.com/contact-agent?email=qa@example.com#name')).toBe('/contact-agent');
    expect(safeSessionEntryPath('/blog/house-hunting-leave-pcs-guide')).toBe('/blog/house-hunting-leave-pcs-guide');
    expect(safeSessionEntryPath('/california/')).toBe('/california');
  });
  it.each(['/people/jane-smith', '/qa@example.com', '/5555551212', '/blog/unknown-person-name',
    '/%71a%40example.com', '//evil.com/contact-agent', 'https://evil.com/contact-agent',
    'https://www.veteranpcs.com.evil.com/contact-agent', '/contact-agent\\x', '/bad path', '/%broken', '/' + 'a'.repeat(2049)])('rejects unsafe or unknown entry %s', (path) => {
    expect(safeSessionEntryPath(path)).toBeUndefined();
  });
  it('removes raw SDK entry URL/referrer properties regardless of flag', () => {
    expect(sanitizeAnalyticsProperties({ $session_entry_url: 'https://www.veteranpcs.com/contact-agent?email=x@y.com',
      $session_entry_referrer: 'https://google.com', $initial_session_entry_url: '/contact-agent',
      $session_entry_pathname: '/qa@example.com', session_entry_path: '/contact-agent?x=y' })).toEqual({ session_entry_path: '/contact-agent' });
  });
  it('is additive for old payloads and scoped to customer forms', () => {
    const data = { posthog_session_id: A, session_entry_path: '/', journey_attribution_version: 1 };
    expect(customerJourneyProperties('contact_agent', {}, true)).toEqual({});
    expect(customerJourneyProperties('contact_agent', data, false)).toEqual({});
    expect(customerJourneyProperties('get_listed_agents', data, true)).toEqual({});
    expect(customerJourneyProperties('contact_lender', data, true)).toEqual(data);
    expect(customerJourneyProperties('contact_agent', { ...data, session_entry_path: '/qa@example.com' }, true)).not.toHaveProperty('session_entry_path');
  });
});

describe('SDK-owned session lifecycle', () => {
  it('handles delayed initialization and direct form entry without inventing an entry', () => {
    const s = setup();
    expect(s.tracker.payload('contact_agent')).toEqual({});
    s.tracker.initialize(s.sdk);
    s.tracker.observe({ $session_id: A, $current_url: 'https://www.veteranpcs.com/contact-agent' });
    expect(s.tracker.payload('contact_agent')).not.toHaveProperty('session_entry_path');
    s.tracker.observe({ $session_id: A, $session_entry_url: 'https://www.veteranpcs.com/contact-agent?fn=QA' });
    expect(s.tracker.payload('contact_agent')).toMatchObject({ session_entry_path: '/contact-agent', posthog_session_id: A });
  });
  it('clears entry on rotation/reset and ignores a delayed old-session event', () => {
    const s = setup(); s.tracker.initialize(s.sdk);
    s.tracker.observe({ $session_id: A, $session_entry_url: 'https://www.veteranpcs.com/california' });
    s.rotate(B);
    s.tracker.observe({ $session_id: A, $session_entry_url: 'https://www.veteranpcs.com/california' });
    expect(s.tracker.payload('contact_agent')).toEqual({ posthog_session_id: B, journey_attribution_version: 1 });
    s.rotate(''); expect(s.tracker.payload('contact_agent')).toEqual({});
  });
  it('rehydrates only from SDK properties on reload and in another tab', () => {
    for (let i = 0; i < 3; i++) {
      const s = setup(); s.tracker.initialize(s.sdk);
      s.tracker.observe({ $session_id: A, $session_entry_url: 'https://www.veteranpcs.com/california' });
      expect(s.tracker.payload('contact_lender')).toMatchObject({ posthog_session_id: A, session_entry_path: '/california' });
    }
  });
  it('clears stale context when opted out and never returns attribution with blocked storage or flag off', () => {
    const s = setup(); s.tracker.initialize(s.sdk);
    s.tracker.observe({ $session_id: A, $session_entry_pathname: '/california' });
    s.optOut(true); expect(s.tracker.payload('contact_agent')).toEqual({});
    s.optOut(false); expect(s.tracker.payload('contact_agent')).not.toHaveProperty('session_entry_path');
    s.flag(false); expect(s.tracker.payload('contact_agent')).toEqual({});
    s.flag(true); s.blockStorage(); expect(s.tracker.payload('contact_agent')).toEqual({});
  });
});
