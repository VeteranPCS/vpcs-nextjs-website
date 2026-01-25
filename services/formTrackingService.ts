import { logError, logInfo } from "./loggingService";

// Form submission status
export enum FormSubmissionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
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
  // recordId is populated on successful Attio submissions
  recordId?: string;
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
  error?: Error,
): Promise<string> {
  // Generate submission ID
  const submissionId = generateSubmissionId();

  try {
    // Extract fields - handle both camelCase and snake_case field names
    // Some forms use firstName/lastName, others use first_name/last_name
    const firstName = formData.firstName || formData.first_name;
    const lastName = formData.lastName || formData.last_name;
    const phone = formData.phone || formData.mobile;
    const currentBase = formData.currentBase || formData.base;
    // For internship forms, desired location is the "destination"
    const destinationBase =
      formData.destinationBase || formData["00N4x00000LspUi"];

    // Log the form submission
    const logData = {
      id: submissionId,
      formType,
      status,
      formData: {
        firstName,
        lastName,
        email: formData.email,
        hasPhone: !!phone,
        currentBase,
        destinationBase,
        phone: phone ? "[REDACTED]" : undefined,
      },
      timestamp: new Date().toISOString(),
      responseCode: response?.status,
      responseText: response?.statusText || (response?.ok ? "OK" : undefined),
      errorMessage: error?.message,
    };

    logInfo(`Form submission started: ${formType}`, logData);
    return submissionId;
  } catch (logError) {
    console.error("Failed to log form submission:", logError);
    return submissionId; // Still return the ID even if logging failed
  }
}

/**
 * Updates an existing submission record with results
 * @param submissionId - The tracking ID for this submission
 * @param status - SUCCESS or FAILURE
 * @param recordId - The Attio record ID on success (e.g., intern ID, customer ID)
 * @param error - Error object on failure
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: FormSubmissionStatus,
  recordId?: string | null,
  error?: Error,
): Promise<boolean> {
  try {
    // Just log the update to server logs
    const updateInfo: Record<string, any> = {
      submissionId,
      status,
      timestamp: new Date().toISOString(),
    };

    // Only include recordId if present (success case)
    if (recordId) {
      updateInfo.recordId = recordId;
    }

    // Only include errorMessage if present (failure case)
    if (error?.message) {
      updateInfo.errorMessage = error.message;
    }

    if (status === FormSubmissionStatus.SUCCESS) {
      logInfo(`Form submission successful [${submissionId}]`, updateInfo);
    } else if (status === FormSubmissionStatus.FAILURE) {
      logError(
        `Form submission failed [${submissionId}]`,
        updateInfo,
        error || new Error("Unknown error"),
      );
    } else {
      logInfo(
        `Form submission status updated [${submissionId}]: ${status}`,
        updateInfo,
      );
    }

    return true;
  } catch (updateError) {
    console.error("Failed to log submission status update:", updateError);
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
