'use client';

import posthog from 'posthog-js';
import {
  ANALYTICS_SCHEMA_VERSION,
  errorCodesFromErrors,
  sanitizeAnalyticsProperties,
  type AnalyticsProperties,
  type JourneyStage,
} from '@/lib/analytics/sanitizer';
import {
  captureAttributionFromLocation,
  getClientAnalyticsContext,
  getOrCreateVisitorId,
  incrementAnalyticsCounter,
} from '@/lib/analytics/visitor';

export type AnalyticsEventName =
  | 'content_viewed'
  | 'state_page_viewed'
  | 'blog_search_submitted'
  | 'blog_search_results'
  | 'bah_calculator_used'
  | 'moving_bonus_calculated'
  | 'calculator_cta_clicked'
  | 'cta_clicked'
  | 'form_started'
  | 'form_submit_attempted'
  | 'form_validation_failed'
  | 'form_submission_failed'
  | 'guide_download_requested'
  | 'guide_download_started'
  | 'concierge_opened'
  | 'concierge_message_sent'
  | 'concierge_tool_approval_responded';

const EVENT_STAGE: Record<AnalyticsEventName, JourneyStage> = {
  content_viewed: 'top',
  state_page_viewed: 'top',
  blog_search_submitted: 'top',
  blog_search_results: 'top',
  bah_calculator_used: 'top',
  moving_bonus_calculated: 'top',
  calculator_cta_clicked: 'mid',
  cta_clicked: 'mid',
  form_started: 'mid',
  form_submit_attempted: 'mid',
  form_validation_failed: 'mid',
  form_submission_failed: 'mid',
  guide_download_requested: 'mid',
  guide_download_started: 'mid',
  concierge_opened: 'mid',
  concierge_message_sent: 'mid',
  concierge_tool_approval_responded: 'mid',
};

const startedForms = new Set<string>();

export function initializeClientAnalytics(): string {
  const visitorId = getOrCreateVisitorId();
  captureAttributionFromLocation();
  return visitorId;
}

export function captureAnalyticsEvent(
  event: AnalyticsEventName,
  properties: AnalyticsProperties = {},
): void {
  const context = getClientAnalyticsContext();
  const props = sanitizeAnalyticsProperties({
    analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
    journey_stage: EVENT_STAGE[event],
    vpcs_visitor_id: context.vpcs_visitor_id,
    source_page_path: context.source_page_path,
    ...properties,
  });

  posthog.capture(event, props);
}

export function formTrackingPayload(): Record<string, unknown> {
  return { ...getClientAnalyticsContext() };
}

export function trackFormStarted(formId: string, properties: AnalyticsProperties = {}): void {
  if (startedForms.has(formId)) return;
  startedForms.add(formId);
  captureAnalyticsEvent('form_started', { form_id: formId, ...properties });
}

export function trackFormSubmitAttempted(formId: string, properties: AnalyticsProperties = {}): void {
  incrementAnalyticsCounter('form_attempt_count_before_conversion');
  captureAnalyticsEvent('form_submit_attempted', { form_id: formId, ...properties });
}

export function trackFormValidationFailed(
  formId: string,
  errors: unknown,
  properties: AnalyticsProperties = {},
): void {
  captureAnalyticsEvent('form_validation_failed', {
    form_id: formId,
    failure_stage: 'client_validation',
    error_codes: errorCodesFromErrors(errors),
    ...properties,
  });
}

export function trackFormSubmissionFailed(
  formId: string,
  failureStage: string,
  errorCodes: string[] = ['submission_failed'],
  properties: AnalyticsProperties = {},
): void {
  captureAnalyticsEvent('form_submission_failed', {
    form_id: formId,
    failure_stage: failureStage,
    error_codes: errorCodes,
    ...properties,
  });
}

export function trackCtaClicked(properties: AnalyticsProperties): void {
  incrementAnalyticsCounter('cta_click_count_before_conversion');
  captureAnalyticsEvent('cta_clicked', properties);
}

export function trackPageviewCounter(): void {
  incrementAnalyticsCounter('pageview_count_before_conversion');
}

export { getOrCreateVisitorId };
