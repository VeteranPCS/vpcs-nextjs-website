import TrackedCtaLink from '@/components/common/TrackedCtaLink';

type Props = {
  pageType: string;
  ctaPosition: string;
  agentCtaId: string;
  lenderCtaId: string;
};

/**
 * Bottom lead-capture band for blog listing surfaces (archive + category hubs).
 * Follows the blog CTA band convention (navy band, agent + lender links) but
 * routes straight to the contact forms and lets each surface supply its own
 * cta ids/position so cta_clicked stays differentiated by props.
 */
export default function BlogLeadCtaBand({ pageType, ctaPosition, agentCtaId, lenderCtaId }: Props) {
  return (
    <section className="px-5 pb-14">
      <div className="container mx-auto">
        <div className="rounded-custom bg-[#292F6C] px-6 py-10 text-center md:px-12">
          <h2 className="text-white text-[26px] font-bold md:text-[34px]">
            Ready for your next move?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/80 roboto text-base leading-7">
            Connect with a military-experienced real estate agent or a VA loan expert who knows
            military moves.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <TrackedCtaLink
              href="/contact-agent"
              className="inline-flex min-h-11 items-center rounded-custom bg-[#a81f23] px-6 py-3 text-sm font-bold text-white"
              cta={{
                ctaId: agentCtaId,
                ctaIntent: 'contact_agent',
                ctaPosition,
                ctaComponent: 'blog_cta_band',
                ctaLabel: 'Find an Agent',
                destination: '/contact-agent',
                pageType,
                partnerType: 'agent',
              }}
            >
              Find an Agent
            </TrackedCtaLink>
            <TrackedCtaLink
              href="/contact-lender"
              className="inline-flex min-h-11 items-center rounded-custom border border-white px-6 py-3 text-sm font-bold text-white"
              cta={{
                ctaId: lenderCtaId,
                ctaIntent: 'contact_lender',
                ctaPosition,
                ctaComponent: 'blog_cta_band',
                ctaLabel: 'Find a Lender',
                destination: '/contact-lender',
                pageType,
                partnerType: 'lender',
              }}
            >
              Find a Lender
            </TrackedCtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
