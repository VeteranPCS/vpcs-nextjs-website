import { LogLevel, logError, logInfo } from './loggingService';

// Form submission status
export enum FormSubmissionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

// Structure of a form submission record
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

// Local storage key for development/debugging mode
const FORM_SUBMISSIONS_KEY = 'vpcs_form_submissions';

// Maximum number of records to keep in localStorage
const MAX_LOCAL_RECORDS = 100;

/**
 * Tracks a form submission attempt
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
        // Create the submission record
        const record: FormSubmissionRecord = {
            id: submissionId,
            formType,
            timestamp: new Date().toISOString(),
            status,
            formData: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                hasPhone: !!formData.phone,
                currentBase: formData.currentBase,
                destinationBase: formData.destinationBase,
            },
            responseCode: response?.status,
            responseText: response?.statusText || (response?.ok ? 'OK' : undefined),
            errorMessage: error?.message,
        };

        // Store the submission
        await storeSubmission(record);

        logInfo('Form submission tracked', {
            id: submissionId,
            formType,
            status
        });

        return submissionId;
    } catch (storeError) {
        logError('Failed to track form submission', { formType }, storeError);
        return submissionId; // Still return the ID even if storage failed
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
        // In development mode, we'll use localStorage
        if (typeof window !== 'undefined') {
            const storedSubmissions = getLocalSubmissions();
            const submissionIndex = storedSubmissions.findIndex(s => s.id === submissionId);

            if (submissionIndex !== -1) {
                storedSubmissions[submissionIndex] = {
                    ...storedSubmissions[submissionIndex],
                    status,
                    timestamp: new Date().toISOString(), // Update timestamp
                    responseCode: response?.status,
                    responseText: response?.statusText || (response?.ok ? 'OK' : undefined),
                    errorMessage: error?.message,
                };

                localStorage.setItem(FORM_SUBMISSIONS_KEY, JSON.stringify(storedSubmissions));
                return true;
            }
            return false;
        }

        // In production, would use database
        if (process.env.NODE_ENV === 'production') {
            // TODO: Implement database update
            // Example: await updateSubmissionInDatabase(submissionId, status, response, error);
        }

        return true;
    } catch (updateError) {
        logError('Failed to update submission status', { submissionId, status }, updateError);
        return false;
    }
}

/**
 * Get recent submission records
 */
export function getRecentSubmissions(count = 20): FormSubmissionRecord[] {
    if (typeof window === 'undefined') {
        return []; // Server-side rendering, no localStorage
    }

    const submissions = getLocalSubmissions();
    return submissions.slice(-count);
}

/**
 * Get submission by ID
 */
export function getSubmissionById(id: string): FormSubmissionRecord | null {
    if (typeof window === 'undefined') {
        return null; // Server-side rendering, no localStorage
    }

    const submissions = getLocalSubmissions();
    return submissions.find(s => s.id === id) || null;
}

/**
 * Clear all tracked submissions (mainly for development)
 */
export function clearSubmissions(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(FORM_SUBMISSIONS_KEY);
    }
}

// Helper function to store a submission
async function storeSubmission(record: FormSubmissionRecord): Promise<void> {
    // In development mode, use localStorage for simplicity
    if (typeof window !== 'undefined') {
        const submissions = getLocalSubmissions();

        // Add new submission and maintain max size
        submissions.push(record);
        if (submissions.length > MAX_LOCAL_RECORDS) {
            submissions.shift(); // Remove oldest record
        }

        localStorage.setItem(FORM_SUBMISSIONS_KEY, JSON.stringify(submissions));
        return;
    }

    // In production, would use a database
    if (process.env.NODE_ENV === 'production') {
        // TODO: Implement database storage
        // Example: await storeSubmissionInDatabase(record);
    }
}

// Get submissions from localStorage
function getLocalSubmissions(): FormSubmissionRecord[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const storedData = localStorage.getItem(FORM_SUBMISSIONS_KEY);
        return storedData ? JSON.parse(storedData) : [];
    } catch (e) {
        console.error('Error reading form submissions from localStorage:', e);
        return [];
    }
}

// Generate a unique ID for submissions
function generateSubmissionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
} 