import { stubLeadCaptchaEnv, syntheticCaptchaToken } from './lead-captcha-fixtures';
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sendToSlack from '@/actions/sendToSlack';
import { captureLeadConversionCreated } from '@/lib/analytics/server';
import { INTERNAL_CALL_TOKEN } from '@/lib/internal-call-token';
import { leadRateLimit } from '@/lib/leads/rate-limit';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { trustedLeadIp } from '@/lib/spam-protection';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import {
  checkBlockedIdentity, claimLeadAttempt, claimWebsiteNotifications, inspectLeadAttempt, reconcileLeadAttempt, LeadAttemptConflictError,
} from '@/services/salesforceIntake';
import {
  contactAgentPostForm, contactLenderPostForm, GetListedAgentsPostForm, GetListedLendersPostForm,
  KeepInTouchForm, contactPostForm, vaLoanGuideForm, homebuyerGuideForm,
  coloradoRelocationGuideForm, internshipFormSubmission,
} from '@/services/salesForcePostFormsService';
import stateService from '@/services/stateService';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/actions/sendToSlack', () => ({ default: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('@/lib/leads/rate-limit', () => ({ leadRateLimit: vi.fn() }));
vi.mock('@/lib/salesforce/intake-fields', () => ({
  getIntakeFields: () => ({ honeypot: '00N000000000901', submissionHash: '00N000000000902' }),
}));
vi.mock('@/services/salesforceIntake', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/salesforceIntake')>(),
  checkBlockedIdentity: vi.fn(),
  inspectLeadAttempt: vi.fn().mockResolvedValue({ exists: false, confirmed: false, declined: false }),
  claimLeadAttempt: vi.fn(),
  reconcileLeadAttempt: vi.fn(),
  claimWebsiteNotifications: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/services/stateService', () => ({ default: { fetchAgentById: vi.fn() } }));
vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { SUCCESS: 'SUCCESS' }, updateSubmissionStatus: vi.fn(),
}));
vi.mock('@/services/loggingService', () => ({ logDebug: vi.fn(), logError: vi.fn(), logInfo: vi.fn() }));
vi.mock('@/lib/analytics/server', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/analytics/server')>(),
  captureLeadConversionCreated: vi.fn(),
  captureServerAnalyticsEvent: vi.fn(),
}));

const selectedAgent = '?form=agent&id=001000000000001AAA&state=colorado';
const selectedLender = '?form=lender&id=001000000000002AAA&state=florida';
const forms = [
  { source: 'Contact Agent', submit: (data: unknown) => contactAgentPostForm(data, selectedAgent) },
  { source: 'Contact Lender', submit: (data: unknown) => contactLenderPostForm(data, selectedLender) },
  { source: 'Agent Listing Request', submit: GetListedAgentsPostForm },
  { source: 'Lender Listing Request', submit: GetListedLendersPostForm },
  { source: 'Keep in Touch', submit: KeepInTouchForm },
  { source: 'Contact Form', submit: contactPostForm },
  { source: 'VA Loan Guide', submit: vaLoanGuideForm },
  { source: 'First Time Home Buyer Guide', submit: homebuyerGuideForm },
  { source: 'Colorado Relocation Guide', submit: coloradoRelocationGuideForm },
  { source: 'Internship Application', submit: internshipFormSubmission },
];

function payload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Synthetic', lastName: 'Intake Matrix', first_name: 'Synthetic', last_name: 'Intake Matrix',
    email: 'qa@example.test', captchaToken: syntheticCaptchaToken, phone: '2025550100', mobile: '2025550100',
    state: 'CO', primaryState: 'CO', vpcs_visitor_id: 'vpcs_admission_test_01',
    [HP_FIELD]: '', [TS_FIELD]: Date.now() - 5_000, submission_attempt_id: randomUUID(),
    ...overrides,
  };
}

const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const blockedCanonicalHash = hash('blockedtest@gmail.com');

function assertNoNormalEffects() {
  expect(fetch).not.toHaveBeenCalled();
  expect(sendToSlack).not.toHaveBeenCalled();
  expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  expect(stateService.fetchAgentById).not.toHaveBeenCalled();
}

function assertRateStopsBeforeSalesforce() {
  expect(leadRateLimit).toHaveBeenCalledTimes(1);
  for (const operation of [inspectLeadAttempt, checkBlockedIdentity, claimLeadAttempt, reconcileLeadAttempt, claimWebsiteNotifications]) {
    expect(operation).not.toHaveBeenCalled();
  }
  assertNoNormalEffects();
}

beforeEach(() => {
  vi.clearAllMocks();
  stubProductionEnv();
  stubLeadCaptchaEnv();
  vi.stubEnv('VPCS_LEAD_BINDING_KEY', 'a'.repeat(64));
  vi.stubEnv('LEAD_SPAM_ENFORCED', undefined);
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  vi.mocked(inspectLeadAttempt).mockReset().mockResolvedValue({ exists: false, confirmed: false, declined: false });
  vi.mocked(leadRateLimit).mockReset().mockResolvedValue({ allowed: true, retryAt: Date.now() + 30_000 });
  vi.mocked(checkBlockedIdentity).mockReset().mockImplementation(async emailHash => emailHash === blockedCanonicalHash);
  vi.mocked(claimLeadAttempt).mockReset().mockImplementation(async (_id, _hash, _emailHash, denyDispatch) => ({ claimed: !denyDispatch, blocked: Boolean(denyDispatch) }));
  vi.mocked(claimWebsiteNotifications).mockReset().mockResolvedValue(true);
  vi.mocked(reconcileLeadAttempt).mockReset().mockResolvedValue(true);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each(forms)('admission on $source', ({ submit, source }) => {
  it('serializes the untouched contact address and common verified correlation fields on accepted intake', async () => {
    const email = 'Actual.Contact+fixture@Example.test';
    const data = payload({ email });
    const result = await submit(data);
    expect(result).toMatchObject({ outcome: 'accepted', success: true, submissionId: data.submission_attempt_id });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(leadRateLimit).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    const sent = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(sent.get('lead_source')).toBe(source);
    expect(sent.get('email')).toBe(email);
    expect(sent.get('00NRg00000PjSEfMAN')).toBe(data.submission_attempt_id);
    expect(sent.get('00N000000000901')).toBe('');
    expect(sent.get('00N000000000902')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a filled honeypot before partner lookup or outbound submission', async () => {
    await expect(submit(payload({ [HP_FIELD]: 'synthetic automation' })))
      .resolves.toMatchObject({ outcome: 'rejected', success: false });
    assertNoNormalEffects();
  });

  it.each([
    { label: 'missing', honeypot: undefined }, { label: 'object', honeypot: { value: '' } },
    { label: 'array', honeypot: ['', 'filled'] }, { label: 'overlong whitespace', honeypot: ' '.repeat(1_025) },
  ])('does not admit a $label honeypot envelope', async ({ honeypot }) => {
    const result = await submit(payload({ [HP_FIELD]: honeypot }));
    expect(result).toMatchObject({ success: false });
    assertNoNormalEffects();
  });

  it.each(['blockedtest@gmail.com', 'Blocked.Test+synthetic@GMAIL.COM'])('rejects the blocked Gmail identity or alias', async email => {
    await expect(submit(payload({ email }))).resolves.toMatchObject({ outcome: 'rejected', success: false });
    expect(checkBlockedIdentity).toHaveBeenCalledWith(blockedCanonicalHash);
    assertNoNormalEffects();
  });

  it('stops for review when a fresh client timestamp is the only weak signal', async () => {
    const data = payload({ [TS_FIELD]: Date.now() });
    await expect(submit(data)).resolves.toMatchObject({ outcome: 'review_required', success: false });
    expect(claimLeadAttempt).toHaveBeenCalledExactlyOnceWith(data.submission_attempt_id, expect.any(String), expect.any(String), true);
    assertNoNormalEffects();
  });

  it.each([
    { label: 'null', renderedAt: null }, { label: 'array', renderedAt: [Date.now() - 5_000] },
    { label: 'nonnumeric', renderedAt: 'not-a-date' }, { label: 'future', renderedAt: Date.now() + 24 * 60 * 60 * 1000 },
    { label: 'nondecimal', renderedAt: `0x${(Date.now() - 5_000).toString(16)}` },
  ])('does not admit a $label timestamp', async ({ renderedAt }) => {
    await expect(submit(payload({ [TS_FIELD]: renderedAt }))).resolves.toMatchObject({ success: false });
    assertNoNormalEffects();
  });

  it('stops with a bounded retry when a rate bucket is exhausted', async () => {
    const retryAt = Date.now() + 10_000;
    const data = payload();
    vi.mocked(leadRateLimit).mockResolvedValueOnce({ allowed: false, retryAt });
    await expect(submit(data)).resolves.toMatchObject({ outcome: 'retry_later', success: false, retryAt, submissionId: data.submission_attempt_id });
    assertRateStopsBeforeSalesforce();
  });

  it('stops with a recoverable result when Redis is unavailable', async () => {
    vi.mocked(leadRateLimit).mockRejectedValueOnce(new Error('test backend failed'));
    const data = payload();
    await expect(submit(data)).resolves.toMatchObject({ outcome: 'retry_later', success: false, submissionId: data.submission_attempt_id });
    assertRateStopsBeforeSalesforce();
  });

  it('stops with a recoverable result when required Salesforce policy is unavailable', async () => {
    vi.mocked(checkBlockedIdentity).mockRejectedValueOnce(new Error('test policy unavailable'));
    await expect(submit(payload())).resolves.toMatchObject({ outcome: 'retry_later', success: false });
    expect(claimLeadAttempt).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });
});

describe('contact identity and alternate caller boundaries', () => {
  it.each([
    { name: 'agent listing', submit: GetListedAgentsPostForm, phone: '', mobile: '2025550100' },
    { name: 'lender listing', submit: GetListedLendersPostForm, phone: '', mobile: '2025550100' },
    { name: 'internship', submit: internshipFormSubmission, phone: '2025550100', mobile: '' },
    { name: 'listing with neither field', submit: GetListedAgentsPostForm, phone: '', mobile: '' },
  ])('validates $name before using an unserialized contact alias', async ({ submit, phone, mobile }) => {
    const data = payload({ email: '', phone, mobile });
    await expect(submit(data)).resolves.toMatchObject({ outcome: 'validation_error', success: false, submissionId: data.submission_attempt_id });
    expect(leadRateLimit).not.toHaveBeenCalled();
    expect(inspectLeadAttempt).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it.each([
    { submit: GetListedAgentsPostForm, phone: '2025550100', mobile: '2025550101' },
    { submit: internshipFormSubmission, phone: '2025550101', mobile: '2025550100' },
  ])('uses the exact Salesforce phone despite the alternate populated alias', async ({ submit, phone, mobile }) => {
    await expect(submit(payload({ email: '', phone, mobile }))).resolves.toMatchObject({ outcome: 'accepted', success: true });
    expect(leadRateLimit).toHaveBeenCalledExactlyOnceWith([`phone:${hash('+12025550100')}`]);
    const body = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.get('mobile')).toBe('2025550100');
  });

  it('validates empty serialized contact data in credential-free mock mode as well', async () => {
    vi.stubEnv('VPCS_SALESFORCE_PROFILE', 'mock');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    const data = payload({ email: '', phone: '', mobile: '2025550100' });
    await expect(GetListedLendersPostForm(data)).resolves.toMatchObject({ outcome: 'validation_error', success: false, submissionId: data.submission_attempt_id });
    expect(leadRateLimit).not.toHaveBeenCalled();
    expect(inspectLeadAttempt).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it('accepts only one platform-controlled valid address for the optional IP bucket', () => {
    const header = 'x-vercel-forwarded-for';
    expect(trustedLeadIp(new Headers({ [header]: '192.0.2.1' }))).toBe('192.0.2.1');
    expect(trustedLeadIp(new Headers({ [header]: '2001:db8::1' }))).toBe('2001:db8::1');
    expect(trustedLeadIp(new Headers({ [header]: '192.0.2.1, 192.0.2.2' }))).toBeNull();
    expect(trustedLeadIp(new Headers({ 'x-real-ip': '192.0.2.1' }))).toBeNull();
    expect(trustedLeadIp(new Headers({ 'x-forwarded-for': '192.0.2.1' }))).toBeNull();
    vi.stubEnv('VERCEL', undefined);
    expect(trustedLeadIp(new Headers({ [header]: '192.0.2.1' }))).toBeNull();
  });

  it('uses the same phone-only rate identity across formatting and a separate key for distinct callers', async () => {
    const calls = [];
    for (const phone of ['2025550100', '+1 (202) 555-0100', '2025550101']) {
      vi.mocked(leadRateLimit).mockResolvedValueOnce({ allowed: false, retryAt: Date.now() + 10_000 });
      await expect(contactAgentPostForm(payload({ email: '', phone }), selectedAgent))
        .resolves.toMatchObject({ outcome: 'retry_later', success: false });
      calls.push(vi.mocked(leadRateLimit).mock.lastCall?.[0]);
    }
    expect(calls[0]).toHaveLength(1);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[0]).not.toEqual(calls[2]);
    expect(JSON.stringify(calls)).not.toMatch(/anonymous|202555010[01]/i);
    assertNoNormalEffects();
  });

  it('validates missing contact details before trying any fallback rate bucket', async () => {
    await expect(contactAgentPostForm(payload({ email: '', phone: '' }), selectedAgent))
      .resolves.toMatchObject({ outcome: 'validation_error', success: false });
    expect(leadRateLimit).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it.each([
    { name: 'agent', submit: (data: unknown) => contactAgentPostForm(data, selectedAgent), notes: 'additionalComments' },
    { name: 'agent listing', submit: GetListedAgentsPostForm, notes: 'tellusMore' },
    { name: 'internship', submit: internshipFormSubmission, notes: '00N4x00000QPS7V' },
  ])('requires review of a link in $name notes', async ({ submit, notes }) => {
    const result = await submit(payload({ [notes]: 'Review https://example.test/a please' }));
    expect(result).toMatchObject({ outcome: 'review_required', success: false });
    assertNoNormalEffects();
  });

  it('enforces the blocklist even for an authenticated internal tool', async () => {
    await expect(contactAgentPostForm(payload({ email: 'Blocked.Test+tool@gmail.com' }), selectedAgent, {
      internalCallToken: INTERNAL_CALL_TOKEN,
    })).resolves.toMatchObject({ outcome: 'rejected', success: false });
    assertNoNormalEffects();
  });
});

describe('durable claim and transport ambiguity', () => {
  it('reports a disabled deployment as not sent before any admission dependency or POST', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    await expect(contactPostForm(payload())).resolves.toMatchObject({ outcome: 'not_sent', success: false });
    expect(inspectLeadAttempt).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it('fails closed before POST when the HMAC binding key is invalid or absent', async () => {
    for (const key of [undefined, 'not-valid']) {
      vi.stubEnv('VPCS_LEAD_BINDING_KEY', key);
      await expect(contactPostForm(payload())).resolves.toMatchObject({ outcome: 'retry_later', success: false });
    }
    expect(inspectLeadAttempt).not.toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it('does not post if the authoritative claim becomes blocked after a clean policy lookup', async () => {
    vi.mocked(claimLeadAttempt).mockResolvedValueOnce({ claimed: false, blocked: true });
    await expect(contactPostForm(payload())).resolves.toMatchObject({ outcome: 'rejected', success: false });
    expect(checkBlockedIdentity).toHaveBeenCalled();
    expect(claimLeadAttempt).toHaveBeenCalled();
    assertNoNormalEffects();
  });

  it.each([false, true])('reconciles a concurrent dispatch when the preliminary read was empty and policy then blocks (confirmed=%s)', async confirmed => {
    const data = payload({ email: 'Blocked.Test+race@gmail.com' });
    // Another caller wins the durable dispatch slot between the first inspection and the deny request.
    vi.mocked(claimLeadAttempt).mockResolvedValueOnce({ claimed: false, blocked: false });
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(confirmed);
    vi.mocked(claimWebsiteNotifications).mockResolvedValue(false);
    await expect(contactPostForm(data)).resolves.toMatchObject({
      outcome: confirmed ? 'accepted' : 'unconfirmed', success: confirmed, submissionId: data.submission_attempt_id,
    });
    expect(claimLeadAttempt).toHaveBeenCalledExactlyOnceWith(data.submission_attempt_id, expect.stringMatching(/^[a-f0-9]{64}$/), blockedCanonicalHash, true);
    expect(reconcileLeadAttempt).toHaveBeenCalledTimes(1);
    assertNoNormalEffects();
  });

  it('returns definite rejection for a matching reference that already declined terminally', async () => {
    const data = payload();
    vi.mocked(inspectLeadAttempt).mockResolvedValueOnce({ exists: true, confirmed: false, declined: true });
    await expect(contactPostForm(data)).resolves.toEqual({ outcome: 'rejected', success: false, submissionId: data.submission_attempt_id });
    for (const operation of [checkBlockedIdentity, claimLeadAttempt, reconcileLeadAttempt, claimWebsiteNotifications]) {
      expect(operation).not.toHaveBeenCalled();
    }
    assertNoNormalEffects();
  });

  it('preserves a persisted submission reference as unconfirmed when a changed payload conflicts', async () => {
    const data = payload();
    let claimedHash: string;
    vi.mocked(claimLeadAttempt).mockImplementationOnce(async (_id, payloadHash) => {
      claimedHash = payloadHash;
      return { claimed: true, blocked: false };
    });
    vi.mocked(inspectLeadAttempt).mockImplementation(async (_id, payloadHash) => {
      if (!claimedHash) return { exists: false, confirmed: false, declined: false };
      if (claimedHash !== payloadHash) throw new LeadAttemptConflictError();
      return { exists: true, confirmed: true, declined: false };
    });
    const original = await contactPostForm(data);
    expect(original).toMatchObject({ outcome: 'accepted', submissionId: data.submission_attempt_id });
    const wireBody = new URLSearchParams(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(wireBody.get('00N000000000902')).toMatch(/^[a-f0-9]{64}$/);
    expect(wireBody.get('00N000000000902')).toBe(claimedHash!);
    expect(reconcileLeadAttempt).toHaveBeenCalledWith(data.submission_attempt_id, claimedHash!);
    const conflictingReplay = await contactPostForm({ ...data, email: 'different@example.test' });
    expect(conflictingReplay).toEqual({ outcome: 'unconfirmed', success: false, submissionId: data.submission_attempt_id });
    expect(inspectLeadAttempt).toHaveBeenLastCalledWith(data.submission_attempt_id, expect.not.stringMatching(claimedHash!));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(claimLeadAttempt).toHaveBeenCalledTimes(1);
    expect(reconcileLeadAttempt).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it('reports a 2xx response without exact persistence as unconfirmed', async () => {
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactPostForm(payload())).resolves.toMatchObject({ outcome: 'unconfirmed', success: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('reconciles a previously unconfirmed POST without admitting again after a policy change', async () => {
    const data = payload();
    vi.mocked(reconcileLeadAttempt).mockResolvedValueOnce(false);
    await expect(contactPostForm(data)).resolves.toMatchObject({ outcome: 'unconfirmed', success: false, submissionId: data.submission_attempt_id });
    expect(sendToSlack).not.toHaveBeenCalled();
    vi.mocked(checkBlockedIdentity).mockResolvedValue(true);
    vi.mocked(inspectLeadAttempt).mockResolvedValue({ exists: true, confirmed: false, declined: false });
    vi.mocked(leadRateLimit).mockRejectedValueOnce(new Error('rate provider unavailable during retry'));
    await expect(contactPostForm(data)).resolves.toMatchObject({ outcome: 'retry_later', success: false, submissionId: data.submission_attempt_id });
    expect(inspectLeadAttempt).toHaveBeenCalledTimes(1);
    expect(reconcileLeadAttempt).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(contactPostForm(data)).resolves.toMatchObject({ outcome: 'accepted', success: true, submissionId: data.submission_attempt_id });
    expect(checkBlockedIdentity).toHaveBeenCalledTimes(1);
    expect(leadRateLimit).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it('produces a single Web-to-Lead POST and one notification set across concurrent confirmed replay', async () => {
    const data = payload();
    vi.mocked(claimLeadAttempt).mockResolvedValueOnce({ claimed: true, blocked: false })
      .mockResolvedValueOnce({ claimed: false, blocked: false });
    vi.mocked(claimWebsiteNotifications).mockResolvedValueOnce(true).mockResolvedValue(false);
    const results = await Promise.all([contactPostForm(data), contactPostForm(data)]);
    expect(results).toEqual(Array(2).fill(expect.objectContaining({ outcome: 'accepted', success: true })));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
    expect(captureLeadConversionCreated).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('does not repeat an uncertain POST when readback throws (synthetic persisted=%s)', async persisted => {
    const nativeLeadIds = new Set<string>();
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (persisted) nativeLeadIds.add('fixture-existing');
      throw new Error('simulated loss after dispatch');
    }));
    vi.mocked(reconcileLeadAttempt).mockRejectedValue(new Error('synthetic readback outage'));
    const data = payload();
    vi.mocked(claimLeadAttempt).mockResolvedValueOnce({ claimed: true, blocked: false })
      .mockResolvedValueOnce({ claimed: false, blocked: false });
    const results = await Promise.all([contactPostForm(data), contactPostForm(data)]);
    expect(results).toEqual(Array(2).fill(expect.objectContaining({ outcome: 'unconfirmed', success: false })));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(nativeLeadIds.size).toBe(Number(persisted));
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });
});
