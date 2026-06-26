import { describe, expect, it } from 'vitest';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { sanitizeAnalyticsProperties } from '@/lib/analytics/sanitizer';

describe('CTA analytics helpers', () => {
  it('builds canonical CTA properties with path-only destinations', () => {
    const clean = sanitizeAnalyticsProperties(buildCtaProperties({
      ctaId: 'test_agent_cta',
      ctaIntent: 'contact_agent',
      ctaPosition: 'hero',
      ctaComponent: 'test_component',
      ctaLabel: 'Find an Agent',
      destination: '/contact-agent?fn=Alex&id=001xx000003DGSW&state=texas',
      stateCode: 'tx',
      stateSlug: 'texas',
      partnerType: 'agent',
      partnerSalesforceId: '001xx000003DGSW',
    }));

    expect(clean).toMatchObject({
      cta_id: 'test_agent_cta',
      cta_intent: 'contact_agent',
      cta_position: 'hero',
      cta_component: 'test_component',
      cta_label: 'Find an Agent',
      destination_path: '/contact-agent',
      state_code: 'TX',
      state_slug: 'texas',
      partner_type: 'agent',
      partner_salesforce_id: '001xx000003DGSW',
    });
  });

  it('does not retain raw query strings or PII-looking destinations', () => {
    const clean = sanitizeAnalyticsProperties(buildCtaProperties({
      ctaId: 'test_external',
      ctaIntent: 'navigate',
      ctaPosition: 'footer',
      ctaComponent: 'test_component',
      destination: 'https://www.veteranpcs.com/contact-lender?email=alex@example.com',
    }));

    expect(clean.destination_path).toBe('/contact-lender');
    expect(JSON.stringify(clean)).not.toContain('alex@example.com');
    expect(JSON.stringify(clean)).not.toContain('?email=');
  });
});
