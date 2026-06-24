import 'server-only';

import {
  ANALYTICS_SCHEMA_VERSION,
  sanitizeAnalyticsProperties,
  safePath,
  type AnalyticsProperties,
  type AnalyticsValue,
  type JourneyStage,
} from '@/lib/analytics/sanitizer';
import { captureServerEvent } from '@/lib/posthog-server';
import { logError } from '@/services/loggingService';

const EVENT_STAGE = {
  lead_conversion_created: 'bottom',
  concierge_tool_submitted: 'mid',
  concierge_tool_completed: 'mid',
  concierge_tool_failed: 'mid',
  concierge_chat_completed: 'mid',
} as const satisfies Record<string, JourneyStage>;

export const VPCS_VISITOR_ID_W2L_FIELD_ID = '00NRg00000PjSD3MAN';
export const VPCS_SUBMISSION_ID_W2L_FIELD_ID = '00NRg00000PjSEfMAN';

export interface LeadAnalyticsInput {
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
}

export function getVisitorIdFromFormData(formData: Record<string, unknown>): string | undefined {
  const value = formData.vpcs_visitor_id;
  return typeof value === 'string' && value.startsWith('vpcs_') ? value : undefined;
}

function safeNested(value: unknown): Record<string, AnalyticsValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const nested: Record<string, AnalyticsValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      nestedValue === null
      || nestedValue === undefined
      || typeof nestedValue === 'string'
      || typeof nestedValue === 'number'
      || typeof nestedValue === 'boolean'
    ) {
      nested[key] = nestedValue;
    }
  }

  return Object.keys(nested).length > 0 ? nested : undefined;
}

function booleanFromContact(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

export function buildLeadConversionProperties(input: LeadAnalyticsInput): AnalyticsProperties {
  const firstTouch = safeNested(input.formData.first_touch_attribution);
  const lastTouch = safeNested(input.formData.last_touch_attribution);

  return {
    form_id: input.formId,
    lead_source: input.leadSource,
    submission_id: input.submissionId,
    vpcs_visitor_id: getVisitorIdFromFormData(input.formData),
    source_page_path: input.sourcePagePath ?? safePath(input.formData.source_page_path) ?? undefined,
    state_code: input.stateCode,
    state_slug: input.stateSlug,
    partner_type: input.partnerType,
    partner_salesforce_id: input.partnerSalesforceId ?? undefined,
    guide_id: input.guideId,
    has_email: booleanFromContact(input.formData.email),
    has_phone: booleanFromContact(input.formData.phone),
    first_touch_attribution: firstTouch,
    last_touch_attribution: lastTouch,
    conversion_lag_seconds: Number(input.formData.conversion_lag_seconds) || undefined,
    pageview_count_before_conversion: Number(input.formData.pageview_count_before_conversion) || undefined,
    cta_click_count_before_conversion: Number(input.formData.cta_click_count_before_conversion) || undefined,
    form_attempt_count_before_conversion: Number(input.formData.form_attempt_count_before_conversion) || undefined,
  };
}

export async function captureServerAnalyticsEvent(args: {
  event: keyof typeof EVENT_STAGE;
  distinctId?: string;
  properties?: AnalyticsProperties;
}): Promise<void> {
  const properties = sanitizeAnalyticsProperties({
    analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
    journey_stage: EVENT_STAGE[args.event],
    ...args.properties,
  });

  const distinctId = args.distinctId
    || (typeof properties.vpcs_visitor_id === 'string' ? properties.vpcs_visitor_id : undefined)
    || (typeof properties.submission_id === 'string' ? properties.submission_id : undefined)
    || 'server_unknown';

  await captureServerEvent({
    distinctId,
    event: args.event,
    properties,
  });
}

export async function captureLeadConversionCreated(input: LeadAnalyticsInput): Promise<void> {
  const properties = buildLeadConversionProperties(input);
  try {
    await captureServerAnalyticsEvent({
      event: 'lead_conversion_created',
      distinctId: getVisitorIdFromFormData(input.formData) ?? input.submissionId,
      properties,
    });
  } catch (error) {
    logError(
      'PostHog lead_conversion_created capture failed',
      { submissionId: input.submissionId, formId: input.formId },
      error,
    );
  }
}

export function appendSalesforceAttributionParams(
  params: URLSearchParams,
  formData: Record<string, unknown>,
  submissionId: string,
): URLSearchParams {
  const visitorId = getVisitorIdFromFormData(formData);
  params.set(VPCS_VISITOR_ID_W2L_FIELD_ID, visitorId ?? '');
  params.set(VPCS_SUBMISSION_ID_W2L_FIELD_ID, submissionId);
  return params;
}
