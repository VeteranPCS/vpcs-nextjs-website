'use server'
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { formatPhoneNumberForDisplay, formatPhoneNumberE164 } from '@/utils/formatPhoneNumber';
import stateService from '@/services/stateService';
import { logDebug, logError, logInfo } from './loggingService';
import { FormSubmissionStatus, trackFormSubmission, updateSubmissionStatus } from './formTrackingService';
import { getAdminPhoneNumberForState } from '@/services/stateRoutingService';
import { evaluateLeadSpam, tagSpamSuspected } from '@/lib/spam-protection';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
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
}

/**
 * Submit once to Salesforce Web-to-Lead.
 *
 * Web-to-Lead is not idempotent: a 2xx response can create a Lead even when the
 * response body is missing, unexpected, or does not contain the normal redirect
 * script. Retrying after any response can create duplicate Leads, so this helper
 * intentionally performs exactly one POST.
 */
async function submitToSalesforceWebToLead(
    url: string,
    formBody: string,
    submissionId: string
): Promise<SalesforceSubmissionResult> {
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

export async function contactAgentPostForm(formData: any, queryString: string, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'contactAgent',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing contact agent form submission', {
        submissionId,
        agent_id: new URLSearchParams(queryString).get('id')
    });

    try {
        // Validate and normalize the payload before processing. Invalid data (no usable
        // email or phone, etc.) is a HARD reject below — never written to Salesforce.
        const validation = parseLeadForm(contactAgentSchema, formData);
        if (!validation.ok) {
            logError('Invalid contactAgent submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: still written to Salesforce, but tagged so the
        // team can filter them and partner SMS is suppressed below. Never drop a real lead.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData.additionalComments,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'contactAgent', reasons: spam.reasons });
            formData.additionalComments = tagSpamSuspected(formData.additionalComments);
        }

        const paramsObj: { [key: string]: string } = {};
        new URLSearchParams(queryString).forEach((value, key) => {
            paramsObj[key] = value;
        });

        // Fetch agent information if ID is provided
        let agentInfo = null;
        if (paramsObj.id) {
            try {
                agentInfo = await stateService.fetchAgentById(paramsObj.id);
                logDebug('Agent information fetched successfully', {
                    agent_id: paramsObj.id,
                    submissionId
                });
            } catch (error) {
                logError('Error fetching agent information', {
                    agent_id: paramsObj.id,
                    submissionId
                }, error);
            }
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `${BASE_URL}/thank-you`,
            "00N4x00000Lsn28": paramsObj.id || "",
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            "00N4x00000Lsr0G": "true",
            country_code: "US",
            "00N4x00000QQ1LB": `${BASE_URL}/contact-agent${queryString}`,
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            mobile: formData.phone || "",
            "00N4x00000Lpb0T": formData.currentBase || "",
            "00N4x00000LspUs": formData.destinationBase || "",
            "00N4x00000QPksj": formData.howDidYouHear || "",
            "00N4x00000QPS7V": formData.tellusMore || "",
            "00N4x00000bfgFA": formData.additionalComments || "",
            "00N4x00000LsnP2": formData.status_select || "",
            "00N4x00000LsnOx": formData.branch_select || "",
            "00N4x00000QQ0Vz": formData.discharge_status || "",
            "00N4x00000LspV2": formData.state || "",
            "00N4x00000LspUi": formData.city || "",
            "00N4x00000LsaDm": formData.buyingSelling || "",
            "00N4x00000cKsNF": formData.timeframe || "",
            "00N4x00000LssBZ": formData.typeOfHome || "",
            "00N4x00000Lpb2K": formData.bedrooms || "",
            "00N4x00000Lpb2Z": formData.bathrooms || "",
            "00N4x00000LsaCy": formData.maxPrice || "",
            "00N4x00000Lpbfw": formData.preApproval || "",
            "g-recaptcha-response": "",
            "captcha_settings": "",
        }).toString();

        logDebug('Sending form data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        const notificationTasks: Array<{ name: 'Slack' | 'OpenPhone'; promise: Promise<unknown> }> = [
            {
                name: 'Slack',
                promise: sendToSlack({
                    headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Agent Lead' : '🔔 New Agent Lead',
                    name: `${formData.firstName} ${formData.lastName}` || "",
                    email: formData.email || "",
                    phoneNumber: formData.phone || "",
                    message: formData.additionalComments || "",
                    agentInfo: agentInfo ? {
                        name: agentInfo.Name || "",
                        email: agentInfo.PersonEmail || "",
                        phoneNumber: agentInfo.PersonMobilePhone || "",
                        brokerage: agentInfo.Brokerage_Name__pc,
                        state: paramsObj.state
                    } : undefined
                }),
            },
        ];

        // Suppress partner SMS for spam-suspected leads so spammers can't trigger partner outreach.
        if (!spam.quarantine) {
            notificationTasks.push({
                name: 'OpenPhone',
                promise: sendOpenPhoneMessage({
                    content: `New Lead From VeteranPCS:
${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formatPhoneNumberForDisplay(formData.phone)}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`,
                    from: getAdminPhoneNumberForState(paramsObj.state),
                    to: [formatPhoneNumberE164(agentInfo?.PersonMobilePhone || OPEN_PHONE_FROM_NUMBER)]
                }),
            });
        }

        const notificationResults = await Promise.allSettled(
            notificationTasks.map((task) => task.promise)
        );

        notificationResults.forEach((result, index) => {
            const task = notificationTasks[index];
            if (result.status === 'rejected') {
                logError(`${task.name} notification failed`, { submissionId }, result.reason);
                return;
            }

            if (task.name === 'Slack') {
                const slackResult = result.value as { ok?: boolean; error?: unknown };
                if (slackResult?.ok !== true) {
                    logError(
                        'Slack notification failed',
                        { submissionId, error: slackResult?.error },
                        new Error(`Slack returned ok=${String(slackResult?.ok)}`)
                    );
                    return;
                }
            }

            logInfo(`${task.name} notification accepted`, { submissionId });
        });

        // At this point, we know the submission was successful based on our enhanced validation
        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        if (redirectUrl) {
            logInfo('Form submitted successfully with redirect URL', {
                submissionId,
                redirectUrl
            });
            return { redirectUrl };
        }

        logInfo('Form submitted successfully', { submissionId });
        return { message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in contactAgentPostForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function GetListedAgentsPostForm(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'getListedAgents',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing agent listing form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(getListedAgentsSchema, formData);
        if (!validation.ok) {
            logError('Invalid getListedAgents submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: written to Salesforce but tagged on the free-text field.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData.tellusMore,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'getListedAgents', reasons: spam.reasons });
            formData.tellusMore = tagSpamSuspected(formData.tellusMore);
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `${BASE_URL}/thank-you`,
            recordType: "0124x000000Z5yI",
            lead_source: "Website",
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
        }).toString();

        logDebug('Sending agent listing data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Agent listing Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit agent listing to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Agent Listing Request' : '🔔 New Agent Listing Request',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending agent listing notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        if (redirectUrl) {
            logInfo('Agent listing form submitted with redirect URL', {
                submissionId,
                redirectUrl
            });
            return { redirectUrl };
        }

        logInfo('Agent listing form submitted successfully', { submissionId });
        return { message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in GetListedAgentsPostForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function GetListedLendersPostForm(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'getListedLenders',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing lender listing form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(getListedLendersSchema, formData);
        if (!validation.ok) {
            logError('Invalid getListedLenders submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: written to Salesforce but tagged on the free-text field.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData.tellusMore,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'getListedLenders', reasons: spam.reasons });
            formData.tellusMore = tagSpamSuspected(formData.tellusMore);
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `${BASE_URL}/thank-you`,
            recordType: "0124x000000ZGGU",
            lead_source: "Website",
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
        }).toString();

        logDebug('Sending lender listing data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Lender listing Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit lender listing to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Lender Listing Request' : '🔔 New Lender Listing Request',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending lender listing notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        if (redirectUrl) {
            logInfo('Lender listing form submitted with redirect URL', {
                submissionId,
                redirectUrl
            });
            return { redirectUrl };
        }

        logInfo('Lender listing form submitted successfully', { submissionId });
        return { message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in GetListedLendersPostForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function KeepInTouchForm(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'keepInTouch',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing keep in touch form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(simpleLeadSchema, formData);
        if (!validation.ok) {
            logError('Invalid keepInTouch submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // No free-text field on this form — the flagged Slack header below is the spam signal.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'keepInTouch', reasons: spam.reasons });
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            "g-recaptcha-response": "",
            "captcha_settings": "",
        }).toString();

        logDebug('Sending keep in touch data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Keep in touch Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit keep in touch form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Keep In Touch Submission' : '🔔 New Keep In Touch Submission',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending keep in touch notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        logInfo('Keep in touch form submitted successfully', { submissionId });
        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in KeepInTouchForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function contactLenderPostForm(formData: any, fullQueryString: string, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'contactLender',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing contact lender form submission', {
        submissionId,
        lender_id: new URLSearchParams(fullQueryString).get('id')
    });

    try {
        // Validate and normalize the payload before processing. Invalid data (no usable
        // email or phone, etc.) is a HARD reject below — never written to Salesforce.
        const validation = parseLeadForm(contactLenderSchema, formData);
        if (!validation.ok) {
            logError('Invalid contactLender submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: tagged in Salesforce, partner SMS suppressed below.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData.additionalComments,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'contactLender', reasons: spam.reasons });
            formData.additionalComments = tagSpamSuspected(formData.additionalComments);
        }

        const paramsObj: { [key: string]: string } = {};
        new URLSearchParams(fullQueryString).forEach((value, key) => {
            paramsObj[key] = value;
        });

        // Fetch agent information if ID is provided
        let agentInfo = null;
        if (paramsObj.id) {
            try {
                agentInfo = await stateService.fetchAgentById(paramsObj.id);
                logDebug('Lender information fetched successfully', {
                    lender_id: paramsObj.id,
                    submissionId
                });
            } catch (error) {
                logError('Error fetching lender information', {
                    lender_id: paramsObj.id,
                    submissionId
                }, error);
            }
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `${BASE_URL}/thank-you`,
            "00N4x00000QPJUT": paramsObj.id || "",
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            "00N4x00000Lsr0G": "true",
            country_code: "US",
            "00N4x00000QQ1LB": `${BASE_URL}/contact-lender${fullQueryString}`,
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            mobile: formData.phone || "",
            "00N4x00000LspUs": formData.currentBase || "",
            "00N4x00000QPksj": formData.howDidYouHear || "",
            "00N4x00000QPS7V": formData.tellusMore || "",
            "00N4x00000bfgFA": formData.additionalComments || "",
            "g-recaptcha-response": "",
            "captcha_settings": "",
        }).toString();

        logDebug('Sending lender form data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Lender form Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit lender form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        // Fire and forget notifications - don't await them
        await Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Lender Lead' : '🔔 New Lender Lead',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
                agentInfo: agentInfo ? {
                    name: agentInfo.Name || "",
                    email: agentInfo.PersonEmail || "",
                    phoneNumber: agentInfo.PersonMobilePhone || "",
                    brokerage: agentInfo.Brokerage_Name__pc,
                    state: paramsObj.state
                } : undefined
            }),
            // Suppress partner SMS for spam-suspected leads so spammers can't trigger partner outreach.
            ...(spam.quarantine ? [] : [sendOpenPhoneMessage({
                content: `New Lead From VeteranPCS:
${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formatPhoneNumberForDisplay(formData.phone)}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`,
                from: getAdminPhoneNumberForState(paramsObj.state),
                to: [formatPhoneNumberE164(agentInfo?.PersonMobilePhone || OPEN_PHONE_FROM_NUMBER)]
            })]),
        ]).catch(error => {
            // Log any errors but don't block the main flow
            logError('Error sending lender notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        if (redirectUrl) {
            logInfo('Lender form submitted successfully with redirect URL', {
                submissionId,
                redirectUrl
            });
            return { redirectUrl };
        }

        logInfo('Lender form submitted successfully', { submissionId });
        return { message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in contactLenderPostForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function contactPostForm(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'contact',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing contact form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(simpleLeadSchema, formData);
        if (!validation.ok) {
            logError('Invalid contact submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: written to Salesforce but tagged on the free-text field.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData.additionalComments,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'contact', reasons: spam.reasons });
            formData.additionalComments = tagSpamSuspected(formData.additionalComments);
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            "00N4x00000bfgFA": formData.additionalComments || "",
            "g-recaptcha-response": "",
            "captcha_settings": "",
        }).toString();

        logDebug('Sending contact form data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Contact form Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit contact form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Contact Form Submission' : '🔔 New Contact Form Submission',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending contact form notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        logInfo('Contact form submitted successfully', { submissionId });
        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in contactPostForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function vaLoanGuideForm(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'vaLoanGuide',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing VA loan guide form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(simpleLeadSchema, formData);
        if (!validation.ok) {
            logError('Invalid vaLoanGuide submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // No free-text field on this form — the flagged Slack header below is the spam signal.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'vaLoanGuide', reasons: spam.reasons });
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            "g-recaptcha-response": "",
            "captcha_settings": "",
        }).toString();

        logDebug('Sending VA loan guide data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('VA loan guide Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit VA loan guide form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New VA Loan Guide Download' : '🔔 New VA Loan Guide Download',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending VA loan guide notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        logInfo('VA loan guide form submitted successfully', { submissionId });
        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in vaLoanGuideForm', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}

export async function internshipFormSubmission(formData: any, options?: InternalCallOptions) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'internship',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing internship form submission', { submissionId });

    try {
        // Validate and normalize the payload before processing (HARD reject on invalid data).
        const validation = parseLeadForm(internshipSchema, formData);
        if (!validation.ok) {
            logError('Invalid internship submission', { submissionId, errors: validation.errors });
            throw new Error(`Invalid form data: ${validation.errors.join('; ')}`);
        }
        formData = validation.data;

        // Soft-quarantine spam-suspected leads: written to Salesforce but tagged on the free-text field.
        const spam = await evaluateLeadSpam({
            email: formData.email,
            freeText: formData['00N4x00000QPS7V'],
            honeypot: formData[HP_FIELD],
            renderedAt: formData[TS_FIELD],
            options,
        });
        if (spam.quarantine) {
            logError('Spam-suspected submission', { submissionId, form: 'internship', reasons: spam.reasons });
            formData['00N4x00000QPS7V'] = tagSpamSuspected(formData['00N4x00000QPS7V']);
        }

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            recordType: "0124x000000ZGKv",
            retURL: `${BASE_URL}/thank-you`,
            lead_source: "Website",
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
        }).toString();

        logDebug('Sending internship form data to Salesforce Web-to-Lead', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        const submissionResult = await submitToSalesforceWebToLead(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Internship form Salesforce Web-to-Lead submission failed', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit internship form to Salesforce');
        }

        const { response, redirectUrl } = submissionResult;

        Promise.all([
            sendToSlack({
                headerText: spam.quarantine ? '⚠️ SPAM-SUSPECTED — 🔔 New Internship Submission' : '🔔 New Internship Submission',
                name: `${formData.first_name} ${formData.last_name}`,
                email: formData.email || "",
                phoneNumber: formData.mobile || "",
                message: "",
            })
        ]).catch(error => {
            logError('Error sending internship notifications', { submissionId }, error);
        });

        // Track the successful submission
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.SUCCESS,
            response
        );

        if (redirectUrl) {
            logInfo('Internship form submitted with redirect URL', {
                submissionId,
                redirectUrl
            });
            return { redirectUrl };
        }

        logInfo('Internship form submitted successfully', { submissionId });
        return { message: 'Form submitted successfully!' };
    } catch (error) {
        // If this is an unknown error that wasn't caught earlier,
        // make sure to update the submission status
        await updateSubmissionStatus(
            submissionId,
            FormSubmissionStatus.FAILURE,
            null,
            error instanceof Error ? error : new Error('Unknown error')
        );

        logError('Error in internshipFormSubmission', { submissionId }, error);
        throw new Error('Failed to submit form');
    }
}
