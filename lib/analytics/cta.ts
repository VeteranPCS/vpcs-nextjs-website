import { safePath, type AnalyticsProperties } from '@/lib/analytics/sanitizer';

export type CtaTrackingInput = {
  ctaId: string;
  ctaIntent: string;
  ctaPosition?: string;
  ctaComponent: string;
  ctaLocation?: string;
  destination?: unknown;
  ctaLabel?: string;
  pageType?: string;
  stateCode?: string | null;
  stateSlug?: string | null;
  contentSlug?: string | null;
  contentType?: string | null;
  guideId?: string | null;
  calculatorId?: string | null;
  calculatorName?: string | null;
  partnerType?: 'agent' | 'lender' | null;
  partnerSalesforceId?: string | null;
};

export function buildCtaProperties(input: CtaTrackingInput): AnalyticsProperties {
  return {
    cta_id: input.ctaId,
    cta_intent: input.ctaIntent,
    cta_position: input.ctaPosition,
    cta_component: input.ctaComponent,
    cta_location: input.ctaLocation ?? input.ctaComponent,
    cta_label: input.ctaLabel,
    page_type: input.pageType,
    destination_path: safePath(input.destination),
    state_code: input.stateCode ?? undefined,
    state_slug: input.stateSlug ?? undefined,
    content_slug: input.contentSlug ?? undefined,
    content_type: input.contentType ?? undefined,
    guide_id: input.guideId ?? undefined,
    calculator_id: input.calculatorId ?? undefined,
    calculator_name: input.calculatorName ?? undefined,
    partner_type: input.partnerType ?? undefined,
    partner_salesforce_id: input.partnerSalesforceId ?? undefined,
  };
}
