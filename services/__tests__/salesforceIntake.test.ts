import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse } from 'axios';
import { salesForceIntakeAPI } from '@/services/api';
import {
  checkBlockedIdentity, claimLeadAttempt, claimWebsiteNotifications, inspectLeadAttempt, reconcileLeadAttempt, LeadAttemptConflictError,
} from '@/services/salesforceIntake';

vi.mock('server-only', () => ({}));
vi.mock('@/services/api', () => ({ salesForceIntakeAPI: vi.fn() }));

const transport = vi.mocked(salesForceIntakeAPI);
const attemptId = '01234567-0123-4321-abcd-0123456789ab';
const payloadHash = 'a'.repeat(64);
const emailHash = 'b'.repeat(64);
const response = (status: number, data: unknown) => ({ status, data }) as AxiosResponse;
const actionSignal = expect.any(AbortSignal);

function untilCancelled(signal: AbortSignal | undefined): Promise<AxiosResponse> {
  if (!signal) throw new Error('Expected transport deadline');
  return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
}

beforeEach(() => { transport.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('Salesforce admission RPC', () => {
  it('sends only a bounded identity hash to the policy API and requires the current response version', async () => {
    transport.mockResolvedValueOnce(response(200, { blocked: true, policyVersion: 'r1' }));
    await expect(checkBlockedIdentity(emailHash)).resolves.toBe(true);
    expect(transport).toHaveBeenCalledExactlyOnceWith('policy', { emailHash }, actionSignal);
    transport.mockResolvedValueOnce(response(200, { blocked: false, policyVersion: 'stale' }));
    await expect(checkBlockedIdentity(emailHash)).rejects.toThrow();
  });

  it('inspects exact payload and attempt handles and rejects an authoritative conflict response', async () => {
    transport.mockResolvedValueOnce(response(200, { exists: true, confirmed: false, declined: false }));
    await expect(inspectLeadAttempt(attemptId, payloadHash)).resolves.toEqual({ exists: true, confirmed: false, declined: false });
    expect(transport).toHaveBeenCalledExactlyOnceWith('inspect', { attemptId, payloadHash }, actionSignal);
    transport.mockResolvedValueOnce(response(409, { code: 'attempt_conflict' }));
    await expect(inspectLeadAttempt(attemptId, payloadHash)).rejects.toBeInstanceOf(LeadAttemptConflictError);
  });

  it.each([[401, 'attempt_conflict'], [403, 'attempt_conflict'], [409, 'other_conflict']])(
    'keeps HTTP %i with code %s a generic intake error', async (status, code) => {
      transport.mockResolvedValueOnce(response(status, { code }));
      const error = await inspectLeadAttempt(attemptId, payloadHash).catch(reason => reason);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(LeadAttemptConflictError);
    });

  it('never retries a claim response lost to transport or token expiration', async () => {
    transport.mockRejectedValueOnce(new Error('synthetic unknown claim response'));
    await expect(claimLeadAttempt(attemptId, payloadHash, emailHash)).rejects.toThrow();
    expect(transport).toHaveBeenCalledExactlyOnceWith('claim', { attemptId, payloadHash, emailHash }, actionSignal);
    transport.mockResolvedValueOnce(response(401, { errorCode: 'INVALID_SESSION_ID' }));
    await expect(claimLeadAttempt(attemptId, payloadHash, emailHash)).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('sends an explicit terminal deny and never treats a dispatch grant as a deny result', async () => {
    transport.mockResolvedValueOnce(response(200, { claimed: false, blocked: true }));
    await expect(claimLeadAttempt(attemptId, payloadHash, emailHash, true)).resolves.toEqual({ claimed: false, blocked: true });
    expect(transport).toHaveBeenCalledExactlyOnceWith('claim', { attemptId, payloadHash, emailHash, denyDispatch: true }, actionSignal);
    transport.mockResolvedValueOnce(response(200, { claimed: true, blocked: false }));
    await expect(claimLeadAttempt(attemptId, payloadHash, emailHash, true)).rejects.toThrow('Invalid intake claim response');
  });

  it('aborts a waiting claim at five seconds and does not issue another request', async () => {
    vi.useFakeTimers();
    transport.mockImplementation((_operation, _data, signal) => untilCancelled(signal));
    const request = claimLeadAttempt(attemptId, payloadHash, emailHash);
    const rejection = expect(request).rejects.toThrow('deadline exceeded');
    await vi.advanceTimersByTimeAsync(4_999);
    expect(transport.mock.calls[0]?.[2]?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(transport).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops polling on exact confirmation without waiting for the late-commit window', async () => {
    vi.useFakeTimers();
    transport.mockResolvedValueOnce(response(200, { confirmed: false }))
      .mockResolvedValueOnce(response(200, { confirmed: true }));
    const confirmed = reconcileLeadAttempt(attemptId, payloadHash);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(confirmed).resolves.toBe(true);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport).toHaveBeenLastCalledWith('reconcile', { attemptId, payloadHash }, actionSignal);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([7_280, 9_000])('confirms a Lead that first becomes visible at %ims', async (visibleAfterMs) => {
    vi.useFakeTimers();
    const started = Date.now();
    transport.mockImplementation(async () => response(200, { confirmed: Date.now() - started >= visibleAfterMs }));
    let settled = false;
    const confirmed = reconcileLeadAttempt(attemptId, payloadHash).then(result => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(visibleAfterMs - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(4_000);
    await expect(confirmed).resolves.toBe(true);
    expect(transport.mock.calls.every(([operation, payload]) => operation === 'reconcile' &&
      payload.attemptId === attemptId && payload.payloadHash === payloadHash)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds absent confirmation to at most six exact reads within fifteen seconds', async () => {
    vi.useFakeTimers();
    transport.mockResolvedValue(response(200, { confirmed: false }));
    const missing = reconcileLeadAttempt(attemptId, payloadHash);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(missing).resolves.toBe(false);
    const count = transport.mock.calls.length;
    expect(count).toBeGreaterThan(4);
    expect(count).toBeLessThanOrEqual(6);
    await vi.runAllTimersAsync();
    expect(transport).toHaveBeenCalledTimes(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts the final in-flight read at the shared fifteen-second deadline', async () => {
    vi.useFakeTimers();
    for (let index = 0; index < 5; index++) {
      transport.mockResolvedValueOnce(response(200, { confirmed: false }));
    }
    transport.mockImplementation((_operation, _data, signal) => untilCancelled(signal));
    const request = reconcileLeadAttempt(attemptId, payloadHash);
    const rejection = expect(request).rejects.toThrow('deadline exceeded');
    await vi.advanceTimersByTimeAsync(14_999);
    expect(transport).toHaveBeenCalledTimes(6);
    const finalRead = transport.mock.calls.at(-1)?.[2];
    expect(finalRead?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(finalRead?.aborted).toBe(true);
    expect(transport).toHaveBeenCalledTimes(6);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('honors a shorter action deadline during the gap without issuing a second read', async () => {
    vi.useFakeTimers();
    transport.mockResolvedValue(response(200, { confirmed: false }));
    const action = new AbortController();
    const request = reconcileLeadAttempt(attemptId, payloadHash, action.signal);
    const rejection = expect(request).rejects.toThrow('action deadline');
    await vi.advanceTimersByTimeAsync(100);
    action.abort(new Error('action deadline'));
    await rejection;
    expect(transport).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('requires the server notification claim before reporting it available', async () => {
    transport.mockResolvedValueOnce(response(200, { claimed: false }));
    await expect(claimWebsiteNotifications(attemptId, payloadHash)).resolves.toBe(false);
    expect(transport).toHaveBeenCalledExactlyOnceWith('notification', { attemptId, payloadHash }, actionSignal);
    transport.mockResolvedValueOnce(response(200, { claimed: 'true' }));
    await expect(claimWebsiteNotifications(attemptId, payloadHash)).rejects.toThrow();
  });

  it('caps the notification claim at two seconds without replay', async () => {
    vi.useFakeTimers();
    transport.mockImplementation((_operation, _data, signal) => untilCancelled(signal));
    const request = claimWebsiteNotifications(attemptId, payloadHash);
    const rejection = expect(request).rejects.toThrow('deadline exceeded');
    await vi.advanceTimersByTimeAsync(2_000);
    await rejection;
    expect(transport).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
