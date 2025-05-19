import { logError, logInfo } from './loggingService';

// Form submission status
export enum FormSubmissionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

// Structure of a form submission record (kept for typing purposes)
export interface FormSubmissionRecord {
    id: string;
    formType: string;
    timestamp: string;
    status: FormSubmissionStatus;
    formData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        hasPhone?: boolean;
        currentBase?: string;
        destinationBase?: string;
    };
    responseCode?: number;
    responseText?: string;
    errorMessage?: string;
}

/**
 * Tracks a form submission attempt - server-side logging only
 */
export async function trackFormSubmission(
    formType: string,
    formData: any,
    status: FormSubmissionStatus = FormSubmissionStatus.PENDING,
    response?: Response | any,
    error?: Error
): Promise<string> {
    // Generate submission ID
    const submissionId = generateSubmissionId();

    try {
        // Log the form submission
        const logData = {
            id: submissionId,
            formType,
            status,
            formData: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                hasPhone: !!formData.phone,
                currentBase: formData.currentBase,
                destinationBase: formData.destinationBase,
            },
            timestamp: new Date().toISOString(),
            responseCode: response?.status,
            responseText: response?.statusText || (response?.ok ? 'OK' : undefined),
            errorMessage: error?.message,
        };

        logInfo(`Form submission started: ${formType}`, logData);
        return submissionId;
    } catch (logError) {
        console.error('Failed to log form submission:', logError);
        return submissionId; // Still return the ID even if logging failed
    }
}

/**
 * Updates an existing submission record with results
 */
export async function updateSubmissionStatus(
    submissionId: string,
    status: FormSubmissionStatus,
    response?: Response | any,
    error?: Error
): Promise<boolean> {
    try {
        // Just log the update to server logs
        const updateInfo = {
            submissionId,
            status,
            timestamp: new Date().toISOString(),
            responseCode: response?.status,
            responseText: response?.statusText || (response?.ok ? 'OK' : undefined),
            errorMessage: error?.message,
        };

        if (status === FormSubmissionStatus.SUCCESS) {
            logInfo(`Form submission successful [${submissionId}]`, updateInfo);
        } else if (status === FormSubmissionStatus.FAILURE) {
            logError(`Form submission failed [${submissionId}]`, updateInfo, error || new Error('Unknown error'));
        } else {
            logInfo(`Form submission status updated [${submissionId}]: ${status}`, updateInfo);
        }

        return true;
    } catch (updateError) {
        console.error('Failed to log submission status update:', updateError);
        return false;
    }
}

// The following functions remain as stubs for API compatibility
// but don't do anything since the admin page is removed

export function getRecentSubmissions(): FormSubmissionRecord[] {
    return [];
}

export function getSubmissionById(): FormSubmissionRecord | null {
    return null;
}

export function clearSubmissions(): void {
    // No-op
}

// Generate a unique ID for submissions
function generateSubmissionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
} 