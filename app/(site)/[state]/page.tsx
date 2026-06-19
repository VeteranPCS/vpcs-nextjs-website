import Script from "next/script";
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
import stateService, { StateList as StateList, AgentsData, LendersData, Lenders } from "@/services/stateService";
import {
  buildStateLocalBusiness,
  buildAgentItemList,
  buildBreadcrumbList,
} from "@/lib/structured-data";
import {
  areaAssignmentsInState,
  groupAgentsByAreaForState,
  type StateAgentGroups,
} from "@/lib/stateAgents";
import { SITE_URL } from "@/lib/siteUrl";
import { getStateGuidePosts } from "@/lib/blog/registry";

const BASE_URL = SITE_URL;

export async function generateStaticParams() {
  try {
    const states = await stateService.fetchStateList();
    return states.map((state) => ({
      state: state.state_slug.current,
    }));

  } catch (error) {
    console.error("Error generating static params:", error);
    return []; // Return an empty array to avoid breaking the build
  }
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
  const ogImage = await stateService.fetchStateImage(params.state);

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
      images: [`/${ogImage}`],
    },
  };
}


export default async function StatePage(props: { params: Promise<{ state: string }> }) {
  const { state } = await props.params;
  let state_data: StateList | null = null;
  let agents_data: AgentsData | [] = [];
  let lenders_data: LendersData | [] = [];
  let formatted_data: StateAgentGroups = {};
  let state_code = '';

  try {
    state_data = await stateService.fetchStateDetails(state);
    state_code = state_data?.short_name;
  } catch (error) {
    console.error("Error fetching State Data", error);
  }
  try {
    lenders_data = await stateService.fetchLendersListByState(state_code);

    // Sort lenders based on AA_Score__c for the current state
    if (lenders_data?.records) {
      lenders_data.records.forEach((lender: Lenders) => {
        const stateAssignment = areaAssignmentsInState(lender, state)[0];
        // Assign the score for the current state, default to 0 if not found
        (lender as any).currentStateScore = stateAssignment ? stateAssignment.AA_Score__c : 0;
      });

      // Sort lenders in descending order based on currentStateScore
      lenders_data.records.sort((a: any, b: any) => b.currentStateScore - a.currentStateScore);
    }

  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  try {
    agents_data = await stateService.fetchAgentsListByState(state_code); // pass state abbreviation; e.g. TX, VA, etc.
    formatted_data = groupAgentsByAreaForState(agents_data.records ?? [], state);

  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  if (!state_data) {
    return <p>Failed to load data for the state.</p>;
  }

  const stateName = state_data?.state_name || 'Unknown';
  const agentCount = (agents_data as AgentsData).records?.length ?? 0;
  const lenderCount = (lenders_data as LendersData).records?.length ?? 0;
  const guidePosts = getStateGuidePosts(state, 6);

  const localBusinessJsonLd = buildStateLocalBusiness({
    stateName,
    stateSlug: state,
    agentCount,
    lenderCount,
  });

  const agentItemListJsonLd = buildAgentItemList(
    state,
    ((agents_data as AgentsData).records ?? []).map((agent) => ({
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
        cityList={Object.keys(formatted_data).sort()}
      />
      <StatePageHeroSecondSection
        stateName={state_data?.state_name || 'Unknown'}
      />
      <StatePageVaLoan cityName={state_data?.state_name || 'Unknown'} lendersData={lenders_data} state={state} />
      <StatePageCTA cityName={state_data?.state_name || 'Unknown'} />

      <StatePageRelatedGuides
        stateName={stateName}
        guides={guidePosts}
      />

      {Object.entries(formatted_data).sort().map(([cityName, agents]: [string, any[]]) => (
        <StatePageCityAgents key={cityName} city={cityName} agent_data={agents} state={state} />
      ))}

      <StatePageLetFindAgent />
      <StatePageWhyChooseVetpcs cityName={state_data?.state_name || 'Unknown'} />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
