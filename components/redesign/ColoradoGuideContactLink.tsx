"use client";

import Link from 'next/link';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import { rememberSelectedAgent } from '@/lib/experiments/desktop-contact-agent';
import { storeContactPrefill, type ContactPrefillDetails } from '@/lib/leads/contact-prefill';
import { COLORADO_RELOCATION_GUIDE as guide } from '@/lib/guides/colorado-relocation';

/** A separate contact request; downloading the guide never selects or routes to Tyler. */
export default function ColoradoGuideContactLink({ allowAuthorContact, location, className, contactDetails }: { allowAuthorContact: boolean; location: string; className?: string; contactDetails?: ContactPrefillDetails }) {
  const salesforceId = allowAuthorContact ? guide.authorSalesforceId : undefined;
  const label = allowAuthorContact ? 'Contact Tyler' : 'Find a Colorado Agent';
  const href = buildContactCtaHref({
    firstName: allowAuthorContact ? 'Tyler' : undefined,
    salesforceId,
    stateSlug: guide.stateSlug,
  });
  return <Link href={href} className={className} onClick={() => {
    if (salesforceId) {
      rememberSelectedAgent({ id: salesforceId, name: guide.author, brokerage: guide.brokerage, photo: '/images/agents/001Rg00000pmUUk.webp', service: 'Air Force Veteran' });
      storeContactPrefill(salesforceId, contactDetails);
    }
    try {
      trackCtaClicked({
        ...buildCtaProperties({
          ctaId: allowAuthorContact ? 'colorado_relocation_guide_contact_tyler' : 'colorado_relocation_guide_find_agent',
          ctaIntent: 'contact_agent',
          ctaComponent: 'colorado_guide_contact_link',
          ctaLocation: location,
          ctaPosition: location === 'guide_download_success' ? 'primary' : 'secondary',
          ctaLabel: label,
          destination: href,
          pageType: 'state_page',
          stateCode: guide.stateCode,
          stateSlug: guide.stateSlug,
          guideId: guide.id,
          partnerType: 'agent',
          partnerSalesforceId: salesforceId,
        }),
        source_page_path: guide.pagePath,
      });
    } catch { /* Optional analytics must not block navigation. */ }
  }}>{label}</Link>;
}
