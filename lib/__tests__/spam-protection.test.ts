import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headers } from 'next/headers';
import { INTERNAL_CALL_TOKEN } from '@/lib/internal-call-token';
import { evaluateLeadSpam, ipFromHeaders, trustedLeadIp, tagSpamSuspected } from '@/lib/spam-protection';
import { leadRateLimit } from '@/lib/leads/rate-limit';
import { checkBlockedIdentity } from '@/services/salesforceIntake';
import { emailIdentityHash, sha256 } from '@/lib/leads/identity';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/leads/rate-limit', () => ({ leadRateLimit: vi.fn() }));
vi.mock('@/services/salesforceIntake', () => ({ checkBlockedIdentity: vi.fn() }));
vi.mock('@/services/loggingService', () => ({ logError: vi.fn() }));

const clean = () => ({ email: 'user@example.test', honeypot: '', renderedAt: Date.now() - 5_000 });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LEAD_DRY_RUN', '0');
  vi.stubEnv('LEAD_SPAM_ENFORCED', undefined);
  vi.stubEnv('VERCEL', '1');
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': '192.0.2.10' }) as Awaited<ReturnType<typeof headers>>);
  vi.mocked(leadRateLimit).mockResolvedValue({ allowed: true, retryAt: Date.now() + 600_000 });
  vi.mocked(checkBlockedIdentity).mockResolvedValue(false);
});
afterEach(() => vi.unstubAllEnvs());

describe('lead admission', () => {
  it('admits clean input after current policy and both bounded identity checks', async () => {
    expect(await evaluateLeadSpam(clean())).toEqual({ decision: 'allow', quarantine: false, reasons: [] });
    expect(checkBlockedIdentity).toHaveBeenCalledWith(emailIdentityHash('user@example.test'));
    expect(leadRateLimit).toHaveBeenCalledWith([`email:${emailIdentityHash('user@example.test')}`, `ip:${sha256('192.0.2.10')}`]);
  });
  it.each(['https://bot.test', ' filled ', ' '.repeat(256), {}])('rejects filled or malformed honeypot before policy/rate requests: %j', async honeypot => {
    expect((await evaluateLeadSpam({ ...clean(), honeypot: honeypot as string })).decision).toBe('reject');
    expect(checkBlockedIdentity).not.toHaveBeenCalled();
    expect(leadRateLimit).not.toHaveBeenCalled();
  });
  it.each([undefined, '', {}, [], '0x123456', ' '.repeat(20), '1'.repeat(100), NaN, Infinity])('holds missing or malformed public timestamps: %j', async renderedAt => {
    expect((await evaluateLeadSpam({ ...clean(), renderedAt: renderedAt as string })).decision).toBe('review_required');
    expect(leadRateLimit).not.toHaveBeenCalled();
  });
  it('holds a missing public honeypot without inventing a successful review queue', async () => {
    expect((await evaluateLeadSpam({ ...clean(), honeypot: undefined })).decision).toBe('review_required');
  });
  it.each([0, -1000])('holds too-fast or future timing (elapsed %s)', async elapsed => {
    expect((await evaluateLeadSpam({ ...clean(), renderedAt: Date.now() - elapsed })).decision).toBe('review_required');
  });
  it('holds a link-only signal without declaring a permanent blocked identity', async () => {
    expect(await evaluateLeadSpam({ ...clean(), freeText: 'https://example.test' })).toMatchObject({ decision: 'review_required', reasons: ['link-in-freetext'] });
  });
  it('rejects an active blocked identity using its canonical matching key', async () => {
    vi.mocked(checkBlockedIdentity).mockResolvedValue(true);
    expect((await evaluateLeadSpam({ ...clean(), email: 'U.s.e.r+extra@gmail.com' })).decision).toBe('reject');
    expect(checkBlockedIdentity).toHaveBeenCalledWith(emailIdentityHash('user@gmail.com'));
    expect(leadRateLimit).not.toHaveBeenCalled();
  });
  it('returns recoverable rate exhaustion with its retry time', async () => {
    vi.mocked(leadRateLimit).mockResolvedValue({ allowed: false, retryAt: 12345 });
    expect(await evaluateLeadSpam(clean())).toMatchObject({ decision: 'retry_later', retryAt: 12345 });
  });
  it.each(['policy', 'rate'])('fails closed when %s is unavailable', async dependency => {
    if (dependency === 'policy') vi.mocked(checkBlockedIdentity).mockRejectedValue(new Error('offline'));
    else vi.mocked(leadRateLimit).mockRejectedValue(new Error('offline'));
    expect((await evaluateLeadSpam(clean())).decision).toBe('retry_later');
  });
  it('cannot disable enforcement with the old permissive switch', async () => {
    vi.stubEnv('LEAD_SPAM_ENFORCED', '0');
    expect((await evaluateLeadSpam(clean())).decision).toBe('retry_later');
  });
  it('internal calls still check blocked identity and rates but need no browser timing', async () => {
    const input = { email: 'user@example.test', options: { internalCallToken: INTERNAL_CALL_TOKEN } };
    expect((await evaluateLeadSpam(input)).decision).toBe('allow');
    expect(leadRateLimit).toHaveBeenCalledTimes(1);
    vi.mocked(checkBlockedIdentity).mockResolvedValue(true);
    expect((await evaluateLeadSpam(input)).decision).toBe('reject');
  });
  it('untrusted internal flags do not bypass missing browser signals', async () => {
    expect((await evaluateLeadSpam({ email: 'user@example.test', options: {} })).decision).toBe('review_required');
  });
  it('uses the normalized phone counter without a shared anonymous bucket', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers() as Awaited<ReturnType<typeof headers>>);
    expect((await evaluateLeadSpam({ ...clean(), email: undefined, phone: '+44 20 7946 0123' })).decision).toBe('allow');
    expect(leadRateLimit).toHaveBeenCalledWith([`phone:${sha256('+442079460123')}`]);
  });
  it('rejects missing contact identity instead of sharing an empty rate key', async () => {
    expect((await evaluateLeadSpam({ ...clean(), email: '', phone: '' })).decision).toBe('reject');
    expect(leadRateLimit).not.toHaveBeenCalled();
  });
  it('offline capture skips external dependencies while retaining honeypot admission', async () => {
    expect((await evaluateLeadSpam({ ...clean(), dryRun: true })).decision).toBe('allow');
    expect((await evaluateLeadSpam({ ...clean(), dryRun: true, honeypot: 'bot' })).decision).toBe('reject');
    expect(checkBlockedIdentity).not.toHaveBeenCalled();
    expect(leadRateLimit).not.toHaveBeenCalled();
  });
});

describe('IP trust and compatibility', () => {
  it('does not trust arbitrary forwarded local headers', () => {
    vi.stubEnv('VERCEL', undefined);
    expect(trustedLeadIp(new Headers({ 'x-vercel-forwarded-for': '192.0.2.1' }))).toBeNull();
  });
  it.each(['anonymous', '1.2.3.4, 5.6.7.8', 'not-an-ip', ''])('rejects ambiguous platform IP %j', value => {
    expect(trustedLeadIp(new Headers({ 'x-vercel-forwarded-for': value }))).toBeNull();
  });
  it('preserves existing non-lead IP helper behavior for unrelated routes', () => {
    expect(ipFromHeaders(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(ipFromHeaders(new Headers({ 'x-real-ip': '192.0.2.3' }))).toBe('192.0.2.3');
    expect(ipFromHeaders(new Headers())).toBe('anonymous');
  });
  it('retains the legacy marker helper as defense in depth', () => {
    expect(tagSpamSuspected('')).toBe('[SPAM-SUSPECTED]');
    expect(tagSpamSuspected('hello')).toBe('[SPAM-SUSPECTED] hello');
  });
});
