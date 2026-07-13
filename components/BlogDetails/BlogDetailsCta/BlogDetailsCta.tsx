import Button from "@/components/common/Button";
import classes from "./BlogDetailsCta.module.css";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";
import { getBlogComponentBySlug } from "@/lib/blog/components";
import { getStateDisplayName } from "@/lib/blog/state";

type Props = {
  stateSlug?: string | null;
  componentSlug?: string | null;
};

const BlogDetailsCta = ({ stateSlug = null, componentSlug = null }: Props) => {
  const stateName = stateSlug ? getStateDisplayName(stateSlug) : null;
  const agentHref = buildContactCtaHref({ stateSlug, form: "agent" });
  const lenderHref = buildContactCtaHref({ stateSlug, form: "lender" });
  const agentLabel = stateName ? `Find an Agent in ${stateName}` : "Find An Agent";
  const lenderLabel = stateName ? `Find a Lender in ${stateName}` : "Find A Lender";
  // Lender-led categories (VA Loan Help, Financial Guidance) put the lender
  // CTA first, driven by ctaCopy in content/_data/blog-components.json.
  const lenderFirst = getBlogComponentBySlug(componentSlug)?.ctaCopy === "Find a Lender";

  const agentBlock = (
    <div key="agent">
      <div>
        <h2 className="text-[#FFFFFF] lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
          Buying Or Selling
        </h2>
      </div>
      <div>
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
            partnerType: 'agent',
          }}
        >
          <Button buttonText={agentLabel} />
        </TrackedCtaLink>
      </div>
    </div>
  );

  const lenderBlock = (
    <div key="lender">
      <div>
        <h2 className="text-[#FFFFFF] lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">
          VA Loan Expert
        </h2>
      </div>
      <div>
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
      <div className={classes.blogdetailsctacontainer}>
        <div className="items-center grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 mt-10 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2">
          <div className="md:pl-20">
            {lenderFirst ? [lenderBlock, agentBlock] : [agentBlock, lenderBlock]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailsCta;
