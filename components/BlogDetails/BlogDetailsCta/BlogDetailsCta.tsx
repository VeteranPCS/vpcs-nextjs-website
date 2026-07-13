import Button from "@/components/common/Button";
import classes from "./BlogDetailsCta.module.css";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";
import { getBlogCtaIntent } from "@/lib/blog/components";
import { getStateDisplayName } from "@/lib/blog/state";

type Props = {
  stateSlug?: string | null;
  componentSlug?: string | null;
  contentSlug: string;
};

const BlogDetailsCta = ({ stateSlug = null, componentSlug = null, contentSlug }: Props) => {
  const stateName = stateSlug ? getStateDisplayName(stateSlug) : null;
  const agentHref = buildContactCtaHref({ stateSlug, form: "agent" });
  const lenderHref = buildContactCtaHref({ stateSlug, form: "lender" });
  const agentLabel = stateName ? `Find an agent in ${stateName}` : "Find an agent";
  const lenderLabel = stateName ? `Find a lender in ${stateName}` : "Find a lender";
  // Category-driven intent (agent vs. lender) comes from partnerIntent in
  // content/_data/blog-components.json via getBlogCtaIntent.
  const intent = getBlogCtaIntent(componentSlug);

  const agentBlock = (
    <div>
      <div>
        <h2 className="text-[#FFFFFF] lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
          Buying Or Selling
        </h2>
      </div>
      <div data-cta-id="blog_details_find_agent">
        <TrackedCtaLink
          href={agentHref}
          cta={{
            ctaId: 'blog_details_find_agent',
            ctaIntent: 'contact_agent',
            ctaPosition: 'blog_details_cta_band',
            ctaComponent: 'blog_details_cta',
            ctaLabel: agentLabel,
            destination: agentHref,
            pageType: 'blog_post',
            stateSlug,
            contentSlug,
            contentType: 'blog_post',
            partnerType: 'agent',
          }}
        >
          <Button buttonText={agentLabel} />
        </TrackedCtaLink>
      </div>
    </div>
  );

  const lenderBlock = (
    <div>
      <div>
        <h2 className="text-[#FFFFFF] lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
          VA Loan Expert
        </h2>
      </div>
      <div data-cta-id="blog_details_find_lender">
        <TrackedCtaLink
          href={lenderHref}
          cta={{
            ctaId: 'blog_details_find_lender',
            ctaIntent: 'contact_lender',
            ctaPosition: 'blog_details_cta_band',
            ctaComponent: 'blog_details_cta',
            ctaLabel: lenderLabel,
            destination: lenderHref,
            pageType: 'blog_post',
            stateSlug,
            contentSlug,
            contentType: 'blog_post',
            partnerType: 'lender',
          }}
        >
          <Button buttonText={lenderLabel} />
        </TrackedCtaLink>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto w-full mt-12 sm:mb-12">
      <div className={classes.blogdetailsctacontainer} data-testid="blog-details-cta-band">
        <div className="items-center grid grid-cols-1 justify-center text-center mt-10 xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2">
          {intent === 'lender' ? lenderBlock : agentBlock}
        </div>
      </div>
    </div>
  );
};

export default BlogDetailsCta;
