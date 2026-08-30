'use server'
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { formatPhoneNumberForDisplay, formatPhoneNumberE164 } from '@/utils/formatPhoneNumber';
import stateService from '@/services/stateService';
import { logDebug, logError, logInfo } from './loggingService';
import { FormSubmissionStatus, trackFormSubmission, updateSubmissionStatus } from './formTrackingService';
import { getAdminPhoneNumberForState } from '@/services/stateRoutingService';
import { getLeadOwnerForState } from '@/services/salesforceLeadOwnerRouting';
import {
    appendLeadOwnerSubmissionMarker,
    routeSalesforceLeadOwner,
} from '@/services/salesforceLeadOwnerService';
import { evaluateLeadSpam, tagSpamSuspected } from '@/lib/spam-protection';
import { isLeadDryRun } from '@/lib/lead-dry-run';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import { formatStateLabel, normalizeStateCode, normalizeStateSlug } from '@/lib/states';
import {
    buildAgentLeadParams,
    buildLenderLeadParams,
} from '@/services/salesforceLeadParams';
import { SF_ORG_ID, SF_RECORD_TYPE } from '@/lib/salesforce/ids';
import {
    appendSalesforceAttributionParams,
    captureLeadConversionCreated,
    captureServerAnalyticsEvent,
} from '@/lib/analytics/server';
import {
    parseLeadForm,
    simpleLeadSchema,
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
 * the guard here covers all nine forms.
 */
async function submitToSalesforceWebToLead(
    url: string,
    formBody: string,
    submissionId: string
): Promise<SalesforceSubmissionResult> {
    if (isLeadDryRun()) {
        // Dumped with console.log rather than logInfo on purpose: the structured logger
        // redacts exactly the keys a verifier needs to check here (first_name, last_name,
        // email, mobile, message, payload). Safe because isLeadDryRun() is inert in
        // production, so this line is unreachable there.
        console.log('[LEAD_DRY_RUN] Skipping Salesforce Web-to-Lead POST', {
            submissionId,
            url,
            payload: Object.fromEntries(new URLSearchParams(formBody)),
        });

        return { success: true, responseText: '', dryRun: true };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody,
            signal: controller.signal
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

        const validation = validateSalesforceResponse(responseText, submissionId);

        if (!validation.isValid) {
            const error = new Error(`Salesforce validation failed: ${validation.reason}`);
            logError('Salesforce Web-to-Lead response validation failed', {
                submissionId,
                reason: validation.reason,
                responsePreview: responseText.substring(0, 200)
            }, error);
            return { success: false, response, responseText, error };
        }

        const redirectUrl = extractSalesforceRedirectUrl(responseText);

        logInfo('Salesforce Web-to-Lead submission accepted', {
            submissionId,
            hasRedirectUrl: !!redirectUrl,
            redirectUrl
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
    }
}

function extractSalesforceRedirectUrl(responseText: string): string | undefined {
    const redirectUrlMatch = responseText.match(/window\.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
    return redirectUrlMatch ? redirectUrlMatch[1] : undefined;
}

/**
 * Validates that a Salesforce response indicates successful form submission
 */
function validateSalesforceResponse(responseText: string, submissionId: string): { isValid: boolean; reason?: string } {
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
                responsePreview: responseText.substring(0, 200)
            });
            return { isValid: false, reason: `Error indicator found: ${indicator}` };
        }
    }

    // 4. Has content, no redirect, no known error indicator → accepted. A 2xx
    //    Web-to-Lead response is the strongest safe signal we have.
    logDebug('Response has content but no Salesforce success redirect - treating accepted HTTP response as success', {
        submissionId,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
    });
    return { isValid: true };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const OPEN_PHONE_FROM_NUMBER = process.env.OPEN_PHONE_FROM_NUMBER || "";

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
    spamQuarantined: boolean;
    formId: string;
    leadSource: string;
    submissionId: string;
    formData: Record<string, unknown>;
    stateCode?: string;
    stateSlug?: string;
    partnerType?: 'agent' | 'lender';
    partnerSalesforceId?: string | null;
    guideId?: string;
}): Promise<void> {
    if (args.spamQuarantined) return;

    await captureLeadConversionCreated({
        formId: args.formId,
        leadSource: args.leadSource,
        submissionId: args.submissionId,
        formData: args.formData,
        stateCode: args.stateCode,
        stateSlug: args.stateSlug,
        partnerType: args.partnerType,
        partnerSalesforceId: args.partnerSalesforceId,
        guideId: args.guideId,
    });
}

const SALESFORCE_WEB_TO_LEAD_URL =
    "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8";

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
    effectiveState: EffectiveLeadState | null;
    agentInfo: any;
}

/**
 * Family A extras: query-string parsing, state derivation, Lead-owner routing, an agent
 * fetch, and a partner OpenPhone SMS. Present only on the two contact-partner configs.
 */
interface WebToLeadLocation {
    partner: 'agent' | 'lender';
    path: 'contact-agent' | 'contact-lender';
    leadSource: 'Contact Agent' | 'Contact Lender';
    buildSms: (ctx: WebToLeadContext) => Parameters<typeof sendOpenPhoneMessage>[0];
}

interface WebToLeadCapture {
    formId: string;
    leadSource: string;
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

function buildGetListedAgentsParams(formData: Record<string, string | undefined>): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
        recordType: SF_RECORD_TYPE.AGENT_LISTING_LEAD,
        lead_source: "Agent Listing Request",
        "00N4x00000Lsr0G": "true",
        country_code: "US",
        "00N4x00000QQ1LB": `${BASE_URL}/get-listed-agents`,
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

function buildGetListedLendersParams(formData: Record<string, string | undefined>): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
        recordType: SF_RECORD_TYPE.LENDER_LISTING_LEAD,
        lead_source: "Lender Listing Request",
        "00N4x00000Lsr0G": "true",
        country_code: "US",
        "00N4x00000QQ1LB": `${BASE_URL}/get-listed-lenders`,
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

function buildKeepInTouchParams(formData: Record<string, string | undefined>, submissionId: string): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
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

function buildContactParams(formData: Record<string, string | undefined>, submissionId: string): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
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

function buildVaLoanGuideParams(formData: Record<string, string | undefined>, submissionId: string): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
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

function buildHomebuyerGuideParams(formData: Record<string, string | undefined>, submissionId: string): URLSearchParams {
    const params = new URLSearchParams({
        oid: SF_ORG_ID,
        retURL: `${BASE_URL}/thank-you`,
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

function buildInternshipParams(formData: Record<string, string | undefined>): URLSearchParams {
    return new URLSearchParams({
        oid: SF_ORG_ID,
        recordType: SF_RECORD_TYPE.INTERNSHIP_LEAD,
        retURL: `${BASE_URL}/thank-you`,
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

/**
 * Family A partner SMS. The contact-agent and contact-lender templates are identical,
 * so both configs share this single builder.
 */
function buildContactPartnerSms(ctx: WebToLeadContext): Parameters<typeof sendOpenPhoneMessage>[0] {
    const { formData, effectiveState, agentInfo } = ctx;
    return {
        content: `New Lead From VeteranPCS:
${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formatPhoneNumberForDisplay(formData.phone!)}
Destination State: ${effectiveState!.label}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`,
        from: getAdminPhoneNumberForState(effectiveState!.slug),
        to: [formatPhoneNumberE164(agentInfo?.PersonMobilePhone || OPEN_PHONE_FROM_NUMBER)],
    };
}

/**
 * Shared notification path for all nine forms. Slack is dispatched first, then (Family A
 * only, and only when not spam-quarantined) the partner OpenPhone SMS. A rejected promise
 * or a Slack `ok !== true` result is logged uniformly instead of being swallowed.
 *
 * Dry-run choke point 2 of 2: this is the only place Slack and OpenPhone are dispatched,
 * so the guard here covers both remaining outbound sinks for all nine forms.
 */
async function dispatchNotifications(params: {
    submissionId: string;
    slackArg: Parameters<typeof sendToSlack>[0];
    smsArg?: Parameters<typeof sendOpenPhoneMessage>[0];
}): Promise<void> {
    const { submissionId, slackArg, smsArg } = params;

    if (isLeadDryRun()) {
        // See the note in submitToSalesforceWebToLead: console.log keeps the notification
        // payloads readable, and this branch cannot run in production.
        console.log('[LEAD_DRY_RUN] Skipping lead notifications', {
            submissionId,
            slack: slackArg,
            sms: smsArg,
        });

        return;
    }

    const notificationTasks: Array<{ name: 'Slack' | 'OpenPhone'; promise: Promise<unknown> }> = [
        { name: 'Slack', promise: sendToSlack(slackArg) },
    ];

    if (smsArg) {
        notificationTasks.push({ name: 'OpenPhone', promise: sendOpenPhoneMessage(smsArg) });
    }

    const notificationResults = await Promise.allSettled(
        notificationTasks.map((task) => task.promise),
    );

    // Failed channels collected here, then surfaced to PostHog after the (sync) logging pass.
    const failedNotifications: Array<{ channel: string; detail: string }> = [];

    notificationResults.forEach((result, index) => {
        // index is bounded by notificationResults, which is notificationTasks.map(...)
        // (identical length), so this element is always present.
        const task = notificationTasks[index]!;
        if (result.status === 'rejected') {
            logError(`${task.name} notification failed`, { submissionId }, result.reason);
            failedNotifications.push({ channel: task.name, detail: 'rejected' });
            return;
        }

        if (task.name === 'Slack') {
            const slackResult = result.value as { ok?: boolean; error?: unknown };
            if (slackResult?.ok !== true) {
                logError(
                    'Slack notification failed',
                    { submissionId, error: slackResult?.error },
                    new Error(`Slack returned ok=${String(slackResult?.ok)}`),
                );
                failedNotifications.push({ channel: 'Slack', detail: `ok=${String(slackResult?.ok)}` });
                return;
            }
        }

        logInfo(`${task.name} notification accepted`, { submissionId });
    });

    // Route lead-critical notification failures to PostHog so an accepted lead that never
    // reached the team/partner is a queryable funnel drop. Awaited (not fire-and-forget) so
    // the event flushes before the serverless invocation ends; wrapped so a capture failure
    // can't turn a logged notification hiccup into a thrown request error.
    for (const failure of failedNotifications) {
        try {
            await captureServerAnalyticsEvent({
                event: 'lead_notification_failed',
                distinctId: submissionId,
                properties: {
                    submission_id: submissionId,
                    channel: failure.channel,
                    failure_detail: failure.detail,
                },
            });
        } catch (captureError) {
            logError('PostHog lead_notification_failed capture failed', { submissionId }, captureError);
        }
    }
}

/**
 * Single Web-to-Lead submission engine shared by all nine lead forms. The nine exports
 * are thin wrappers around this: their differences live entirely in the config they pass.
 */
async function submitWebToLead<TResult extends object>(
    config: WebToLeadConfig<TResult>,
    rawFormData: unknown,
    runtime?: { queryString?: string; options?: InternalCallOptions },
): Promise<TResult> {
    const options = runtime?.options;
    const queryString = runtime?.queryString ?? '';

    const submissionId = await trackFormSubmission(
        config.formType,
        // Pre-validation, untrusted payload — logged only via truthiness checks.
        rawFormData as Record<string, unknown>,
        FormSubmissionStatus.PENDING,
    );

    logInfo(config.processingMessage, { submissionId });

    try {
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

        // Family A: parse the query string, derive the effective state (hard reject if
        // missing), and resolve the Lead owner for routing.
        let paramsObj: Record<string, string> = {};
        let effectiveState: EffectiveLeadState | null = null;
        let leadOwner: ReturnType<typeof getLeadOwnerForState> | null = null;
        if (config.location) {
            new URLSearchParams(queryString).forEach((value, key) => {
                paramsObj[key] = value;
            });

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
            leadOwner = getLeadOwnerForState(effectiveState.slug);
        }

        // Soft-quarantine spam-suspected leads: still written to Salesforce, but tagged so
        // the team can filter them and partner SMS is suppressed below. Never drop a real lead.
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

        // Family A: fetch partner (agent/lender) information if an id is provided.
        let agentInfo: any = null;
        let webFormUrl = '';
        if (config.location) {
            if (paramsObj.id) {
                try {
                    agentInfo = await stateService.fetchAgentById(paramsObj.id);
                    logDebug('Partner information fetched successfully', {
                        partner_id: paramsObj.id,
                        submissionId,
                    });
                } catch (error) {
                    logError('Error fetching partner information', {
                        partner_id: paramsObj.id,
                        submissionId,
                    }, error);
                }
            }

            webFormUrl = appendLeadOwnerSubmissionMarker(
                `${BASE_URL}/${config.location.path}${queryString}`,
                submissionId,
            );
        }

        const ctx: WebToLeadContext = {
            formData,
            spam,
            submissionId,
            paramsObj,
            webFormUrl,
            effectiveState,
            agentInfo,
        };

        const formBody = config.buildParams(ctx).toString();

        // Resolved once per submission so the Salesforce POST, the Lead-owner routing, and
        // the returned marker all agree. Inert in production by construction, see the
        // invariant on isLeadDryRun().
        const dryRun = isLeadDryRun();

        logDebug('Sending form data to Salesforce Web-to-Lead', {
            submissionId,
            url: SALESFORCE_WEB_TO_LEAD_URL,
        });

        const submissionStartedAt = new Date();
        const submissionResult = await submitToSalesforceWebToLead(
            SALESFORCE_WEB_TO_LEAD_URL,
            formBody,
            submissionId,
        );

        if (!submissionResult.success) {
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed'),
            );

            logError('Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message,
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        // Family A: post-acceptance Lead-owner routing. Its failure is LOGGED, not thrown,
        // so a routing hiccup never costs the visitor a successful submission. Skipped in a
        // dry run: it writes to the Salesforce org, and no Lead was created to route.
        if (config.location && leadOwner && !dryRun) {
            try {
                await routeSalesforceLeadOwner({
                    submissionId,
                    submissionStartedAt,
                    leadSource: config.location.leadSource,
                    destinationStateCode: effectiveState!.code,
                    destinationStateSlug: effectiveState!.slug,
                    email: formData.email,
                    ...(config.location.partner === 'agent'
                        ? { selectedAgentId: paramsObj.id || null }
                        : { selectedLenderId: paramsObj.id || null }),
                    owner: leadOwner,
                });
            } catch (ownerRoutingError) {
                logError('Salesforce Lead owner routing failed after Web-to-Lead acceptance', {
                    submissionId,
                    leadSource: config.location.leadSource,
                    destinationStateCode: effectiveState!.code,
                    destinationStateSlug: effectiveState!.slug,
                    adminName: leadOwner.adminName,
                    ownerId: leadOwner.ownerId,
                }, ownerRoutingError);

                // Surface this lead-critical failure to PostHog so "accepted but never routed"
                // is a queryable funnel drop, not just a log line. Wrapped so a capture hiccup
                // can't undo the guarantee that routing failures never cost a successful submit.
                try {
                    await captureServerAnalyticsEvent({
                        event: 'lead_owner_routing_failed',
                        distinctId: submissionId,
                        properties: {
                            submission_id: submissionId,
                            lead_source: config.location.leadSource,
                            state_code: effectiveState!.code,
                            state_slug: effectiveState!.slug,
                        },
                    });
                } catch (captureError) {
                    logError('PostHog lead_owner_routing_failed capture failed', { submissionId }, captureError);
                }
            }
        }

        // Notifications: Slack always; partner SMS only for Family A, suppressed for spam.
        await dispatchNotifications({
            submissionId,
            slackArg: config.buildSlack(ctx),
            smsArg: config.location && !spam.quarantine ? config.location.buildSms(ctx) : undefined,
        });

        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response,
        );

        if (config.capture) {
            await captureAcceptedCustomerLead({
                spamQuarantined: spam.quarantine,
                formId: config.capture.formId,
                leadSource: config.capture.leadSource,
                submissionId,
                formData,
                ...(config.location
                    ? {
                        stateCode: effectiveState?.code,
                        stateSlug: effectiveState?.slug,
                        partnerType: config.capture.partnerType,
                        partnerSalesforceId: paramsObj.id || null,
                    }
                    : {}),
                ...(config.capture.guideId ? { guideId: config.capture.guideId } : {}),
            });
        }

        logInfo('Form submitted successfully', { submissionId, hasRedirectUrl: !!redirectUrl });

        const result = config.buildResult(redirectUrl, submissionId);

        // A dry run returns the real success shape so callers exercise the real success path,
        // but carries an explicit marker so nothing can mistake it for a real submission.
        return dryRun ? { ...result, dryRun: true as const } : result;
    } catch (error) {
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error'),
        );

        logError(`Error in ${config.formType} submission`, { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

// ── Per-form configs + thin wrappers (nine exports, signatures unchanged) ────────────

const contactAgentConfig = defineWebToLeadConfig({
    formType: 'contactAgent',
    processingMessage: 'Processing contact agent form submission',
    schema: contactAgentSchema,
    spamFreeTextField: 'additionalComments',
    location: {
        partner: 'agent',
        path: 'contact-agent',
        leadSource: 'Contact Agent',
        buildSms: buildContactPartnerSms,
    },
    buildParams: (ctx) =>
        buildAgentLeadParams(ctx.formData, ctx.paramsObj, ctx.webFormUrl, BASE_URL, ctx.submissionId),
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
        leadSource: 'Contact Lender',
        buildSms: buildContactPartnerSms,
    },
    buildParams: (ctx) =>
        buildLenderLeadParams(ctx.formData, ctx.paramsObj, ctx.webFormUrl, BASE_URL, ctx.submissionId),
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
    buildParams: (ctx) => buildGetListedAgentsParams(ctx.formData),
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
    buildParams: (ctx) => buildGetListedLendersParams(ctx.formData),
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
    buildParams: (ctx) => buildKeepInTouchParams(ctx.formData, ctx.submissionId),
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
    buildParams: (ctx) => buildContactParams(ctx.formData, ctx.submissionId),
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
    buildParams: (ctx) => buildVaLoanGuideParams(ctx.formData, ctx.submissionId),
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
    buildParams: (ctx) => buildHomebuyerGuideParams(ctx.formData, ctx.submissionId),
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

const internshipConfig = defineWebToLeadConfig({
    formType: 'internship',
    processingMessage: 'Processing internship form submission',
    schema: internshipSchema,
    spamFreeTextField: '00N4x00000QPS7V',
    buildParams: (ctx) => buildInternshipParams(ctx.formData),
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
