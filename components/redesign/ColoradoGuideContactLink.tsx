"use client";

import Link from 'next/link';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import { rememberSelectedAgent } from '@/lib/experiments/desktop-contact-agent';
import { storeContactPrefill, type ContactPrefillDetails } from '@/lib/leads/contact-prefill';
import { COLORADO_RELOCATION_GUIDE as guide } from '@/lib/guides/colorado-relocation';

const href = buildContactCtaHref({ firstName: 'Tyler', salesforceId: guide.authorSalesforceId, stateSlug: guide.stateSlug });

/** A separate contact request; downloading the guide never selects or routes to Tyler. */
export default function ColoradoGuideContactLink({ location, className, contactDetails }: { location: string; className?: string; contactDetails?: ContactPrefillDetails }) {
  return <Link href={href} className={className} onClick={() => {
    rememberSelectedAgent({ id: guide.authorSalesforceId, name: guide.author, brokerage: guide.brokerage, photo: '/images/agents/001Rg00000pmUUk.webp', service: 'Air Force Veteran' });
    storeContactPrefill(guide.authorSalesforceId, contactDetails);
    try {
      trackCtaClicked({
        ...buildCtaProperties({
          ctaId: 'colorado_relocation_guide_contact_tyler',
          ctaIntent: 'contact_agent',
          ctaComponent: 'colorado_guide_contact_link',
          ctaLocation: location,
          ctaPosition: location === 'guide_download_success' ? 'primary' : 'secondary',
          ctaLabel: 'Contact Tyler',
          destination: href,
          pageType: 'state_page',
          stateCode: guide.stateCode,
          stateSlug: guide.stateSlug,
          guideId: guide.id,
          partnerType: 'agent',
          partnerSalesforceId: guide.authorSalesforceId,
        }),
        source_page_path: guide.pagePath,
      });
    } catch { /* Optional analytics must not block navigation. */ }
  }}>Contact Tyler</Link>;
}
