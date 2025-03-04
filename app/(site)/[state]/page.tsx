import StatePageHeroSection from "@/components/StatePage/StatePaheHeroSection/StatePageHeroSection";
import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";
import StatePageVaLoan from "@/components/StatePage/StatePageVaLoan/StatePageVaLoan";
import StatePageCTA from "@/components/StatePage/StatePageCTA/StatePageCTA";
import StatePageCityAgents from "@/components/StatePage/StatePageCityAgents/StatePageCityAgents";
import StatePageLetFindAgent from "@/components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent";
import StatePageWhyChooseVetpcs from "@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcs";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import stateService, { StateList as StateList, AgentsData, LendersData } from "@/services/stateService";
import { AgentData } from '@/components/StatePage/StatePageCityAgents/StatePageCityAgents'
import { Agent } from "@/services/stateService";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FormattedAgentData {
  [city: string]: AgentData[];
}

const stateUrlToStateName = {
  "alabama": "alabama",
  "alaska": "alaska",
  "arizona": "arizona",
  "arkansas": "arkansas",
  "california": "california",
  "colorado": "colorado",
  "connecticut": "connecticut",
  "delaware": "delaware",
  "florida": "florida",
  "georgia": "georgia",
  "hawaii": "hawaii",
  "idaho": "idaho",
  "illinois": "illinois",
  "indiana": "indiana",
  "iowa": "iowa",
  "kansas": "kansas",
  "kentucky": "kentucky",
  "louisiana": "louisiana",
  "maine": "maine",
  "maryland": "maryland",
  "massachusetts": "massachusetts",
  "michigan": "michigan",
  "minnesota": "minnesota",
  "mississippi": "mississippi",
  "missouri": "missouri",
  "montana": "montana",
  "nebraska": "nebraska",
  "nevada": "nevada",
  "new-hampshire": "new hampshire",
  "new-jersey": "new jersey",
  "new-mexico": "new mexico",
  "new-york": "new york",
  "north-carolina": "north carolina",
  "north-dakota": "north dakota",
  "ohio": "ohio",
  "oklahoma": "oklahoma",
  "oregon": "oregon",
  "pennsylvania": "pennsylvania",
  "rhode-island": "rhode island",
  "south-carolina": "south carolina",
  "south-dakota": "south dakota",
  "tennessee": "tennessee",
  "texas": "texas",
  "utah": "utah",
  "vermont": "vermont",
  "virginia": "virginia",
  "washington-dc": "district of columbia",
  "west-virginia": "west virginia",
  "wisconsin": "wisconsin",
  "wyoming": "wyoming"
}

export async function generateStaticParams() {
  try {
    const states = await stateService.fetchStateList();
    return states.map((state) => ({
      state: state.city_slug.current,
    }));

  } catch (error) {
    console.error("Error generating static params:", error);
    return []; // Return an empty array to avoid breaking the build
  }
}

export async function generateMetadata({ params }: { params: { state: string } }) {
  const stateName = params.state
    .replace(/-/g, " ") // Replace hyphens with spaces
    .toLowerCase()      // Convert to lowercase
    .split(" ")         // Split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" ");

  const ogTitle = `Find Military Friendly Real Estate Agents in ${stateName} - Veteran PCS`;
  const ogDescription = `Connect with the best veteran real estate agents in ${stateName} who understand the unique needs of veterans and military families.`;
  const ogImage = await stateService.fetchStateImage(params.state);

  return {
    metadataBase: new URL(BASE_URL || ""),
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


export default async function StatePage({ params }: { params: { state: string } }) {
  const { state } = await params;
  let state_data: StateList | null = null;
  let agents_data: AgentsData | [] = [];
  let lenders_data: LendersData | [] = [];
  let formatted_data: FormattedAgentData = {};
  let state_code = '';

  try {
    state_data = await stateService.fetchStateDetails(state);
    state_code = state_data?.short_name;
  } catch (error) {
    console.error("Error fetching State Data", error);
  }
  try {
    lenders_data = await stateService.fetchLendersListByState(state_code);
  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  try {
    agents_data = await stateService.fetchAgentsListByState(state_code); // pass state abbreviation; e.g. TX, VA, etc.
    formatted_data = agents_data.records.reduce((groups: any, agent: Agent) => {
      const areaAssignments = agent.Area_Assignments__r?.records || [];

      // Filter to only areas within the current state
      const areasInState = areaAssignments
        .filter((record: any) => record.Area__r.State__c.toLowerCase() === stateUrlToStateName[state as keyof typeof stateUrlToStateName])
        .map((record: any) => record.Area__r.Name);

      // If the agent has no areas in the current state, skip them
      if (areasInState.length === 0) {
        return groups;
      }

      // Add the agent to each relevant group
      areasInState.forEach((areaName: string) => {
        if (!groups[areaName]) {
          groups[areaName] = [];
        }
        groups[areaName].push(agent);
      });

      return groups;
    }, {});

  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  if (!state_data) {
    return <p>Failed to load data for the city.</p>;
  }

  return (
    <>
      <StatePageHeroSection
        stateName={state_data?.city_name || 'Unknown'}
        stateImage={state_data?.city_map}  // Pass cityImage as an object
        cityList={Object.keys(formatted_data).sort()}
      />
      <StatePageHeroSecondSection
        stateName={state_data?.city_name || 'Unknown'}
      />
      <StatePageVaLoan cityName={state_data?.city_name || 'Unknown'} lendersData={lenders_data} state={params.state} />
      <StatePageCTA cityName={state_data?.city_name || 'Unknown'} />

      {Object.entries(formatted_data).sort().map(([cityName, agents]: [string, any[]]) => (
        <StatePageCityAgents key={cityName} city={cityName} agent_data={agents} state={params.state} />
      ))}

      <StatePageLetFindAgent />
      <StatePageWhyChooseVetpcs cityName={state_data?.city_name || 'Unknown'} />
      <FrequentlyAskedQuestion />
      <KeepInTouch />
    </>
  );
}
