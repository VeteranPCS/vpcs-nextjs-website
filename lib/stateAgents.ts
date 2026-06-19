import 'server-only';

import type { Agent } from '@/services/stateService';
import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import { normalizeStateSlug } from '@/lib/states';

type AreaAssignment = {
  AA_Score__c?: number;
  Area__r?: {
    Name?: string | null;
    State__c?: string | null;
  } | null;
};

type RecordWithAreaAssignments = {
  Area_Assignments__r?: {
    records?: AreaAssignment[];
  } | null;
};

export type AgentWithCityScore = Agent & {
  cityScore?: number;
};

export type StateAgentGroups = Record<string, AgentWithCityScore[]>;

export function areaSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function areaAssignmentsInState<T extends RecordWithAreaAssignments>(
  record: T,
  stateSlugInput: string,
): AreaAssignment[] {
  const targetStateSlug = normalizeStateSlug(stateSlugInput);
  if (!targetStateSlug) return [];

  return (record.Area_Assignments__r?.records ?? []).filter((assignment) => {
    const areaStateSlug = normalizeStateSlug(assignment.Area__r?.State__c);
    return Boolean(areaStateSlug && areaStateSlug === targetStateSlug);
  });
}

export function groupAgentsByAreaForState(
  agents: Agent[],
  stateSlugInput: string,
): StateAgentGroups {
  const groups: StateAgentGroups = {};

  for (const agent of agents) {
    const areasInState = areaAssignmentsInState(agent, stateSlugInput)
      .filter((assignment) => assignment.Area__r?.Name)
      .map((assignment) => ({
        name: assignment.Area__r!.Name!,
        score: assignment.AA_Score__c ?? 0,
      }));

    for (const area of areasInState) {
      if (!groups[area.name]) groups[area.name] = [];
      groups[area.name].push({
        ...agent,
        cityScore: area.score,
      });
    }
  }

  for (const city of Object.keys(groups)) {
    groups[city].sort((a, b) => (b.cityScore ?? 0) - (a.cityScore ?? 0));
  }

  return groups;
}

export function topAgentForArea(
  agents: Agent[],
  stateSlugInput: string,
  areaSlug: string,
): AgentWithCityScore | null {
  const groups = groupAgentsByAreaForState(agents, stateSlugInput);
  for (const [areaName, areaAgents] of Object.entries(groups)) {
    if (areaSlugFromName(areaName) === areaSlug) return areaAgents[0] ?? null;
  }
  return null;
}

export function buildAgentContactHref(agent: Agent, stateSlugInput: string): string {
  return buildContactCtaHref({
    firstName: agent.FirstName,
    salesforceId: agent.AccountId_15__c,
    stateSlug: normalizeStateSlug(stateSlugInput),
    form: 'agent',
  });
}
