import { describe, expect, it } from 'vitest';
import { buildStateContactCtaProperties } from '../state-cta';

describe('state contact CTA telemetry contract', () => {
  it.each([
    ['state_agent_card_contact', 'agent', 'state_agent_card'],
    ['state_lender_card_contact', 'lender', 'state_lender_card'],
    ['state_page_agent_cta', 'agent', 'state_page_cta'],
    ['state_page_lender_cta', 'lender', 'state_page_cta'],
    ['state_page_find_agent_fallback', 'agent', 'state_page_let_find_agent'],
  ] as const)('%s retains its identity and includes surface/state/partner context', (ctaId, partner, component) => {
    const properties = buildStateContactCtaProperties({ ctaId, position: 'test_position', state: 'north-carolina' });
    expect(properties).toMatchObject({
      cta_id: ctaId, cta_intent: `contact_${partner}`, cta_position: 'test_position',
      cta_component: component, cta_location: component, page_type: 'state_page',
      state_slug: 'north-carolina', state_code: 'NC', partner_type: partner,
      destination_path: `/contact-${partner}`,
    });
    expect(properties.partner_salesforce_id).toBeUndefined();
  });

  it('retains selected partner IDs and normalizes DC state context', () => {
    expect(buildStateContactCtaProperties({ ctaId: 'state_lender_card_contact', position: 'card_button', state: 'DC', partnerId: 'partner-fixture' })).toMatchObject({
      state_code: 'DC', state_slug: 'washington-dc', partner_salesforce_id: 'partner-fixture',
    });
  });
});
