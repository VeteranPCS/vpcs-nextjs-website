'use server'
import sendToSlack from '@/actions/sendToSlack';
import type { LeadSubmitResult } from '@/lib/leads/submission-outcome';
import { randomUUID } from 'node:crypto';
import { canonicalEmail, emailIdentityHash, leadPayloadHash, normalizedPhone } from '@/lib/leads/identity';
import { getIntakeFields } from '@/lib/salesforce/intake-fields';
import { inspectLeadAttempt, claimLeadAttempt, reconcileLeadAttempt, claimWebsiteNotifications, LeadAttemptConflictError } from '@/services/salesforceIntake';
import stateService from '@/services/stateService';
import { logDebug, logError, logInfo } from './loggingService';
import { FormSubmissionStatus, updateSubmissionStatus } from './formTrackingService';
import { appendLeadSubmissionMarker } from '@/lib/leads/submission-marker';
import { evaluateLeadSpam, evaluateLeadRateLimit } from '@/lib/spam-protection';
import { isLeadDryRun } from '@/lib/lead-dry-run';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import { formatStateLabel, normalizeStateCode, normalizeStateSlug } from '@/lib/states';
import {
    buildAgentLeadParams,
    buildLenderLeadParams,
    serializeWebToLeadParams,
} from '@/services/salesforceLeadParams';
import { SF_ORG_ID, SF_RECORD_TYPE } from '@/lib/salesforce/ids';
import { assertWebToLeadTarget, getSalesforceConfig } from '@/lib/salesforce/server-config';
import { isProductionSalesforceRuntime, isProtectedSalesforceWebdevPreview } from '@/lib/salesforce/environment.mjs';
import { getWebdevSiteOrigin, markWebdevSubmission, requireWebdevTestRun } from '@/lib/salesforce/webdev-intake';
import { isWebdevPartnerFixture } from '@/lib/salesforce/webdev-fixtures';
import { COLORADO_RELOCATION_GUIDE } from '@/lib/guides/colorado-relocation';
import {
    appendSalesforceAttributionParams,
    VPCS_VISITOR_ID_W2L_FIELD_ID,
    VPCS_SUBMISSION_ID_W2L_FIELD_ID,
    captureLeadConversionCreated,
    captureServerAnalyticsEvent,
} from '@/lib/analytics/server';
import {
    parseLeadForm,
    simpleLeadSchema,
    coloradoRelocationGuideSchema,
    contactAgentSchema,
    contactLenderSchema,
    getListedAgentsSchema,
    getListedLendersSchema,
    internshipSchema,
} from '@/lib/validation/leadForms';
import { type InternalCallOptions } from '@/lib/internal-call-token';

/** Exactly one bounded POST. Only the separate exact-record readback proves acceptance. */
async function submitToSalesforceWebToLead(
    url: string,
    formBody: string,
    submissionId: string,
    dryRun: boolean,
): Promise<{ response?: Response }> {
    if (dryRun) {
        console.log('[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST', {
            submissionId, fieldCount: new URLSearchParams(formBody).size,
        });
        return {};
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody,
            signal: AbortSignal.timeout(8_000),
            redirect: 'error',
        });
        logInfo('Salesforce Web-to-Lead HTTP response received; persistence unverified', {
            submissionId, status: response.status,
        });
        // The body may echo contact data or a misleading success redirect. Do not read it.
        void response.body?.cancel().catch(() => undefined);
        return { response };
    } catch {
        // An abort or network error can happen after Salesforce creates the Lead.
        // The durable claim remains consumed; callers reconcile and never repeat this POST.
        logError('Salesforce Web-to-Lead transport uncertain', { submissionId });
        return {};
    }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type EffectiveLeadState = {
    code: string;
    slug: string;
    label: string;
};

function getEffectiveLeadState(formState?: string, queryState?: string): EffectiveLeadState | null {
    const queryStateCode = normalizeStateCode(queryState);
    if (queryStateCode) {
        const slug = normalizeStateSlug(queryState) ?? normalizeStateSlug(queryStateCode);
        if (slug) {
            return {
                code: queryStateCode,
                slug,
                label: formatStateLabel(slug),
            };
        }
    }

    const formStateCode = normalizeStateCode(formState);
    if (!formStateCode) return null;

    const slug = normalizeStateSlug(formStateCode);
    if (!slug) return null;

    return {
        code: formStateCode,
        slug,
        label: formatStateLabel(slug),
    };
}

async function captureAcceptedCustomerLead(args: {
    dryRun: boolean;
    spamQuarantined: boolean;
    formId: string;
    leadSource: string;
    submissionId: string;
    formData: Record<string, unknown>;
    sourcePagePath?: string;
    stateCode?: string;
    stateSlug?: string;
    partnerType?: 'agent' | 'lender';
    partnerSalesforceId?: string | null;
    guideId?: string;
}): Promise<void> {
    // PostHog is the primary funnel telemetry source, so a dry-run submit must not emit a
    // conversion event. This is the fifth outbound side effect the flag suppresses.
    if (args.dryRun) {
        console.log('[LEAD_DRY_RUN] Skipping lead_conversion_created PostHog capture', {
            submissionId: args.submissionId,
            formId: args.formId,
            spamQuarantined: args.spamQuarantined,
        });
        return;
    }

    if (args.spamQuarantined || !isProductionSalesforceRuntime()) return;

    await captureLeadConversionCreated({
        formId: args.formId,
        leadSource: args.leadSource,
        submissionId: args.submissionId,
        formData: args.formData,
        ...(args.sourcePagePath ? { sourcePagePath: args.sourcePagePath } : {}),
        stateCode: args.stateCode,
        stateSlug: args.stateSlug,
        partnerType: args.partnerType,
        partnerSalesforceId: args.partnerSalesforceId,
        guideId: args.guideId,
    });
}

type SpamEvaluation = Awaited<ReturnType<typeof evaluateLeadSpam>>;

/**
 * Shared runtime context handed to every Web-to-Lead config callback. Only Family A
 * (contact-agent / contact-lender) populates `paramsObj`, `webFormUrl`, `effectiveState`,
 * and `agentInfo`; the other families leave them at their empty defaults and never read them.
 */
interface WebToLeadContext {
    // Validated payload as the body/Slack/SMS builders consume it: a flat string map. Real
    // payloads also carry non-string passthrough (analytics counters, an `otherStates` array);
    // those flow through untouched and are handled by the `Array.isArray` guards where read.
    formData: Record<string, string | undefined>;
    spam: SpamEvaluation;
    submissionId: string;
    paramsObj: Record<string, string>;
    webFormUrl: string;
    siteOrigin: string | undefined;
    sandboxSiteOrigin: string | undefined;
    effectiveState: EffectiveLeadState | null;
    agentInfo: any;
}

/**
 * Family A extras: query-string parsing, state derivation, and partner lookup.
 * Present only on the two contact-partner configs.
 */
interface WebToLeadLocation {
    partner: 'agent' | 'lender';
    path: 'contact-agent' | 'contact-lender';
}

interface WebToLeadCapture {
    formId: string;
    leadSource: string;
    sourcePagePath?: string;
    stateCode?: string;
    stateSlug?: string;
    guideId?: string;
    partnerType?: 'agent' | 'lender';
}

interface WebToLeadConfig<TResult> {
    formType: string;
    processingMessage: string;
    schema: Parameters<typeof parseLeadForm>[0];
    spamFreeTextField?: string;
    location?: WebToLeadLocation;
    buildParams: (ctx: WebToLeadContext) => URLSearchParams;
    buildSlack: (ctx: WebToLeadContext) => Parameters<typeof sendToSlack>[0];
    capture?: WebToLeadCapture;
    buildResult: (redirectUrl: string | undefined, submissionId: string) => TResult;
}

/**
 * Identity helper: returns the config unchanged but gives each callback its contextual
 * parameter types and infers `TResult` from `buildResult`.
 */
function defineWebToLeadConfig<TResult>(config: WebToLeadConfig<TResult>): WebToLeadConfig<TResult> {
    return config;
}

// ── Inline Web-to-Lead body builders (Families B & C) ───────────────────────────────
// Each preserves the exact field insertion order of the original inline block. The
// characterization suite pins these ordered bodies byte-for-byte, so insertion order is
// load-bearing (internship uniquely emits `recordType` BEFORE `retURL`).

function buildGetListedAgentsParams({ formData, siteOrigin }: WebToLeadContext): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.AGENT_LISTING_LEAD,
        lead_source: "Agent Listing Request",
        "00N4x00000Lsr0G": "true",
        country_code: "US",
        "00N4x00000QQ1LB": `${siteOrigin}/get-listed-agents`,
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        mobile: formData.phone || "",
        "00N4x00000LsnP2": formData.status_select || "",
        "00N4x00000LsnOx": formData.branch_select || "",
        "00N4x00000QQ0Vz": formData.discharge_status || "",
        "state_code": formData.state || "",
        "city": formData.city || "",
        "00N4x00000LpcBo": formData.primaryState || "",
        "00N4x00000QPIOt": Array.isArray(formData.otherStates) ? formData.otherStates.join(';') : formData.otherStates || "",
        "00N4x00000LpcCm": formData.licenseNumber || "",
        "00N4x00000LpcCr": formData.brokerageName || "",
        "00N4x00000c4kPN": formData.managingBrokerName || "",
        "00N4x00000c4kPS": formData.managingBrokerPhone || "",
        "00N4x00000c4kPX": formData.managingBrokerEmail || "",
        "00N4x00000LsqCV": formData.citiesServiced || "",
        "00N4x00000LsqCa": formData.basesServiced || "",
        "00N4x00000LpcDQ": formData.personallyPCS || "",
        "00N4x00000LpcDV": formData.leadAcceptance || "",
        "00N4x00000QPksj": formData.howDidYouHear || "",
        "00N4x00000QPS7V": formData.tellusMore || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
}

function buildGetListedLendersParams({ formData, siteOrigin }: WebToLeadContext): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.LENDER_LISTING_LEAD,
        lead_source: "Lender Listing Request",
        "00N4x00000Lsr0G": "true",
        country_code: "US",
        "00N4x00000QQ1LB": `${siteOrigin}/get-listed-lenders`,
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        mobile: formData.phone || "",
        "00N4x00000LsnP2": formData.status_select || "",
        "00N4x00000LsnOx": formData.branch_select || "",
        "00N4x00000QQ0Vz": formData.discharge_status || "",
        "00N4x00000LpcBo": formData.primaryState || "",
        "00N4x00000QPIOt": Array.isArray(formData.otherStates) ? formData.otherStates.join(';') : formData.otherStates || "",
        "00N4x00000LsqCV": formData.localCities || "",
        "00N4x00000QPIOZ": formData.nmlsId || "",
        "00N4x00000LpcCr": formData.name || "",
        "street": formData.street || "",
        "state_code": formData.state || "",
        "city": formData.city || "",
        "zip": formData.zip || "",
        "00N4x00000QPIOe": formData.companyNMLSId || "",
        "00N4x00000QPksj": formData.howDidYouHear || "",
        "00N4x00000QPS7V": formData.tellusMore || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
}

function buildKeepInTouchParams({ formData, siteOrigin, submissionId }: WebToLeadContext): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.CUSTOMER_LEAD_15,
        lead_source: "Keep in Touch",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
    return appendSalesforceAttributionParams(params, formData, submissionId);
}

function buildContactParams({ formData, siteOrigin, submissionId }: WebToLeadContext): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.CUSTOMER_LEAD_15,
        lead_source: "Contact Form",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "00N4x00000bfgFA": formData.additionalComments || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
    return appendSalesforceAttributionParams(params, formData, submissionId);
}

function buildVaLoanGuideParams({ formData, siteOrigin, submissionId }: WebToLeadContext): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.CUSTOMER_LEAD_15,
        lead_source: "VA Loan Guide",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
    return appendSalesforceAttributionParams(params, formData, submissionId);
}

function buildHomebuyerGuideParams({ formData, siteOrigin, submissionId }: WebToLeadContext): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.CUSTOMER_LEAD_15,
        lead_source: "First Time Home Buyer Guide",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
    return appendSalesforceAttributionParams(params, formData, submissionId);
}

const COLORADO_GUIDE_DESCRIPTION = `${COLORADO_RELOCATION_GUIDE.title} (${COLORADO_RELOCATION_GUIDE.version}) by ${COLORADO_RELOCATION_GUIDE.author}; Colorado (${COLORADO_RELOCATION_GUIDE.stateCode}); source: ${COLORADO_RELOCATION_GUIDE.pagePath}.`;

function buildColoradoRelocationGuideParams({ formData, siteOrigin, submissionId, sandboxSiteOrigin }: WebToLeadContext): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${siteOrigin}/thank-you`,
        recordType: SF_RECORD_TYPE.CUSTOMER_LEAD_15,
        lead_source: COLORADO_RELOCATION_GUIDE.leadSource,
        first_name: formData.firstName || '',
        last_name: formData.lastName || '',
        email: formData.email || '',
        // Content attribution is server-owned; visiting Colorado does not imply a move there.
        '00N4x00000QQ1LB': sandboxSiteOrigin
            ? `${sandboxSiteOrigin}${COLORADO_RELOCATION_GUIDE.pagePath}`
            : COLORADO_RELOCATION_GUIDE.sourceUrl,
        description: COLORADO_GUIDE_DESCRIPTION,
        'g-recaptcha-response': '',
        captcha_settings: '',
    });
    return appendSalesforceAttributionParams(params, formData, submissionId);
}

function buildInternshipParams({ formData, siteOrigin }: WebToLeadContext): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        recordType: SF_RECORD_TYPE.INTERNSHIP_LEAD,
        retURL: `${siteOrigin}/thank-you`,
        lead_source: "Internship Application",
        "00N4x00000Lsr0G": "true",
        country_code: "US",
        first_name: formData.first_name || "",
        last_name: formData.last_name || "",
        email: formData.email || "",
        mobile: formData.mobile || "",
        "00N4x00000LsnP2": formData["00N4x00000LsnP2"] || "",
        "00N4x00000LsnOx": formData["00N4x00000LsnOx"] || "",
        "00N4x00000QQ0Vz": Array.isArray(formData["00N4x00000QQ0Vz"]) ? formData["00N4x00000QQ0Vz"][0] : formData["00N4x00000QQ0Vz"] || "",
        state_code: formData.state_code || "",
        city: formData.city || "",
        base: formData.base || "",
        "00N4x00000QPK7L": formData["00N4x00000QPK7L"] || "",
        "00N4x00000LspV2": formData["00N4x00000LspV2"] || "",
        "00N4x00000LspUi": formData["00N4x00000LspUi"] || "",
        "00N4x00000QPLQY": formData["00N4x00000QPLQY"] || "",
        "00N4x00000QPLQd": formData["00N4x00000QPLQd"] || "",
        "00N4x00000QPksj": formData["00N4x00000QPksj"] || "",
        "00N4x00000QPS7V": formData["00N4x00000QPS7V"] || "",
        "g-recaptcha-response": "",
        "captcha_settings": "",
    });
}

async function dispatchSlackNotification(
    submissionId: string,
    dryRun: boolean,
    buildSlack: () => Parameters<typeof sendToSlack>[0],
): Promise<void> {
    let stage: 'construction' | 'delivery' | 'configuration' = 'construction';
    let detail = 'construction';
    try {
        const payload = buildSlack();
        if (dryRun) {
            console.log('[LEAD_DRY_RUN] Skipping lead notifications', { submissionId, channelCount: 1 });
            return;
        }
        stage = 'delivery';
        detail = 'rejected';
        const result = await sendToSlack(payload);
        if (result.captured) return;
        if (!result.ok) {
            if (result.failureStage === 'construction' || result.failureStage === 'configuration') {
                stage = result.failureStage;
            }
            detail = 'ok=false';
            throw new Error('Slack did not confirm delivery');
        }
        logInfo('Slack notification accepted', { submissionId });
        return;
    } catch {
        logError('Slack notification failed', { submissionId, stage }, new Error(detail));
    }
    if (!dryRun && isProductionSalesforceRuntime()) {
        try {
            await captureServerAnalyticsEvent({
                event: 'lead_notification_failed',
                distinctId: submissionId,
                properties: { submission_id: submissionId, channel: 'Slack', failure_detail: detail, failure_stage: stage },
            });
        } catch {
            logError('Notification failure telemetry unavailable', { submissionId, channel: 'Slack' });
        }
    }
}

/** Optional post-acceptance work cannot change the outcome of a created lead. */
async function afterAcceptance(submissionId: string, stage: string, work: () => Promise<unknown>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        // Persistence is already confirmed. A stuck telemetry/provider flush must
        // not turn acceptance into a browser timeout. Its claim is never replayed.
        await Promise.race([work(), new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Post-acceptance deadline')), 3_500);
        })]);
    } catch {
        logError('Post-acceptance work failed or exceeded its deadline', { submissionId, stage });
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * Single Web-to-Lead submission engine shared by all ten lead forms. The ten exports
 * are thin wrappers around this: their differences live entirely in the config they pass.
 */
async function submitWebToLead<TResult extends object>(
    config: WebToLeadConfig<TResult>,
    rawFormData: unknown,
    runtime?: { queryString?: string; options?: InternalCallOptions },
): Promise<LeadSubmitResult> {
    const queryString = runtime?.queryString ?? '';
    const raw = rawFormData && typeof rawFormData === 'object' && !Array.isArray(rawFormData)
        ? rawFormData as Record<string, unknown> : {};
    const providedId = raw.submission_attempt_id;
    if (providedId !== undefined && (typeof providedId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(providedId))) {
        return { outcome: 'validation_error', success: false, fieldErrors: { submission_attempt_id: 'Invalid submission reference.' } };
    }
    const submissionId = typeof providedId === 'string' ? providedId : randomUUID();
    let ambiguous = false;
    let acceptedResult: LeadSubmitResult | undefined;
    try {
        const hostedNonProduction = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
        if (hostedNonProduction && !isProtectedSalesforceWebdevPreview()) {
            return { outcome: 'not_sent', success: false, submissionId };
        }
        const salesforce = getSalesforceConfig();
        const sandbox = salesforce.profile === 'webdev';
        const dryRun = salesforce.profile === 'mock' || (!isProductionSalesforceRuntime() && isLeadDryRun());
        if (sandbox && !salesforce.allowSandboxWrites && !dryRun) return { outcome: 'not_sent', success: false, submissionId };
        const validation = parseLeadForm(config.schema, rawFormData);
        if (!validation.ok) return { outcome: 'validation_error', success: false, submissionId,
            fieldErrors: { form: 'Please check the required fields and try again.' } };
        const formData = validation.data as Record<string, string | undefined>;
        const paramsObj: Record<string, string> = {};
        let effectiveState: EffectiveLeadState | null = null;
        if (config.location) {
            new URLSearchParams(queryString).forEach((value, key) => { paramsObj[key] = value; });
            if (sandbox && !dryRun && paramsObj.id &&
                !isWebdevPartnerFixture(salesforce, config.location.partner === 'agent' ? 'agents' : 'lenders', paramsObj.id)) {
                return { outcome: 'not_sent', success: false, submissionId };
            }
            effectiveState = getEffectiveLeadState(formData.state, paramsObj.state);
            if (!effectiveState) return { outcome: 'validation_error', success: false, submissionId,
                fieldErrors: { state: 'Choose a destination state.' } };
            formData.state = effectiveState.code;
        }
        const sandboxSiteOrigin = sandbox && !dryRun ? getWebdevSiteOrigin() : undefined;
        const siteOrigin = sandboxSiteOrigin ?? BASE_URL;
        const selector = new URLSearchParams({ state: formData.state ?? '' });
        if (paramsObj.id) selector.set('id', paramsObj.id);
        const webFormUrl = config.location ? appendLeadSubmissionMarker(
            `${siteOrigin}/${config.location.path}${sandbox ? `?${selector}` : queryString}`, submissionId) : '';
        const ctx: WebToLeadContext = { formData, spam: { decision: 'allow', quarantine: false, reasons: [] },
            submissionId, paramsObj, webFormUrl, siteOrigin, sandboxSiteOrigin, effectiveState, agentInfo: null };
        const legacyParams = appendSalesforceAttributionParams(config.buildParams(ctx), formData, submissionId);
        // Only contacts actually serialized for Salesforce may determine admission or its rate bucket.
        const email = legacyParams.get('email') || undefined;
        const phone = legacyParams.get('mobile') || legacyParams.get('phone') || undefined;
        const invalidContact = { outcome: 'validation_error', success: false, submissionId,
            fieldErrors: { form: 'Enter a valid email address or phone number.' } } as const;
        if (email ? !canonicalEmail(email) : !normalizedPhone(phone)) return invalidContact;
        const emailHash = emailIdentityHash(email);
        if (sandbox && !dryRun) {
            requireWebdevTestRun(salesforce);
            // Validate fixture identity/recipients before any OAuth-bound request; mark the actual body later.
            markWebdevSubmission(new URLSearchParams(legacyParams), salesforce, submissionId);
        }
        // The reference lives separately from the business fingerprint, including URL attribution.
        const volatileKeys = new Set(['retURL', 'captcha_settings', 'g-recaptcha-response',
            '00N4x00000QQ1LB', VPCS_VISITOR_ID_W2L_FIELD_ID, VPCS_SUBMISSION_ID_W2L_FIELD_ID]);
        const bindingKey = process.env.VPCS_LEAD_BINDING_KEY;
        if (!dryRun && !bindingKey) throw new Error('Lead binding key unavailable');
        const payloadHash = leadPayloadHash(legacyParams, volatileKeys, dryRun ? undefined : bindingKey);
        // Bound expensive Salesforce inspection/policy calls, including repeated reference checks.
        const rate = await evaluateLeadRateLimit({ email, phone, dryRun });
        if (rate.decision === 'reject') return invalidContact;
        if (rate.decision !== 'allow') return { outcome: rate.decision,
            success: false, submissionId, ...(rate.retryAt ? { retryAt: rate.retryAt } : {}) };
        let confirmed = false;
        if (!dryRun) {
            // An existing attempt may already have native outreach. Never relabel it rejected.
            const prior = await inspectLeadAttempt(submissionId, payloadHash);
            if (prior.declined) return { outcome: 'rejected', success: false, submissionId };
            if (prior.exists) {
                ambiguous = true;
                confirmed = await reconcileLeadAttempt(submissionId, payloadHash);
                if (!confirmed) return { outcome: 'unconfirmed', success: false, submissionId };
            }
        }
        if (!confirmed) {
            ctx.spam = await evaluateLeadSpam({ email, phone,
                freeText: config.spamFreeTextField ? formData[config.spamFreeTextField] : undefined,
                honeypot: formData[HP_FIELD], renderedAt: formData[TS_FIELD], options: runtime?.options, dryRun, rateChecked: true });
            if (ctx.spam.decision === 'retry_later') {
                return { outcome: 'retry_later',
                    success: false, submissionId, ...(ctx.spam.retryAt ? { retryAt: ctx.spam.retryAt } : {}) };
            }
            if (ctx.spam.decision !== 'allow') {
                const outcome = ctx.spam.decision === 'reject' ? 'rejected' : 'review_required';
                if (dryRun) return { outcome, success: false, submissionId };
                // Resolve the deny against the same durable slot as dispatch. A prior dispatch may already have persisted.
                ambiguous = true;
                const denial = await claimLeadAttempt(submissionId, payloadHash, emailHash, true);
                if (denial.blocked) return { outcome, success: false, submissionId };
                confirmed = await reconcileLeadAttempt(submissionId, payloadHash);
                if (!confirmed) return { outcome: 'unconfirmed', success: false, submissionId };
            }
        }
        // Enrichment occurs only after admission, and never controls native Salesforce ownership.
        if (paramsObj.id && !dryRun) {
            try { ctx.agentInfo = await stateService.fetchAgentById(paramsObj.id, AbortSignal.timeout(5_000)); }
            catch { if (sandbox) throw new Error('Sandbox partner could not be verified'); }
            if (sandbox && !ctx.agentInfo) throw new Error('Sandbox partner could not be verified');
        }
        let response: Response | undefined;
        if (!confirmed) {
            if (sandbox && !dryRun) {
                requireWebdevTestRun(salesforce);
                markWebdevSubmission(legacyParams, salesforce, submissionId);
            }
            const params = serializeWebToLeadParams(legacyParams, salesforce);
            const fields = dryRun ? { honeypot: '00N000000000901', submissionHash: '00N000000000902' } : getIntakeFields(salesforce);
            params.set(fields.honeypot, ''); // Only a validated, empty honeypot reaches serialization.
            params.set(fields.submissionHash, payloadHash);
            const url = dryRun ? salesforce.webToLeadUrl : assertWebToLeadTarget(params, {
                ...salesforce,
                // These two IDs have their own verified, org-bound manifest above.
                fieldIds: { ...salesforce.fieldIds, [fields.honeypot]: fields.honeypot, [fields.submissionHash]: fields.submissionHash },
            });
            if (!dryRun) {
                // The claim is durable before the POST; lost responses never authorize a resend.
                ambiguous = true;
                const claim = await claimLeadAttempt(submissionId, payloadHash, emailHash);
                if (claim.blocked) return { outcome: 'rejected', success: false, submissionId };
                if (!claim.claimed) {
                    confirmed = await reconcileLeadAttempt(submissionId, payloadHash);
                    if (!confirmed) return { outcome: 'unconfirmed', success: false, submissionId };
                }
            }
            if (!confirmed) {
                const transport = await submitToSalesforceWebToLead(url, params.toString(), submissionId, dryRun);
                response = transport.response;
                // HTTP/body/redirects cannot prove persistence or prove a rejection.
                confirmed = dryRun || await reconcileLeadAttempt(submissionId, payloadHash);
                if (!confirmed) return { outcome: 'unconfirmed', success: false, submissionId };
            }
        }
        acceptedResult = { outcome: 'accepted', success: true, submissionId, redirectUrl: '/thank-you' };
        await afterAcceptance(submissionId, 'status', () => updateSubmissionStatus(submissionId, FormSubmissionStatus.SUCCESS, response));
        // Atomic notification claim prevents duplicate Slack/conversion effects after replayed reads.
        let notify = dryRun;
        if (!dryRun) await afterAcceptance(submissionId, 'notification_claim', async () => {
            notify = await claimWebsiteNotifications(submissionId, payloadHash);
        });
        if (notify) {
            if (config.capture) {
                const capture = config.capture;
                await afterAcceptance(submissionId, 'accepted_conversion', () => captureAcceptedCustomerLead({
                    dryRun, spamQuarantined: false, formId: capture.formId, leadSource: capture.leadSource,
                    submissionId, formData, sourcePagePath: capture.sourcePagePath,
                    stateCode: effectiveState?.code ?? capture.stateCode,
                    stateSlug: effectiveState?.slug ?? capture.stateSlug,
                    partnerType: capture.partnerType, partnerSalesforceId: paramsObj.id || null, guideId: capture.guideId,
                }));
            }
            await afterAcceptance(submissionId, 'notifications', () => dispatchSlackNotification(submissionId, dryRun, () => config.buildSlack(ctx)));
        }
        return acceptedResult;
    } catch (error) {
        if (acceptedResult) return acceptedResult;
        const uncertain = ambiguous || error instanceof LeadAttemptConflictError;
        logError('Lead admission or confirmation unavailable', { submissionId, uncertain });
        return { outcome: uncertain ? 'unconfirmed' : 'retry_later', success: false, submissionId };
    }
}

// ── Per-form configs + thin wrappers (existing signatures unchanged) ────────────

const contactAgentConfig = defineWebToLeadConfig({
    formType: 'contactAgent',
    processingMessage: 'Processing contact agent form submission',
    schema: contactAgentSchema,
    spamFreeTextField: 'additionalComments',
    location: {
        partner: 'agent',
        path: 'contact-agent',
    },
    buildParams: (ctx) =>
        buildAgentLeadParams(ctx.formData, ctx.paramsObj, ctx.webFormUrl, ctx.siteOrigin, ctx.submissionId),
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Agent Lead' : '🔔 New Agent Lead',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}` || "",
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        state: ctx.effectiveState!.label,
        message: ctx.formData.additionalComments || "",
        agentInfo: ctx.agentInfo ? {
            name: ctx.agentInfo.Name || "",
            email: ctx.agentInfo.PersonEmail || "",
            phoneNumber: ctx.agentInfo.PersonMobilePhone || "",
            brokerage: ctx.agentInfo.Brokerage_Name__pc,
        } : undefined,
    }),
    capture: {
        formId: 'contact_agent',
        leadSource: 'Contact Agent',
        partnerType: 'agent',
    },
    buildResult: (redirectUrl, submissionId) =>
        redirectUrl ? { redirectUrl, submissionId } : { message: 'Form submitted successfully!', submissionId },
});

export async function contactAgentPostForm(formData: unknown, queryString: string, options?: InternalCallOptions) {
    return submitWebToLead(contactAgentConfig, formData, { queryString, options });
}

const contactLenderConfig = defineWebToLeadConfig({
    formType: 'contactLender',
    processingMessage: 'Processing contact lender form submission',
    schema: contactLenderSchema,
    spamFreeTextField: 'additionalComments',
    location: {
        partner: 'lender',
        path: 'contact-lender',
    },
    buildParams: (ctx) =>
        buildLenderLeadParams(ctx.formData, ctx.paramsObj, ctx.webFormUrl, ctx.siteOrigin, ctx.submissionId),
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Lender Lead' : '🔔 New Lender Lead',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        state: ctx.effectiveState!.label,
        message: ctx.formData.additionalComments || "",
        agentInfo: ctx.agentInfo ? {
            name: ctx.agentInfo.Name || "",
            email: ctx.agentInfo.PersonEmail || "",
            phoneNumber: ctx.agentInfo.PersonMobilePhone || "",
            brokerage: ctx.agentInfo.Brokerage_Name__pc,
        } : undefined,
    }),
    capture: {
        formId: 'contact_lender',
        leadSource: 'Contact Lender',
        partnerType: 'lender',
    },
    buildResult: (redirectUrl, submissionId) =>
        redirectUrl ? { redirectUrl, submissionId } : { message: 'Form submitted successfully!', submissionId },
});

export async function contactLenderPostForm(formData: unknown, fullQueryString: string, options?: InternalCallOptions) {
    return submitWebToLead(contactLenderConfig, formData, { queryString: fullQueryString, options });
}

const getListedAgentsConfig = defineWebToLeadConfig({
    formType: 'getListedAgents',
    processingMessage: 'Processing agent listing form submission',
    schema: getListedAgentsSchema,
    spamFreeTextField: 'tellusMore',
    buildParams: buildGetListedAgentsParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Agent Listing Request' : '🔔 New Agent Listing Request',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.tellusMore || "",
    }),
    buildResult: (redirectUrl) =>
        redirectUrl ? { redirectUrl } : { message: 'Form submitted successfully!' },
});

export async function GetListedAgentsPostForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(getListedAgentsConfig, formData, { options });
}

const getListedLendersConfig = defineWebToLeadConfig({
    formType: 'getListedLenders',
    processingMessage: 'Processing lender listing form submission',
    schema: getListedLendersSchema,
    spamFreeTextField: 'tellusMore',
    buildParams: buildGetListedLendersParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Lender Listing Request' : '🔔 New Lender Listing Request',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.tellusMore || "",
    }),
    buildResult: (redirectUrl) =>
        redirectUrl ? { redirectUrl } : { message: 'Form submitted successfully!' },
});

export async function GetListedLendersPostForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(getListedLendersConfig, formData, { options });
}

const keepInTouchConfig = defineWebToLeadConfig({
    formType: 'keepInTouch',
    processingMessage: 'Processing keep in touch form submission',
    schema: simpleLeadSchema,
    buildParams: buildKeepInTouchParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Keep In Touch Submission' : '🔔 New Keep In Touch Submission',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.additionalComments || "",
    }),
    capture: {
        formId: 'keep_in_touch',
        leadSource: 'Keep in Touch',
    },
    buildResult: (_redirectUrl, submissionId) =>
        ({ success: true, message: 'Form submitted successfully!', submissionId }),
});

export async function KeepInTouchForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(keepInTouchConfig, formData, { options });
}

const contactConfig = defineWebToLeadConfig({
    formType: 'contact',
    processingMessage: 'Processing contact form submission',
    schema: simpleLeadSchema,
    spamFreeTextField: 'additionalComments',
    buildParams: buildContactParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Contact Form Submission' : '🔔 New Contact Form Submission',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.additionalComments || "",
    }),
    capture: {
        formId: 'contact_form',
        leadSource: 'Contact Form',
    },
    buildResult: (_redirectUrl, submissionId) =>
        ({ success: true, message: 'Form submitted successfully!', submissionId }),
});

export async function contactPostForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(contactConfig, formData, { options });
}

const vaLoanGuideConfig = defineWebToLeadConfig({
    formType: 'vaLoanGuide',
    processingMessage: 'Processing VA loan guide form submission',
    schema: simpleLeadSchema,
    buildParams: buildVaLoanGuideParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New VA Loan Guide Download' : '🔔 New VA Loan Guide Download',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.additionalComments || "",
    }),
    capture: {
        formId: 'va_loan_guide',
        leadSource: 'VA Loan Guide',
        guideId: 'va_loan_guide',
    },
    buildResult: (_redirectUrl, submissionId) =>
        ({ success: true, message: 'Form submitted successfully!', submissionId }),
});

export async function vaLoanGuideForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(vaLoanGuideConfig, formData, { options });
}

const homebuyerGuideConfig = defineWebToLeadConfig({
    formType: 'homebuyerGuide',
    processingMessage: 'Processing first time home buyer guide form submission',
    schema: simpleLeadSchema,
    buildParams: buildHomebuyerGuideParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New First Time Home Buyer Guide Download' : '🔔 New First Time Home Buyer Guide Download',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.phone || "",
        message: ctx.formData.additionalComments || "",
    }),
    capture: {
        formId: 'first_time_homebuyer_guide',
        leadSource: 'First Time Home Buyer Guide',
        guideId: 'first_time_homebuyer_guide',
    },
    buildResult: (_redirectUrl, submissionId) =>
        ({ success: true, message: 'Form submitted successfully!', submissionId }),
});

export async function homebuyerGuideForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(homebuyerGuideConfig, formData, { options });
}

const coloradoRelocationGuideConfig = defineWebToLeadConfig({
    formType: 'coloradoRelocationGuide',
    processingMessage: 'Processing Colorado relocation guide form submission',
    schema: coloradoRelocationGuideSchema,
    buildParams: buildColoradoRelocationGuideParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Colorado Relocation Guide Download' : '🔔 New Colorado Relocation Guide Download',
        name: `${ctx.formData.firstName} ${ctx.formData.lastName}`,
        email: ctx.formData.email || '',
        phoneNumber: '',
        message: COLORADO_GUIDE_DESCRIPTION,
    }),
    capture: {
        formId: COLORADO_RELOCATION_GUIDE.id,
        leadSource: COLORADO_RELOCATION_GUIDE.leadSource,
        guideId: COLORADO_RELOCATION_GUIDE.id,
        sourcePagePath: COLORADO_RELOCATION_GUIDE.pagePath,
        stateCode: COLORADO_RELOCATION_GUIDE.stateCode,
        stateSlug: COLORADO_RELOCATION_GUIDE.stateSlug,
    },
    buildResult: (_redirectUrl, submissionId) =>
        ({ success: true, message: 'Form submitted successfully!', submissionId }),
});

export async function coloradoRelocationGuideForm(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(coloradoRelocationGuideConfig, formData, { options });
}

const internshipConfig = defineWebToLeadConfig({
    formType: 'internship',
    processingMessage: 'Processing internship form submission',
    schema: internshipSchema,
    spamFreeTextField: '00N4x00000QPS7V',
    buildParams: buildInternshipParams,
    buildSlack: (ctx) => ({
        headerText: ctx.spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Internship Submission' : '🔔 New Internship Submission',
        name: `${ctx.formData.first_name} ${ctx.formData.last_name}`,
        email: ctx.formData.email || "",
        phoneNumber: ctx.formData.mobile || "",
        message: "",
    }),
    buildResult: (redirectUrl) =>
        redirectUrl ? { redirectUrl } : { message: 'Form submitted successfully!' },
});

export async function internshipFormSubmission(formData: unknown, options?: InternalCallOptions) {
    return submitWebToLead(internshipConfig, formData, { options });
}
