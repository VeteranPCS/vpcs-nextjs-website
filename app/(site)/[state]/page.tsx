import StatePageHeroSection from "@/components/StatePage/StatePaheHeroSection/StatePageHeroSection";
import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";
import StatePageVaLoan from "@/components/StatePage/StatePageVaLoan/StatePageVaLoan";
import StatePageCTA from "@/components/StatePage/StatePageCTA/StatePageCTA";
import StatePageCityAgents from "@/components/StatePage/StatePageCityAgents/StatePageCityAgents";
import StatePageRelatedGuides from "@/components/StatePage/StatePageRelatedGuides/StatePageRelatedGuides";
import StatePageLetFindAgent from "@/components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent";
import StatePageWhyChooseVetpcs from "@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcs";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import { StatePageViewedTracker } from "@/components/Analytics/Trackers";
import stateService from "@/services/stateService";
import { fetchStatePageData } from "@/services/statePageService";
import {
  buildStateLocalBusiness,
  buildAgentItemList,
  buildBreadcrumbList,
} from "@/lib/structured-data";
import { SITE_URL, absoluteUrl } from "@/lib/siteUrl";
import { getStateGuidePosts } from "@/lib/blog/registry";

const BASE_URL = SITE_URL;
export const revalidate = 43200;

export async function generateStaticParams() {
  if (process.env.SKIP_SALESFORCE_PRERENDER === '1') return [];

  const states = await stateService.fetchStateList();
  return states.map((state) => ({
    state: state.state_slug.current,
  }));
}

export async function generateMetadata(props: { params: Promise<{ state: string }> }) {
  const params = await props.params;
  const stateName = params.state
    .replace(/-/g, " ") // Replace hyphens with spaces
    .toLowerCase()      // Convert to lowercase
    .split(" ")         // Split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" ");

  const ogTitle = `Military PCS Moves: Top Veteran Real Estate Agents in ${stateName} - VA Loan Experts`;
  const ogDescription = `Connect with the best veteran real estate agents in ${stateName} who understand the unique needs of veterans and military families. Contact a veteran real estate agent in ${stateName} today and start your PCS move with confidence.`;
  // fetchStateImage returns an absolute URL; absoluteUrl is an idempotent
  // guard here so BOTH openGraph and twitter images can never regress to a
  // relative or protocol-relative `//images/...` URL on the wrong host (the
  // old code did `/${ogImage}` for Twitter, which had exactly that bug).
  const ogImage = absoluteUrl(await stateService.fetchStateImage(params.state));

  return {
    metadataBase: new URL(BASE_URL),
    title: ogTitle,
    description: ogDescription,
    alternates: {
      canonical: `${BASE_URL}/${params.state}`,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: `${BASE_URL}/${params.state}`,
      type: "website",
      images: [{
        url: ogImage,
        alt: `Map of ${stateName}`,
        width: 800,
        height: 600,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}


export default async function StatePage(props: { params: Promise<{ state: string }> }) {
  const { state } = await props.params;
  const {
    stateDetails: state_data,
    stateCode: state_code,
    agentsData: agents_data,
    lendersData: lenders_data,
    agentGroups: formatted_data,
  } = await fetchStatePageData(state);

  const stateName = state_data.state_name;
  const agentCount = agents_data.records.length;
  const lenderCount = lenders_data.records.length;
  const guidePosts = getStateGuidePosts(state, 6);

  const localBusinessJsonLd = buildStateLocalBusiness({
    stateName,
    stateSlug: state,
    agentCount,
    lenderCount,
  });

  const agentItemListJsonLd = buildAgentItemList(
    state,
    agents_data.records.map((agent) => ({
      name: agent.Name,
      brokerage: agent.Brokerage_Name__pc,
      bio: agent.Agent_Bio__pc,
      stateSlug: state,
      imageUrl: agent.PhotoUrl,
      salesforceId: agent.AccountId_15__c,
    })),
  );

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: "Home", url: `${BASE_URL}/` },
    { name: stateName, url: `${BASE_URL}/${state}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        id={`json-ld-state-${state}-business`}
      >{JSON.stringify(localBusinessJsonLd)}</script>
      <script
        type="application/ld+json"
        id={`json-ld-state-${state}-agents`}
      >{JSON.stringify(agentItemListJsonLd)}</script>
      <script
        type="application/ld+json"
        id={`json-ld-state-${state}-breadcrumb`}
      >{JSON.stringify(breadcrumbJsonLd)}</script>
      <StatePageHeroSection
        stateName={state_data?.state_name || 'Unknown'}
        stateImage={state_data?.state_map}
        cityList={Object.keys(formatted_data).toSorted()}
        stateSlug={state}
        stateCode={state_code}
      />
      <StatePageHeroSecondSection
        stateName={state_data?.state_name || 'Unknown'}
        stateCode={state_code}
        stateSlug={state}
      />
      <StatePageViewedTracker stateCode={state_code} stateSlug={state} />
      <StatePageVaLoan cityName={state_data?.state_name || 'Unknown'} lendersData={lenders_data} state={state} />
      <StatePageCTA cityName={state_data?.state_name || 'Unknown'} stateSlug={state} />

      <StatePageRelatedGuides
        stateName={stateName}
        guides={guidePosts}
        stateSlug={state}
        stateCode={state_code}
      />

      {Object.keys(formatted_data).length === 0 ? (
        <section className="bg-[#F4F4F4] px-5 py-12 text-center">
          <h2 className="text-[#292F6C] text-[31px] font-bold">
            {stateName} Real Estate Agents
          </h2>
          <p className="text-[#515151] text-[18px] mt-4">
            No agents are currently listed for this state. Contact us and we will help find the right match.
          </p>
        </section>
      ) : (
        Object.entries(formatted_data)
          .toSorted(([left], [right]) => left.localeCompare(right))
          .map(([cityName, agents]) => (
            <StatePageCityAgents key={cityName} city={cityName} agent_data={agents} state={state} />
          ))
      )}

      <StatePageLetFindAgent stateSlug={state} stateCode={state_code} />
      <StatePageWhyChooseVetpcs cityName={state_data?.state_name || 'Unknown'} />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
