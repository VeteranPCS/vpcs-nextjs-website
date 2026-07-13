import TrackedCtaLink from "@/components/common/TrackedCtaLink";

export type StateBrowseItem = {
  stateSlug: string;
  name: string;
  count: number;
};

type Props = {
  states: StateBrowseItem[];
};

const chipClasses =
  "inline-flex min-h-11 items-center rounded-custom border border-[#E2E4E5] px-4 py-2 roboto text-sm font-bold text-[#292F6C] hover:border-[#292F6C]";

/**
 * State browse rail: top states by guide count, each chip linking to the
 * state landing page (guides + vetted agents), plus an all-states link
 * to the homepage state map.
 */
export default function StateBrowseRail({ states }: Props) {
  if (!states.length) return null;

  return (
    <section className="px-5 py-10">
      <div className="container mx-auto">
        <h2 className="text-[#292F6C] md:text-[42px] text-[30px] font-bold">
          Browse guides by state
        </h2>
        <p className="mt-3 max-w-2xl text-[#495057] roboto text-base leading-7">
          Every state page pairs local PCS guides with vetted,
          military-experienced agents and lenders.
        </p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {states.map((state) => (
            <li key={state.stateSlug}>
              <TrackedCtaLink
                href={`/${state.stateSlug}`}
                className={chipClasses}
                cta={{
                  ctaId: "blog_landing_state_link",
                  ctaIntent: "state_agent_search",
                  ctaPosition: "blog_landing_state_rail",
                  ctaComponent: "blog_state_browse_rail",
                  ctaLabel: state.name,
                  stateSlug: state.stateSlug,
                  destination: `/${state.stateSlug}`,
                  pageType: "blog_landing",
                }}
              >
                {state.name}
                <span className="ml-2 font-normal text-[#6C757D]">
                  · {state.count} {state.count === 1 ? "guide" : "guides"}
                </span>
              </TrackedCtaLink>
            </li>
          ))}
          <li>
            <TrackedCtaLink
              href="/#state-map"
              className={chipClasses}
              cta={{
                ctaId: "blog_landing_state_link",
                ctaIntent: "state_agent_search",
                ctaPosition: "blog_landing_state_rail",
                ctaComponent: "blog_state_browse_rail",
                ctaLabel: "All states",
                destination: "/#state-map",
                pageType: "blog_landing",
              }}
            >
              All states
            </TrackedCtaLink>
          </li>
        </ul>
      </div>
    </section>
  );
}
