import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitContactAgentLead } from '@/app/(site)/contact-agent/actions';
import { submitContactLenderLead } from '@/app/(site)/contact-lender/actions';
import sendToSlack from '@/actions/sendToSlack';
import { captureLeadConversionCreated } from '@/lib/analytics/server';
import { leadRateLimit } from '@/lib/leads/rate-limit';
import { stubProductionEnv } from '@/lib/salesforce/__tests__/configuration-fixtures';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import {
  checkBlockedIdentity, claimLeadAttempt, claimWebsiteNotifications, inspectLeadAttempt, reconcileLeadAttempt,
} from '@/services/salesforceIntake';
import {
  GetListedAgentsPostForm, GetListedLendersPostForm,
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
  { source: 'Contact Agent', submit: (data: unknown) => submitContactAgentLead(data as Parameters<typeof submitContactAgentLead>[0], selectedAgent) },
  { source: 'Contact Lender', submit: (data: unknown) => submitContactLenderLead(data as Parameters<typeof submitContactLenderLead>[0], selectedLender) },
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
    email: 'qa@example.test', phone: '2025550100', mobile: '2025550100',
    state: 'CO', primaryState: 'CO', currentBase: 'Fixture Current', destinationBase: 'Fixture Destination', vpcs_visitor_id: 'vpcs_admission_test_01',
    [HP_FIELD]: '', [TS_FIELD]: Date.now() - 5_000, submission_attempt_id: randomUUID(),
    ...overrides,
  };
}

const siteKey = '6LcSyntheticRelease2WebsitePublicKey0123';
const keyName = 'Synthetic_Release2_WebToLead';
const browserToken = 'synthetic-browser-token-alpha';
const differentToken = 'synthetic-browser-token-bravo';

function expectNoDispatch() {
  expect(claimLeadAttempt).not.toHaveBeenCalled();
  expect(claimWebsiteNotifications).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(sendToSlack).not.toHaveBeenCalled();
  expect(captureLeadConversionCreated).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  stubProductionEnv();
  vi.stubEnv('VPCS_RECAPTCHA_PROFILE', 'production');
  vi.stubEnv('VPCS_RECAPTCHA_SITE_KEY', siteKey);
  vi.stubEnv('VPCS_SALESFORCE_RECAPTCHA_KEY_NAME', keyName);
  vi.stubEnv('VPCS_LEAD_BINDING_KEY', 'a'.repeat(64));
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
  vi.mocked(inspectLeadAttempt).mockReset().mockResolvedValue({ exists: false, confirmed: false, declined: false });
  vi.mocked(checkBlockedIdentity).mockReset().mockResolvedValue(false);
  vi.mocked(claimLeadAttempt).mockReset().mockResolvedValue({ claimed: true, blocked: false });
  vi.mocked(claimWebsiteNotifications).mockReset().mockResolvedValue(true);
  vi.mocked(reconcileLeadAttempt).mockReset().mockResolvedValue(true);
  vi.mocked(leadRateLimit).mockReset().mockResolvedValue({ allowed: true, retryAt: Date.now() + 30_000 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function webToLeadBody() {
  return new URLSearchParams(String(vi.mocked(fetch).mock.lastCall?.[1]?.body));
}

describe.each(forms)('CAPTCHA admission on $source', ({ source, submit }) => {
  it.each([undefined, '', '   ', { response: browserToken }, [browserToken], 'x'.repeat(65_536)])(
    'stops a fresh submission with an absent or malformed token',
    async captchaToken => {
      const data = payload({ captchaToken });
      await expect(submit(data)).resolves.toMatchObject({
        outcome: 'validation_error', success: false, fieldErrors: { captchaToken: expect.any(String) },
      });
      expectNoDispatch();
    },
  );

  it('does not terminally claim or dispatch a fresh blocked identity without a token', async () => {
    vi.mocked(checkBlockedIdentity).mockResolvedValue(true);
    const data = payload();
    await expect(submit(data)).resolves.toMatchObject({
      outcome: 'validation_error', success: false, submissionId: data.submission_attempt_id,
      fieldErrors: { captchaToken: expect.any(String) },
    });
    expectNoDispatch();
  });

  it('fails closed when the configured CAPTCHA profile does not match', async () => {
    vi.stubEnv('VPCS_RECAPTCHA_PROFILE', 'webdev');
    await expect(submit(payload({ captchaToken: browserToken }))).resolves.toMatchObject({
      outcome: 'retry_later', success: false,
    });
    expectNoDispatch();
  });

  it('serializes only the submitted token and server-owned CAPTCHA settings at Web-to-Lead', async () => {
    await expect(submit(payload({
      captchaToken: browserToken,
      'g-recaptcha-response': 'forged-legacy-token',
      captcha_settings: '{"fallback":"true","keyname":"forged"}',
    }))).resolves.toMatchObject({ outcome: 'accepted', success: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = webToLeadBody();
    expect(body.get('lead_source')).toBe(source);
    expect(body.getAll('g-recaptcha-response')).toEqual([browserToken]);
    expect(body.getAll('captcha_settings')).toHaveLength(1);
    expect(JSON.parse(body.get('captcha_settings')!)).toEqual({
      keyname: keyName, fallback: 'false', orgId: body.get('oid'), ts: expect.stringMatching(/^\d{13}$/),
    });
    expect(body.toString()).not.toContain(siteKey);
    expect(body.has('captchaToken')).toBe(false);
    for (const transport of [inspectLeadAttempt, claimLeadAttempt, reconcileLeadAttempt, claimWebsiteNotifications, sendToSlack, captureLeadConversionCreated]) {
      expect(JSON.stringify(vi.mocked(transport).mock.calls)).not.toContain(browserToken);
    }
  });

  it('reports unconfirmed if Salesforce returns HTTP 200 but no Lead persisted', async () => {
    vi.mocked(reconcileLeadAttempt).mockResolvedValue(false);
    const data = payload({ captchaToken: browserToken });
    await expect(submit(data)).resolves.toMatchObject({
      outcome: 'unconfirmed', success: false, submissionId: data.submission_attempt_id,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(claimWebsiteNotifications).not.toHaveBeenCalled();
    expect(sendToSlack).not.toHaveBeenCalled();
    expect(captureLeadConversionCreated).not.toHaveBeenCalled();
  });

  it('reconciles the same attempt without a token and does not submit to Salesforce again', async () => {
    const data = payload({ captchaToken: browserToken });
    await expect(submit(data)).resolves.toMatchObject({ outcome: 'accepted', success: true });
    const initial = vi.mocked(inspectLeadAttempt).mock.lastCall;
    expect(initial?.[1]).toMatch(/^[a-f0-9]{64}$/);
    vi.mocked(inspectLeadAttempt).mockResolvedValue({ exists: true, confirmed: true, declined: false });
    vi.mocked(claimWebsiteNotifications).mockResolvedValue(false);
    vi.stubEnv('VPCS_RECAPTCHA_PROFILE', 'webdev');
    for (const captchaToken of [undefined, differentToken, { invalid: true }]) {
      await expect(submit({ ...data, captchaToken })).resolves.toMatchObject({
        outcome: 'accepted',
        success: true,
        submissionId: data.submission_attempt_id,
      });
      expect(vi.mocked(inspectLeadAttempt).mock.lastCall).toEqual(initial);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(claimLeadAttempt).toHaveBeenCalledTimes(1);
    expect(sendToSlack).toHaveBeenCalledTimes(1);
  });
});
