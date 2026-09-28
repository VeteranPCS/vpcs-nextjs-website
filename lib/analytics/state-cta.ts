import { buildCtaProperties } from './cta';
import { normalizeStateCode, normalizeStateSlug } from '@/lib/states';

const STATE_CONTACT_CTAS = {
  state_agent_card_contact: { partner: 'agent', component: 'state_agent_card' },
  state_lender_card_contact: { partner: 'lender', component: 'state_lender_card' },
  state_page_agent_cta: { partner: 'agent', component: 'state_page_cta' },
  state_page_lender_cta: { partner: 'lender', component: 'state_page_cta' },
  state_page_find_agent_fallback: { partner: 'agent', component: 'state_page_let_find_agent' },
} as const;

export function buildStateContactCtaProperties({
  ctaId, position, state, partnerId,
}: {
  ctaId: keyof typeof STATE_CONTACT_CTAS;
  position: string;
  state?: string | null;
  partnerId?: string;
}) {
  const { partner, component } = STATE_CONTACT_CTAS[ctaId];
  return buildCtaProperties({
    ctaId,
    ctaIntent: `contact_${partner}`,
    ctaPosition: position,
    ctaComponent: component,
    destination: `/contact-${partner}`,
    pageType: 'state_page',
    stateCode: normalizeStateCode(state),
    stateSlug: normalizeStateSlug(state),
    partnerType: partner,
    partnerSalesforceId: partnerId,
  });
}
