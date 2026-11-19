/** Serializable, client-safe maintenance contract. No credentials or customer data. */
export const INTAKE_MAINTENANCE_START = '2026-11-08T07:45:00.000Z';
export const INTAKE_MAINTENANCE_NOTICE = 'Requests are temporarily paused for scheduled maintenance. Please try again after 1 a.m. Pacific on November 8. Maintenance may take longer.';
export const INTAKE_MAINTENANCE_EXTENDED_NOTICE = 'Requests remain temporarily paused for maintenance. Please try again later.';
export const INTAKE_NOT_SENT_MESSAGE = 'Your request was not sent. Requests are paused for maintenance. Your details are still in this open form; they have not been saved or queued. Please keep this page open and try again after maintenance.';
export const INTAKE_REOPENED_MESSAGE = 'Intake has reopened. Your earlier request was not sent. Your details are still in this open form; submit when you are ready.';
export const INTAKE_CONCIERGE_NOT_SENT_MESSAGE = 'Your request was not sent. Requests are paused for maintenance. Your details remain in this conversation, but no request has been saved or queued for follow-up. Please ask to submit again after maintenance. Do not retry automatically.';

export type IntakeMaintenanceResult = {
  success: false;
  outcome: 'not_sent';
  reason: 'maintenance';
  maintenanceMessage: string;
  // Explicit absence keeps legacy success checks safe across server-action serialization.
  message?: never;
  redirectUrl?: never;
  submissionId?: never;
};

export function maintenanceNotSent(): IntakeMaintenanceResult {
  return { success: false, outcome: 'not_sent', reason: 'maintenance', maintenanceMessage: INTAKE_NOT_SENT_MESSAGE };
}

export function isIntakeMaintenanceResult(value: unknown): value is IntakeMaintenanceResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<IntakeMaintenanceResult>;
  return result.success === false && result.outcome === 'not_sent' && result.reason === 'maintenance';
}
