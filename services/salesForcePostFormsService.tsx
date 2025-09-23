'use server'
import sendToSlack from '@/actions/sendToSlack';
import { sendOpenPhoneMessage } from '@/actions/sendOpenPhoneMessage';
import { formatPhoneNumberForDisplay, formatPhoneNumberE164 } from '@/utils/formatPhoneNumber';
import stateService from '@/services/stateService';
import { logDebug, logError, logInfo } from './loggingService';
import { FormSubmissionStatus, trackFormSubmission, updateSubmissionStatus } from './formTrackingService';
import { getAdminPhoneNumberForState } from '@/services/stateRoutingService';

interface SalesforceSubmissionResult {
    success: boolean;
    response?: Response;
    responseText?: string;
    redirectUrl?: string;
    error?: Error;
}

/**
 * Enhanced Salesforce submission with retry logic and proper success validation
 */
async function submitToSalesforceWithRetry(
    url: string,
    formBody: string,
    submissionId: string,
    maxRetries = 3,
    baseDelay = 1000
): Promise<SalesforceSubmissionResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logDebug(`Salesforce submission attempt ${attempt}/${maxRetries}`, { submissionId });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            logInfo(`Salesforce response received (attempt ${attempt})`, {
                submissionId,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Basic HTTP error check
            if (!response.ok) {
                const error = new Error(`Salesforce HTTP error: ${response.status} ${response.statusText}`);
                logError(`HTTP error on attempt ${attempt}`, { submissionId, status: response.status }, error);
                lastError = error;

                // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
                if (response.status >= 400 && response.status < 500) {
                    return { success: false, response, error };
                }

                // Retry on 5xx errors
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
                    continue;
                }

                return { success: false, response, error };
            }

            // Read response text for further validation
            let responseText: string;
            try {
                responseText = await response.text();
                logDebug(`Response text received (attempt ${attempt})`, {
                    submissionId,
                    responseLength: responseText.length,
                    hasContent: responseText.length > 0
                });
            } catch (textError) {
                const error = new Error('Failed to read response text from Salesforce');
                logError(`Failed to read response text on attempt ${attempt}`, { submissionId }, textError);
                lastError = error;

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
                    continue;
                }

                return { success: false, response, error };
            }

            // Validate Salesforce success - look for success indicators
            const isValidSalesforceResponse = validateSalesforceResponse(responseText, submissionId);

            if (!isValidSalesforceResponse.isValid) {
                const error = new Error(`Salesforce validation failed: ${isValidSalesforceResponse.reason}`);
                logError(`Response validation failed on attempt ${attempt}`, {
                    submissionId,
                    reason: isValidSalesforceResponse.reason,
                    responsePreview: responseText.substring(0, 200)
                }, error);
                lastError = error;

                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
                    continue;
                }

                return { success: false, response, responseText, error };
            }

            // Extract redirect URL if present
            const redirectUrlMatch = responseText.match(/window\.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
            const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : undefined;

            logInfo(`Salesforce submission successful on attempt ${attempt}`, {
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
                logError(`Request timeout on attempt ${attempt}`, { submissionId }, error);
            } else {
                logError(`Network error on attempt ${attempt}`, { submissionId }, error);
            }

            lastError = error;

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logInfo(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, { submissionId });
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }
    }

    // All retries exhausted
    logError(`All ${maxRetries} submission attempts failed`, { submissionId }, lastError);
    return { success: false, error: lastError || new Error('Max retries reached') };
}

/**
 * Validates that a Salesforce response indicates successful form submission
 */
function validateSalesforceResponse(responseText: string, submissionId: string): { isValid: boolean; reason?: string } {
    if (!responseText || responseText.trim().length === 0) {
        return { isValid: false, reason: 'Empty response from Salesforce' };
    }

    // Check for explicit error indicators in the response
    const errorIndicators = [
        'error occurred',
        'invalid',
        'required field',
        'unable to create',
        'failed to submit',
        'system error',
        'temporarily unavailable'
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

    // Check for success indicators
    const successIndicators = [
        'window.location', // Redirect script indicates success
        'thank', // Thank you pages
        'success',
        'submitted',
        'received'
    ];

    for (const indicator of successIndicators) {
        if (lowerResponseText.includes(indicator)) {
            logDebug('Found success indicator in response', {
                submissionId,
                indicator
            });
            return { isValid: true };
        }
    }

    // If response is very short (< 100 chars), it might be an error
    if (responseText.length < 100) {
        return { isValid: false, reason: 'Response too short, possibly an error' };
    }

    // If we get here, assume it's valid (benefit of the doubt)
    logDebug('Response validation passed by default', {
        submissionId,
        responseLength: responseText.length
    });
    return { isValid: true };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const OPEN_PHONE_FROM_NUMBER = process.env.OPEN_PHONE_FROM_NUMBER || "";

export async function contactAgentPostForm(formData: any, queryString: string) {
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
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();

        logDebug('Sending form data to Salesforce with retry logic', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formKeys: Object.keys(Object.fromEntries(new URLSearchParams(formBody)))
        });

        // Use enhanced submission with retry logic
        const submissionResult = await submitToSalesforceWithRetry(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            formBody,
            submissionId,
            3, // maxRetries
            1000 // baseDelay in ms
        );

        if (!submissionResult.success) {
            // Track the failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                submissionResult.response || null,
                submissionResult.error || new Error('Salesforce submission failed')
            );

            logError('Salesforce submission failed after all retries', {
                submissionId,
                error: submissionResult.error?.message
            }, submissionResult.error);

            throw submissionResult.error || new Error('Failed to submit form to Salesforce');
        }

        const { response, responseText, redirectUrl } = submissionResult;

        // Fire and forget notifications - don't await them
        await Promise.all([
            sendToSlack({
                headerText: '🔔 New Agent Lead',
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
            sendOpenPhoneMessage({
                content: `New Lead From VeteranPCS:
${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formatPhoneNumberForDisplay(formData.phone)}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`,
                from: getAdminPhoneNumberForState(paramsObj.state),
                to: [formatPhoneNumberE164(agentInfo?.PersonMobilePhone || OPEN_PHONE_FROM_NUMBER)]
            })
        ]).catch(error => {
            // Log any errors but don't block the main flow
            logError('Error sending notifications', { submissionId }, error);
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

export async function GetListedAgentsPostForm(formData: any) {
    // Start tracking the submission
    const submissionId = await trackFormSubmission(
        'getListedAgents',
        formData,
        FormSubmissionStatus.PENDING
    );

    logInfo('Processing agent listing form submission', { submissionId });

    try {
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
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();

        logDebug('Sending agent listing data to Salesforce', {
            submissionId,
            url: "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8"
        });

        let response;
        try {
            response = await fetch(
                "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formBody,
                }
            );

            logInfo('Received response from Salesforce for agent listing', {
                submissionId,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
        } catch (fetchError) {
            // Track the network failure
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                null,
                fetchError instanceof Error ? fetchError : new Error('Network request failed')
            );

            logError('Network error while submitting agent listing to Salesforce', {
                submissionId
            }, fetchError);

            throw fetchError;
        }

        Promise.all([
            sendToSlack({
                headerText: '🔔 New Agent Listing Request',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]).catch(error => {
            logError('Error sending agent listing notifications', { submissionId }, error);
        });

        if (!response.ok) {
            // Track the unsuccessful response
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.FAILURE,
                response,
                new Error(`Salesforce API error: ${response.status}`)
            );

            logError('Received unsuccessful response from Salesforce for agent listing', {
                submissionId,
                status: response.status
            });

            throw new Error(`Error: ${response.status}`);
        }

        // At this point, the request to Salesforce was successful
        let data;
        try {
            data = await response.text();
            logDebug('Received text response from Salesforce for agent listing', {
                submissionId,
                responseLength: data.length
            });
        } catch (textError) {
            // Log the error but don't fail the submission since the POST was successful
            logError('Error reading response text for agent listing', { submissionId }, textError);

            // Track successful submission even though we couldn't read the response text
            await updateSubmissionStatus(
                submissionId,
                FormSubmissionStatus.SUCCESS,
                response
            );

            return { message: 'Form submitted successfully!' };
        }

        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

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

export async function GetListedLendersPostForm(formData: any) {
    try {
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
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();


        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        Promise.all([
            sendToSlack({
                headerText: '🔔 New Lender Listing Request',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function KeepInTouchForm(formData: any) {

    const formBody = new URLSearchParams({
        oid: "00D4x000003yaV2",
        recordType: "0124x000000Z5yD",
        lead_source: "Website",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "g-recaptcha-response": formData.captchaToken || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        Promise.all([
            sendToSlack({
                headerText: '🔔 New Keep In Touch Submission',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        };

        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function contactLenderPostForm(formData: any, fullQueryString: string) {
    const paramsObj: { [key: string]: string } = {};
    new URLSearchParams(fullQueryString).forEach((value, key) => {
        paramsObj[key] = value;
    });

    let agentInfo = null;
    console.log(paramsObj.id);
    if (paramsObj.id) {
        try {
            agentInfo = await stateService.fetchAgentById(paramsObj.id);
        } catch (error) {
            console.error('Error fetching agent information:', error);
        }
    }
    console.log(agentInfo);

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
        "g-recaptcha-response": formData.captchaToken || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        // Fire and forget notifications - don't await them
        Promise.all([
            sendToSlack({
                headerText: '🔔 New Lender Lead',
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
            sendOpenPhoneMessage({
                content: `New Lead From VeteranPCS:
${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formatPhoneNumberForDisplay(formData.phone)}
${formData.currentBase ? `Current Base: ${formData.currentBase}` : ''}
${formData.destinationBase ? `Destination Base: ${formData.destinationBase}` : ''}
${formData.additionalComments ? `Additional Comments: ${formData.additionalComments}` : ''}`,
                from: getAdminPhoneNumberForState(paramsObj.state),
                to: [formatPhoneNumberE164(agentInfo?.PersonMobilePhone || OPEN_PHONE_FROM_NUMBER)]
            })
        ]).catch(error => {
            // Log any errors but don't block the main flow
            console.error('Error sending notifications:', error);
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function contactPostForm(formData: any) {
    const formBody = new URLSearchParams({
        oid: "00D4x000003yaV2",
        recordType: "0124x000000Z5yD",
        lead_source: "Website",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "00N4x00000bfgFA": formData.additionalComments || "",
        "g-recaptcha-response": formData.captchaToken || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        Promise.all([
            sendToSlack({
                headerText: '🔔 New Contact Form Submission',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        };

        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function vaLoanGuideForm(formData: any) {
    const formBody = new URLSearchParams({
        oid: "00D4x000003yaV2",
        recordType: "0124x000000Z5yD",
        lead_source: "Website",
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        "g-recaptcha-response": formData.captchaToken || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        Promise.all([
            sendToSlack({
                headerText: '🔔 New VA Loan Guide Download',
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email || "",
                phoneNumber: formData.phone || "",
                message: formData.additionalComments || "",
            })
        ]);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        };

        return { success: true, message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function internshipFormSubmission(formData: any) {
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
        "g-recaptcha-response": formData["g-recaptcha-response"] || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        Promise.all([
            sendToSlack({
                headerText: '🔔 New Internship Submission',
                name: `${formData.first_name} ${formData.last_name}`,
                email: formData.email || "",
                phoneNumber: formData.mobile || "",
                message: "",
            })
        ]);

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

