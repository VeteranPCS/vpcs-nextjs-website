// Environment-specific logging (more detailed in dev)
const isDev = process.env.NODE_ENV === 'development';

// Log levels
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

// Structured log format (kept for typing purposes)
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
    error?: any;
}

// Main logging function
export function log(level: LogLevel, message: string, data?: any, error?: any): void {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: sanitizeData(data),
        error: error ? {
            message: error.message,
            stack: isDev ? error.stack : undefined,
            name: error.name,
            code: error.code,
        } : undefined
    };

    // Send to console
    const consoleMethod = level === LogLevel.ERROR ? console.error :
        level === LogLevel.WARN ? console.warn :
            level === LogLevel.DEBUG ? console.debug : console.log;

    consoleMethod(
        `[${entry.timestamp}] [${level}] ${message}`,
        entry.data ? { data: entry.data } : '',
        entry.error ? { error: entry.error } : ''
    );
}

// Convenience methods
export const logInfo = (message: string, data?: any) => log(LogLevel.INFO, message, data);
export const logWarning = (message: string, data?: any) => log(LogLevel.WARN, message, data);
export const logError = (message: string, data?: any, error?: any) => log(LogLevel.ERROR, message, data, error);
export const logDebug = (message: string, data?: any) => log(LogLevel.DEBUG, message, data);

// Specific logging for Salesforce form submissions
export function logFormSubmission(
    formType: string,
    formData: any,
    success: boolean,
    responseData?: any,
    error?: any
): void {
    const logLevel = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success
        ? `Successfully submitted ${formType} form to Salesforce`
        : `Failed to submit ${formType} form to Salesforce`;

    log(logLevel, message, {
        formType,
        formDataSummary: {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            hasPhone: !!formData.phone,
            timestamp: new Date().toISOString(),
        },
        responseStatus: responseData?.status,
        responseData: sanitizeResponse(responseData),
    }, error);
}

// Kept as a no-op function for API compatibility
export function getRecentLogs(): LogEntry[] {
    return [];
}

// Helper to sanitize sensitive data before logging
function sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };

    // Sanitize sensitive fields if present
    if (sanitized.formData) {
        sanitized.formData = {
            ...sanitized.formData,
            // Mask sensitive information
            phone: sanitized.formData.phone ? '********' : undefined,
            captchaToken: sanitized.formData.captchaToken ? '[REDACTED]' : undefined,
        };
    }

    return sanitized;
}

// Helper to sanitize response data
function sanitizeResponse(responseData: any): any {
    if (!responseData) return undefined;

    // Extract useful information from response without logging everything
    return {
        status: responseData.status,
        statusText: responseData.statusText,
        ok: responseData.ok,
        redirectUrl: responseData.redirectUrl,
        headers: responseData.headers ? Object.fromEntries(
            Object.entries(responseData.headers).filter(([key]) =>
                !['set-cookie', 'authorization'].includes(key.toLowerCase())
            )
        ) : undefined,
    };
}