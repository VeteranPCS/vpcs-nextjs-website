import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock server-only so it doesn't throw in test env
vi.mock('server-only', () => ({}));

// Mock next/headers — we control what `headers()` returns per test
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '1.2.3.4' })),
}));

// Mock the rate limiter — control results per test
vi.mock('@/lib/rate-limit', () => ({
  formLimiter: { limit: vi.fn() },
}));

// Mock loggingService so we can assert it's called on throw
vi.mock('@/services/loggingService', () => ({
  logError: vi.fn(),
}));

// NOTE: internal-call-token is NOT mocked globally; we import the real module and use
// INTERNAL_CALL_TOKEN for the bypass test (most reliable approach per spec guidance).

import { headers } from 'next/headers';
import { formLimiter } from '@/lib/rate-limit';
import { logError } from '@/services/loggingService';

const mockHeaders = headers as Mock;
const mockLimit = formLimiter.limit as Mock;

// Helper: make limit resolve with success for both ip + optional email buckets
function setupLimitSuccess() {
  mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 });
}

function setupIpFail() {
  // ip bucket returns over-limit; subsequent calls (email) would also fail but ip is enough
  mockLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: 0 });
}

function setupIpSuccessEmailFail() {
  // First call (ip) succeeds, second call (email) fails
  mockLimit
    .mockResolvedValueOnce({ success: true, limit: 5, remaining: 3, reset: 0 })
    .mockResolvedValueOnce({ success: false, limit: 5, remaining: 0, reset: 0 });
}

describe('spam-protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -----------------------------------------------------------------------
  // Internal bypass
  // -----------------------------------------------------------------------
  describe('internal bypass', () => {
    it('returns quarantine:false and reasons:["internal"] for a trusted internal call, without touching headers or formLimiter', async () => {
      // Use the real INTERNAL_CALL_TOKEN — the cleanest way to build a genuinely-trusted options object
      const { INTERNAL_CALL_TOKEN } = await import('@/lib/internal-call-token');
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        email: 'user@example.com',
        freeText: 'see http://spam.example',
        options: { internalCallToken: INTERNAL_CALL_TOKEN },
      });

      expect(result).toEqual({ quarantine: false, reasons: ['internal'] });
      // headers() must NOT have been called
      expect(mockHeaders).not.toHaveBeenCalled();
      // formLimiter.limit must NOT have been called
      expect(mockLimit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Kill-switch
  // -----------------------------------------------------------------------
  describe('kill-switch', () => {
    it('returns quarantine:false and reasons:["disabled"] when LEAD_SPAM_ENFORCED=0', async () => {
      vi.stubEnv('LEAD_SPAM_ENFORCED', '0');

      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'see http://spam.example',
        email: 'spammer@bad.com',
      });

      expect(result).toEqual({ quarantine: false, reasons: ['disabled'] });
    });
  });

  // -----------------------------------------------------------------------
  // Link detection
  // -----------------------------------------------------------------------
  describe('link in free text', () => {
    it('quarantines when freeText contains a URL', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({ freeText: 'see http://spam.example' });

      expect(result.quarantine).toBe(true);
      expect(result.reasons).toContain('link-in-freetext');
    });

    it('does not quarantine for clean text', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({ freeText: 'I am moving to San Diego next year' });

      expect(result.quarantine).toBe(false);
      expect(result.reasons).not.toContain('link-in-freetext');
    });
  });

  // -----------------------------------------------------------------------
  // Rate-limit — IP bucket over limit
  // -----------------------------------------------------------------------
  describe('rate-limit: ip bucket over limit', () => {
    it('quarantines and includes rate-limit in reasons', async () => {
      setupIpFail();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({ freeText: 'clean text' });

      expect(result.quarantine).toBe(true);
      expect(result.reasons).toContain('rate-limit');
    });
  });

  // -----------------------------------------------------------------------
  // Rate-limit — email bucket over limit (ip succeeds, email fails)
  // -----------------------------------------------------------------------
  describe('rate-limit: email bucket over limit', () => {
    it('quarantines when ip passes but email bucket is exhausted', async () => {
      setupIpSuccessEmailFail();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        email: 'repeat@example.com',
        freeText: 'clean text',
      });

      expect(result.quarantine).toBe(true);
      expect(result.reasons).toContain('rate-limit');
    });
  });

  // -----------------------------------------------------------------------
  // Fail open — formLimiter throws
  // -----------------------------------------------------------------------
  describe('fail open on rate-limit error', () => {
    it('does not crash and quarantine:false when formLimiter.limit throws (and logError is called)', async () => {
      mockLimit.mockRejectedValue(new Error('Redis connection timeout'));
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({ freeText: 'clean text', email: 'user@ok.com' });

      expect(result.quarantine).toBe(false);
      expect(result.reasons).not.toContain('rate-limit');
      expect(logError).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Clean lead
  // -----------------------------------------------------------------------
  describe('clean lead', () => {
    it('returns quarantine:false with empty reasons when lead is clean', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'Moving from Fort Bragg to Fort Lewis next summer',
        email: 'soldier@army.mil',
      });

      expect(result).toEqual({ quarantine: false, reasons: [] });
    });
  });

  // -----------------------------------------------------------------------
  // tagSpamSuspected
  // -----------------------------------------------------------------------
  describe('tagSpamSuspected', () => {
    it('returns bare tag when comments is undefined', async () => {
      const { tagSpamSuspected } = await import('@/lib/spam-protection');
      expect(tagSpamSuspected(undefined)).toBe('[SPAM-SUSPECTED]');
    });

    it('returns bare tag when comments is empty string', async () => {
      const { tagSpamSuspected } = await import('@/lib/spam-protection');
      expect(tagSpamSuspected('')).toBe('[SPAM-SUSPECTED]');
    });

    it('returns bare tag when comments is whitespace-only', async () => {
      const { tagSpamSuspected } = await import('@/lib/spam-protection');
      expect(tagSpamSuspected('   ')).toBe('[SPAM-SUSPECTED]');
    });

    it('prepends tag and space when comments has content', async () => {
      const { tagSpamSuspected } = await import('@/lib/spam-protection');
      expect(tagSpamSuspected('hello')).toBe('[SPAM-SUSPECTED] hello');
    });
  });

  // -----------------------------------------------------------------------
  // Phase 2: honeypot
  // -----------------------------------------------------------------------
  describe('honeypot', () => {
    it('quarantines when honeypot is non-empty', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        honeypot: 'http://bot.example',
      });

      expect(result.quarantine).toBe(true);
      expect(result.reasons).toContain('honeypot');
    });

    it('does not add honeypot reason when honeypot is empty string', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        honeypot: '',
      });

      expect(result.reasons).not.toContain('honeypot');
    });

    it('does not add honeypot reason when honeypot is whitespace-only', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        honeypot: '   ',
      });

      expect(result.reasons).not.toContain('honeypot');
    });

    it('does not add honeypot reason when honeypot is undefined', async () => {
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
      });

      expect(result.reasons).not.toContain('honeypot');
    });
  });

  // -----------------------------------------------------------------------
  // Phase 2: submit timing
  // -----------------------------------------------------------------------
  describe('submit timing', () => {
    const FIXED = 1_700_000_000_000;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('quarantines when elapsed time is less than MIN_SUBMIT_MS (100 ms)', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(FIXED);
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        renderedAt: FIXED - 100,
      });

      expect(result.quarantine).toBe(true);
      expect(result.reasons).toContain('too-fast');
    });

    it('does not add too-fast reason when elapsed time is >= MIN_SUBMIT_MS (5000 ms)', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(FIXED);
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        renderedAt: FIXED - 5000,
      });

      expect(result.reasons).not.toContain('too-fast');
    });

    it('does not add too-fast reason when renderedAt is in the future (negative elapsed / clock skew)', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(FIXED);
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        renderedAt: FIXED + 5000,
      });

      expect(result.reasons).not.toContain('too-fast');
    });

    it('does not add too-fast reason and does not throw when renderedAt is a non-numeric string', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(FIXED);
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
        renderedAt: 'abc',
      });

      expect(result.reasons).not.toContain('too-fast');
    });

    it('does not add too-fast reason when renderedAt is omitted', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(FIXED);
      setupLimitSuccess();
      const { evaluateLeadSpam } = await import('@/lib/spam-protection');

      const result = await evaluateLeadSpam({
        freeText: 'clean text',
      });

      expect(result.reasons).not.toContain('too-fast');
    });
  });
});
