import 'server-only';

import {
  areaAssignmentsInState,
  groupAgentsByAreaForState,
  type StateAgentGroups,
} from '@/lib/stateAgents';
import stateService, {
  type AgentsData,
  type Lenders,
  type LendersData,
  type StateDetails,
} from '@/services/stateService';

export type StatePageData = {
  stateDetails: StateDetails;
  stateCode: string;
  agentsData: AgentsData;
  lendersData: LendersData;
  agentGroups: StateAgentGroups;
};

function lenderScoreForState(lender: Lenders, stateSlug: string): number {
  return areaAssignmentsInState(lender, stateSlug)[0]?.AA_Score__c ?? 0;
}

/**
 * Loads the complete Salesforce-backed partner payload for a state page.
 * Errors intentionally propagate: Next.js must not cache a transient upstream
 * failure as a successful page with empty partner arrays.
 */
export async function fetchStatePageData(stateSlug: string): Promise<StatePageData> {
  const stateDetails = await stateService.fetchStateDetails(stateSlug);
  const stateCode = stateDetails.short_name;

  const [agentsData, rawLendersData] = await Promise.all([
    stateService.fetchAgentsListByState(stateCode),
    stateService.fetchLendersListByState(stateCode),
  ]);

  const lendersData: LendersData = {
    ...rawLendersData,
    records: rawLendersData.records.toSorted(
      (left, right) => lenderScoreForState(right, stateSlug) - lenderScoreForState(left, stateSlug),
    ),
  };

  return {
    stateDetails,
    stateCode,
    agentsData,
    lendersData,
    agentGroups: groupAgentsByAreaForState(agentsData.records, stateSlug),
  };
}
