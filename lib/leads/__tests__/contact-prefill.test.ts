// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_PREFILL_STORAGE_KEY, consumeContactPrefill, storeContactPrefill } from '../contact-prefill';

const agentId = '001Rg00000pmUUk';
const details = { firstName: ' Alex ', lastName: ' Example ', email: ' alex@example.test ' };
const normalized = { firstName: 'Alex', lastName: 'Example', email: 'alex@example.test' };

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-21T20:00:00Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); sessionStorage.clear(); localStorage.clear(); });

describe('one-time contact prefill', () => {
  it('stores only contact details in this tab and consumes them once for the selected agent', () => {
    storeContactPrefill(agentId, { ...details, extra: 'not stored' } as typeof details);
    const serialized = sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY);
    expect(serialized).not.toContain('not stored');
    expect(localStorage.length).toBe(0);
    expect(consumeContactPrefill(agentId)).toEqual(normalized);
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    expect(consumeContactPrefill(agentId)).toBeNull();
  });

  it.each([null, '', '001Rg00000otherX'])('clears a handoff without revealing it to target %s', target => {
    storeContactPrefill(agentId, details);
    expect(consumeContactPrefill(target)).toBeNull();
    expect(consumeContactPrefill(agentId)).toBeNull();
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
  });

  it('expires after fifteen minutes', () => {
    storeContactPrefill(agentId, details);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(consumeContactPrefill(agentId)).toBeNull();
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
  });

  it('accepts a handoff just before expiry', () => {
    storeContactPrefill(agentId, details);
    vi.advanceTimersByTime(15 * 60 * 1000 - 1);
    expect(consumeContactPrefill(agentId)).toEqual(normalized);
  });

  it.each([
    '{invalid json',
    JSON.stringify({ version: 2, targetAgentId: agentId, expiresAt: Date.now() + 1, contact: normalized }),
    JSON.stringify({ version: 1, targetAgentId: agentId, expiresAt: 'tomorrow', contact: normalized }),
    'x'.repeat(1025),
  ])('removes malformed storage without throwing', serialized => {
    sessionStorage.setItem(CONTACT_PREFILL_STORAGE_KEY, serialized);
    expect(consumeContactPrefill(agentId)).toBeNull();
    expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
  });

  it('rejects a forged expiry beyond the allowed lifetime and invalid stored contact fields', () => {
    for (const patch of [
      { expiresAt: Date.now() + 16 * 60 * 1000 },
      { contact: { ...normalized, email: 'not-an-email' } },
      { contact: { ...normalized, firstName: 'a'.repeat(41) } },
      { contact: { ...normalized, lastName: null } },
    ]) {
      sessionStorage.setItem(CONTACT_PREFILL_STORAGE_KEY, JSON.stringify({ version: 1, targetAgentId: agentId, expiresAt: Date.now() + 1000, contact: normalized, ...patch }));
      expect(consumeContactPrefill(agentId)).toBeNull();
      expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    }
  });

  it('a contact click without details clears any older handoff', () => {
    storeContactPrefill(agentId, details);
    storeContactPrefill(agentId);
    expect(consumeContactPrefill(agentId)).toBeNull();
  });

  it('does not store invalid or oversized details', () => {
    for (const patch of [{ firstName: ' ' }, { lastName: 'a'.repeat(81) }, { email: 'invalid' }]) {
      storeContactPrefill(agentId, { ...details, ...patch });
      expect(sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY)).toBeNull();
    }
  });

  it.each(['getItem', 'removeItem', 'setItem'] as const)('fails safely when sessionStorage.%s is blocked', method => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException('Storage disabled'); });
    expect(() => storeContactPrefill(agentId, details)).not.toThrow();
    expect(consumeContactPrefill(agentId)).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
