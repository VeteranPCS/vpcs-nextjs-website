'use server'
import sendToSlack from '@/actions/sendToSlack';
import { LeadSubmissionError } from '@/lib/leads/submission-outcome';
import stateService from '@/services/stateService';
import { logDebug, logError, logInfo } from './loggingService';
import { FormSubmissionStatus, trackFormSubmission, updateSubmissionStatus } from './formTrackingService';
import { appendLeadSubmissionMarker } from '@/lib/leads/submission-marker';
import { evaluateLeadSpam, tagSpamSuspected } from '@/lib/spam-protection';
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
import { getVerifiedSalesforceSession } from '@/services/salesForceTokenService';
import { COLORADO_RELOCATION_GUIDE } from '@/lib/guides/colorado-relocation';
import {
    appendSalesforceAttributionParams,
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

interface SalesforceSubmissionResult {
    success: boolean;
    response?: Response;
    responseText?: string;
    redirectUrl?: string;
    error?: Error;
    /** Set only when LEAD_DRY_RUN short-circuited the POST; never set on a real submission. */
    dryRun?: true;
}

/**
 * Submit once to Salesforce Web-to-Lead.
 *
 * Web-to-Lead is not idempotent: a 2xx response can create a Lead even when the
 * response body is missing, unexpected, or does not contain the normal redirect
 * script. Retrying after any response can create duplicate Leads, so this helper
 * intentionally performs exactly one POST.
 *
 * Dry-run choke point 1 of 2: this is the only place the app POSTs to Web-to-Lead, so
 * the guard here covers all ten forms.
 */
async function submitToSalesforceWebToLead(
    url: string,
    formBody: string,
    submissionId: string,
    dryRun: boolean,
    sandboxReturnUrl?: string,
): Promise<SalesforceSubmissionResult> {
    if (dryRun) {
        console.log('[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST', {
            submissionId,
            fieldCount: new URLSearchParams(formBody).size,
        });

        return { success: true, responseText: '', dryRun: true };
    }

    const sandbox = Boolean(sandboxReturnUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody,
            signal: controller.signal,
            ...(sandbox ? { redirect: 'error' } : {}),
        });

        clearTimeout(timeoutId);

        logInfo('Salesforce Web-to-Lead response received', {
            submissionId,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (!response.ok) {
            const error = new Error(`Salesforce HTTP error: ${response.status} ${response.statusText}`);
            logError('Salesforce Web-to-Lead HTTP error', { submissionId, status: response.status }, error);
            return { success: false, response, error };
        }

        let responseText = '';
        try {
            responseText = await response.text();
            logDebug('Salesforce Web-to-Lead response text received', {
                submissionId,
                responseLength: responseText.length,
                hasContent: responseText.length > 0
            });
        } catch (textError) {
            logError(
                'Failed to read Salesforce Web-to-Lead response text - treating accepted HTTP response as success',
                { submissionId },
                textError
            );
        }

        const validation = validateSalesforceResponse(responseText, submissionId, !sandbox);

        if (!validation.isValid) {
            const error = new Error(`Salesforce validation failed: ${validation.reason}`);
            logError('Salesforce Web-to-Lead response validation failed', {
                submissionId,
                reason: validation.reason,
                ...(!sandbox ? { responsePreview: responseText.substring(0, 200) } : {}),
            }, error);
            return { success: false, response, responseText, error };
        }

        const candidate = extractSalesforceRedirectUrl(responseText);
        const redirectUrl = !sandbox || candidate === sandboxReturnUrl || candidate === '/thank-you' ? candidate : undefined;

        logInfo('Salesforce Web-to-Lead submission accepted', {
            submissionId,
            hasRedirectUrl: !!redirectUrl,
            ...(!sandbox ? { redirectUrl } : {}),
        });

        return {
            success: true,
            response,
            responseText,
            redirectUrl
        };
    } catch (networkError) {
        const error = networkError instanceof Error ? networkError : new Error('Unknown network error');

        if (error.name === 'AbortError') {
            logError('Salesforce Web-to-Lead request timeout', { submissionId }, error);
        } else {
            logError('Salesforce Web-to-Lead network error', { submissionId }, error);
        }

        return { success: false, error };
    } finally {
        clearTimeout(timeoutId);
    }
}

function extractSalesforceRedirectUrl(responseText: string): string | undefined {
    const redirectUrlMatch = responseText.match(/window\.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
    return redirectUrlMatch ? redirectUrlMatch[1] : undefined;
}

/**
 * Validates that a Salesforce response indicates successful form submission
 */
function validateSalesforceResponse(responseText: string, submissionId: string, logPreview: boolean): { isValid: boolean; reason?: string } {
    // 1. Positive signal FIRST. Salesforce emits a redirect script on acceptance
    //    (window.location(...) / window.location.replace(...)). This is the
    //    authoritative success signal. Checking it before any substring scan makes
    //    the echoed retURL (which can contain words like "security") irrelevant.
    if (responseText && /window\.location(?:\.replace)?\(['"]([^'"]+)['"]\)/.test(responseText)) {
        logDebug('Found Salesforce success redirect in response', { submissionId });
        return { isValid: true };
    }

    // 2. Empty/whitespace response → accepted. Salesforce can create the Lead and
    //    still return no useful body; retrying here risks duplicate Leads.
    if (!responseText || responseText.trim().length === 0) {
        logDebug('Empty response from Salesforce - treating accepted HTTP response as success', {
            submissionId,
            responseLength: responseText ? responseText.length : 0
        });
        return { isValid: true };
    }

    // 3. Has content but no redirect → reject only explicit Salesforce error signals.
    const errorIndicators = [
        'error occurred',
        'required field',
        'required fields are missing',
        'unable to create',
        'failed to submit',
        'system error',
        'temporarily unavailable',
        'invalid captcha',
        'captcha verification failed'
    ];

    const lowerResponseText = responseText.toLowerCase();
    for (const indicator of errorIndicators) {
        if (lowerResponseText.includes(indicator)) {
            logDebug('Found error indicator in response', {
                submissionId,
                indicator,
                ...(logPreview ? { responsePreview: responseText.substring(0, 200) } : {}),
            });
            return { isValid: false, reason: `Error indicator found: ${indicator}` };
        }
    }

    // 4. Has content, no redirect, no known error indicator → accepted. A 2xx
    //    Web-to-Lead response is the strongest safe signal we have.
    logDebug('Response has content but no Salesforce success redirect - treating accepted HTTP response as success', {
        submissionId,
        responseLength: responseText.length,
        ...(logPreview ? { responsePreview: responseText.substring(0, 200) } : {}),
    });
    return { isValid: true };
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
    try {
        await work();
    } catch {
        logError('Post-acceptance work failed', { submissionId, stage });
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
): Promise<TResult> {
    const production = isProductionSalesforceRuntime();
    const options = runtime?.options;
    const queryString = runtime?.queryString ?? '';

    const submissionId = await trackFormSubmission(
        config.formType,
        // Pre-validation, untrusted payload — logged only via truthiness checks.
        rawFormData as Record<string, unknown>,
        FormSubmissionStatus.PENDING,
    );

    logInfo(config.processingMessage, { submissionId });
    let postInitiated = false;
    let acceptedResult: TResult | undefined;

    try {
        const deployedNonProduction = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
        if (deployedNonProduction && !isProtectedSalesforceWebdevPreview()) {
            throw new Error('Lead submissions are disabled in non-production Vercel environments');
        }
        const salesforce = getSalesforceConfig();
        const sandbox = salesforce.profile === 'webdev';
        if (sandbox && process.env.VPCS_SANDBOX_LEAD_WRITES === '1' &&
            !salesforce.allowSandboxWrites && !isLeadDryRun()) {
            throw new Error('Salesforce WebDev writes are disabled for this environment');
        }
        const dryRun = salesforce.profile === 'mock' || (sandbox && !salesforce.allowSandboxWrites) ||
            (!production && isLeadDryRun());

        // Validate and normalize the payload before processing. Invalid data is a HARD
        // reject here — never written to Salesforce.
        const validation = parseLeadForm(config.schema, rawFormData);
        if (!validation.ok) {
            logError(`Invalid ${config.formType} submission`, { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        // Trust boundary: zod has validated and normalized the payload. The config's schema
        // erases to `z.ZodTypeAny`, so `validation.data` is untyped here — assert the flat
        // string-map view the downstream builders/sinks consume. Non-string passthrough values
        // (analytics counters, an `otherStates` array) still flow through untouched.
        const formData: Record<string, string | undefined> = validation.data as Record<string, string | undefined>;

        // Family A: parse the query string and require a valid effective state.
        let paramsObj: Record<string, string> = {};
        let partnerId: string | undefined;
        let effectiveState: EffectiveLeadState | null = null;
        if (config.location) {
            new URLSearchParams(queryString).forEach((value, key) => {
                paramsObj[key] = value;
            });
            partnerId = paramsObj.id;
            if (sandbox && !dryRun && partnerId) {
                const role = config.location.partner === 'agent' ? 'agents' : 'lenders';
                if (!isWebdevPartnerFixture(salesforce, role, partnerId)) {
                    throw new Error('Salesforce WebDev submission requires an approved partner Account fixture');
                }
            }

            effectiveState = getEffectiveLeadState(formData.state, paramsObj.state);
            if (!effectiveState) {
                logError(`Invalid ${config.formType} state`, {
                    submissionId,
                    formState: formData.state,
                    queryState: paramsObj.state,
                });
                throw new Error('Invalid form data: state is required.');
            }
            formData.state = effectiveState.code;
        }

        // Preserve suspected leads in Salesforce and tag them for downstream quarantine.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            ...(config.spamFreeTextField ? { freeText: formData[config.spamFreeTextField] } : {}),
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: config.formType, reasons: spam.reasons });
            if (config.spamFreeTextField) {
                formData[config.spamFreeTextField] = tagSpamSuspected(formData[config.spamFreeTextField]);
            }
        }

        const sandboxSiteOrigin = sandbox && !dryRun ? getWebdevSiteOrigin() : undefined;
        const siteOrigin = sandboxSiteOrigin ?? BASE_URL;
        let webFormUrl = '';
        if (config.location) {
            // Keep the sandbox URL limited to the approved partner selector and state.
            const sandboxQuery = new URLSearchParams({ state: formData.state ?? '' });
            if (paramsObj.id) sandboxQuery.set('id', paramsObj.id);
            webFormUrl = appendLeadSubmissionMarker(
                `${siteOrigin}/${config.location.path}${sandbox ? `?${sandboxQuery}` : queryString}`,
                submissionId,
            );
        }

        const ctx: WebToLeadContext = {
            formData,
            spam,
            submissionId,
            paramsObj,
            webFormUrl,
            siteOrigin,
            sandboxSiteOrigin,
            effectiveState,
            agentInfo: null,
        };

        const legacyParams = config.buildParams(ctx);
        if (sandbox && !dryRun) {
            markWebdevSubmission(legacyParams, salesforce, submissionId);
        }
        const params = serializeWebToLeadParams(legacyParams, salesforce);
        const formBody = params.toString();
        const url = dryRun ? salesforce.webToLeadUrl : assertWebToLeadTarget(params, salesforce);
        // Web-to-Lead is unauthenticated. Verify sandbox identity without making production intake depend on OAuth.
        if (sandbox && !dryRun) {
            const session = await getVerifiedSalesforceSession();
            if (session.cacheKey !== salesforce.cacheKey) throw new Error('Salesforce session did not match the Web-to-Lead profile');
        }

        // Salesforce must resolve an optional sandbox partner ID against the verified sandbox Account store.
        if (partnerId && !dryRun) {
            try {
                ctx.agentInfo = await stateService.fetchAgentById(partnerId);
                logDebug('Partner information fetched successfully', {
                    partner_id: partnerId,
                    submissionId,
                });
            } catch (error) {
                if (sandbox) throw new Error('Salesforce WebDev partner Account could not be verified');
                logError('Error fetching partner information', {
                    partner_id: partnerId,
                    submissionId,
                }, error);
            }
            if (sandbox && !ctx.agentInfo) throw new Error('Salesforce WebDev partner Account could not be verified');
        }

        logDebug('Sending form data to Salesforce Web-to-Lead', {
            submissionId,
            profile: salesforce.profile,
        });

        if (sandbox && !dryRun) requireWebdevTestRun(salesforce);
        postInitiated = !dryRun;
        const submissionResult = await submitToSalesforceWebToLead(
            url,
            formBody,
            submissionId,
            dryRun,
            sandboxSiteOrigin ? `${sandboxSiteOrigin}/thank-you` : undefined,
        );

        if (!submissionResult.success) {
            logError('Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message,
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;
        // Build the legacy success shape once. From here on, acceptance cannot be demoted.
        const result = config.buildResult(redirectUrl, submissionId);
        acceptedResult = dryRun ? { ...result, dryRun: true as const } : result;
        await afterAcceptance(submissionId, 'status', () =>
            updateSubmissionStatus(submissionId, FormSubmissionStatus.SUCCESS, response));
        if (config.capture) {
            const capture = config.capture;
            await afterAcceptance(submissionId, 'accepted_conversion', () => captureAcceptedCustomerLead({
                dryRun,
                spamQuarantined: spam.quarantine,
                formId: capture.formId,
                leadSource: capture.leadSource,
                submissionId,
                formData,
                ...(capture.sourcePagePath ? { sourcePagePath: capture.sourcePagePath } : {}),
                ...(capture.stateCode ? { stateCode: capture.stateCode } : {}),
                ...(capture.stateSlug ? { stateSlug: capture.stateSlug } : {}),
                ...(config.location
                    ? {
                        stateCode: effectiveState?.code,
                        stateSlug: effectiveState?.slug,
                        partnerType: capture.partnerType,
                        partnerSalesforceId: paramsObj.id || null,
                    }
                    : {}),
                ...(capture.guideId ? { guideId: capture.guideId } : {}),
            }));
        }
        await afterAcceptance(submissionId, 'notifications', () =>
            dispatchSlackNotification(submissionId, dryRun, () => config.buildSlack(ctx)));

        logInfo('Form submitted successfully', { submissionId, hasRedirectUrl: !!redirectUrl });

        return acceptedResult;
    } catch (error) {
        if (acceptedResult) {
            logError('Post-acceptance processing interrupted', { submissionId });
            return acceptedResult;
        }
        await updateSubmissionStatus(
            submissionId,
            postInitiated ? FormSubmissionStatus.UNCONFIRMED : FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error'),
        );

        logError(`Error in ${config.formType} submission`, { submissionId }, error);
        throw new LeadSubmissionError(postInitiated ? 'unconfirmed' : 'not_sent', submissionId);
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
