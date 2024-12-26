import StatePageHeroSection from "@/components/StatePage/StatePaheHeroSection/StatePageHeroSection";
import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";
import StatePageVaLoan from "@/components/StatePage/StatePageVaLoan/StatePageVaLoan";
import StatePageCTA from "@/components/StatePage/StatePageCTA/StatePageCTA";
import StatePageCityAgents from "@/components/StatePage/StatePageCityAgents/StatePageCityAgents";
import StatePageLetFindAgent from "@/components/StatePage/StatePageLetFindAgent/StatePageLetFindAgent";
import StatePageWhyChooseVetpcs from "@/components/StatePage/StatePageWhyChooseVetpcs/StatePageWhyChooseVetpcs";
import FrequentlyAskedQuestion from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import Footer from "@/components/Footer/Footer";
import { memo } from "react";
import stateService, { CityList, AgentsData, LendersData } from "@/services/stateService";
import { AgentData } from '@/components/StatePage/StatePageCityAgents/StatePageCityAgents'

interface FormattedAgentData {
  [city: string]: AgentData[];
}

const MemoizedFrequentlyAskedQuestion = memo(FrequentlyAskedQuestion);

export default async function Home({ params }: { params: { city: string } }) {
  const { city } = params;
  let state_data: CityList | null = null;
  let agents_data: AgentsData | [] = [];
  let lenders_data: LendersData | [] = [];
  let formatted_data: FormattedAgentData = {};

  try {
    state_data = await stateService.fetchStateDetails(city);
  } catch (error) {
    console.error("Error fetching State Data", error);
  }

  try {
    lenders_data = await stateService.fetchLendersListByCity(city);
  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  try {
    agents_data = await stateService.fetchAgentsListByCity(city);
    formatted_data = agents_data.records.reduce((groups: any, agent: any) => {
      const city = agent.BillingCity || 'Unknown';
      if (!groups[city]) {
        groups[city] = [];
      }
      groups[city].push(agent);
      return groups;
    }, {});
  } catch (error) {
    console.error("Error fetching State Agent List", error);
  }

  if (!state_data || !Object.keys(formatted_data).length) {
    return <p>Failed to load data for the city.</p>;
  }

  return (
    <>
      <StatePageHeroSection cityName={state_data.city_name} cityImage={state_data.city_map} cityList={Object.keys(formatted_data)} />
      <StatePageHeroSecondSection />
      <StatePageVaLoan cityName={state_data.city_name} lendersData={lenders_data} />
      <StatePageCTA cityName={state_data.city_name} />

      {Object.entries(formatted_data).map(([cityName, agents]: [string, any[]]) => (
        <StatePageCityAgents key={cityName} city={cityName} agent_data={agents} />
      ))}

      <StatePageLetFindAgent />
      <StatePageWhyChooseVetpcs cityName={state_data.city_name} />
      <MemoizedFrequentlyAskedQuestion />
      <KeepInTouch />
      <Footer />
    </>
  );
}
