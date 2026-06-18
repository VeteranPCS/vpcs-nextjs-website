import { buildContactCtaHref } from '@/lib/contactAgentUrl';
import { sanitizeCityName } from '@/utils/sanitizeCityName';
import stateService, { type Agent, type Lenders } from '@/services/stateService';
import { findRoutingState, normalizeCompactText, stateMatches } from '@/lib/ai/routing/states';
import type {
  PartnerRecord,
  PartnerRole,
  PartnersForCoverageAreaResult,
  PublicPartner,
  RoutingState,
} from '@/lib/ai/routing/types';

const PARTNER_LIMIT = 3;

export async function getPartnersForCoverageArea(
  stateInput: string,
  areaName: string | undefined,
  role: PartnerRole,
): Promise<PartnersForCoverageAreaResult | null> {
  const state = findRoutingState(stateInput);
  if (!state) return null;

  if (role === 'agent') {
    const data = await stateService.fetchAgentsListByState(state.code, { requireHeadshot: false });
    const ranked = rankRecordsForArea(data.records ?? [], state, areaName);
    const matchedArea = !areaName || ranked.matchedArea;
    return {
      role,
      stateName: state.name,
      stateCode: state.code,
      stateSlug: state.slug,
      areaName,
      matchedArea,
      partners: ranked.records
        .slice(0, PARTNER_LIMIT)
        .map((agent) => trimAgent(agent, state, areaName)),
      caveat: matchedArea
        ? undefined
        : `I did not find area-ranked agents for ${areaName}, so these are top active agents in ${state.name}.`,
    };
  }

  const data = await stateService.fetchLendersListByState(state.code, { requireHeadshot: false });
  const ranked = rankRecordsForArea(data.records ?? [], state, areaName);
  const matchedArea = !areaName || ranked.matchedArea;
  return {
    role,
    stateName: state.name,
    stateCode: state.code,
    stateSlug: state.slug,
    areaName,
    matchedArea,
    partners: ranked.records
      .slice(0, PARTNER_LIMIT)
      .map((lender) => trimLender(lender, state, areaName)),
    caveat: matchedArea
      ? undefined
      : `I did not find area-ranked lenders for ${areaName}, so these are top active lenders in ${state.name}.`,
  };
}

export async function getPartnersForState(
  stateInput: string,
  role: PartnerRole,
): Promise<PartnersForCoverageAreaResult | null> {
  return getPartnersForCoverageArea(stateInput, undefined, role);
}

export function rankRecordsForArea<T extends PartnerRecord>(
  records: T[],
  state: RoutingState,
  areaName?: string,
): { records: T[]; matchedArea: boolean } {
  const recordsInState = records.filter((record) => assignmentsInState(record, state).length > 0);
  const source = recordsInState.length > 0 ? recordsInState : records;

  const areaMatches = areaName
    ? source.filter((record) => assignmentScoreForArea(record, state, areaName) !== null)
    : [];
  const rankedSource = areaMatches.length > 0 ? areaMatches : source;

  return {
    matchedArea: !areaName || areaMatches.length > 0,
    records: rankedSource
      .map((record, index) => ({
        record,
        index,
        areaScore: areaName ? assignmentScoreForArea(record, state, areaName) ?? 0 : 0,
        stateScore: maxStateAssignmentScore(record, state),
      }))
      .sort(
        (a, b) =>
          b.areaScore - a.areaScore ||
          b.stateScore - a.stateScore ||
          a.index - b.index,
      )
      .map(({ record }) => record),
  };
}

function trimAgent(agent: Agent, state: RoutingState, selectedArea?: string): PublicPartner {
  const city = selectedArea || primaryAreaName(agent, state) || agent.BillingAddress?.city || '';
  return {
    id: agent.AccountId_15__c ?? '',
    role: 'agent',
    name: agent.Name ?? '',
    firstName: agent.FirstName ?? '',
    lastName: agent.LastName ?? '',
    brokerage: agent.Brokerage_Name__pc ?? '',
    city,
    militaryStatus: agent.Military_Status__pc ?? '',
    militaryService: agent.Military_Service__pc ?? '',
    statesLicensed: agent.State_s_Licensed_in__pc ?? '',
    photoUrl: agent.PhotoUrl ?? '',
    bio: snippet(agent.Agent_Bio__pc ?? ''),
    contactHref: buildContactCtaHref({
      firstName: agent.FirstName,
      salesforceId: agent.AccountId_15__c,
      stateSlug: state.slug,
      form: 'agent',
    }),
    profileHref: city ? `/${state.slug}#${sanitizeCityName(city)}` : `/${state.slug}`,
    stateName: state.name,
    stateSlug: state.slug,
    areaName: selectedArea || primaryAreaName(agent, state) || undefined,
    aaScore: selectedArea
      ? assignmentScoreForArea(agent, state, selectedArea) ?? undefined
      : maxStateAssignmentScore(agent, state),
  };
}

function trimLender(lender: Lenders, state: RoutingState, selectedArea?: string): PublicPartner {
  const city = selectedArea || primaryAreaName(lender, state) || lender.BillingCity || '';
  return {
    id: lender.AccountId_15__c ?? '',
    role: 'lender',
    name: lender.Name ?? '',
    firstName: lender.FirstName ?? '',
    brokerage: lender.Brokerage_Name__pc ?? '',
    city,
    militaryStatus: lender.Military_Status__pc ?? '',
    militaryService: lender.Military_Service__pc ?? '',
    individualNmlsId: lender.Individual_NMLS_ID__pc ?? '',
    companyNmlsId: lender.Company_NMLS_ID__pc ?? '',
    photoUrl: lender.PhotoUrl ?? '',
    bio: snippet(lender.Agent_Bio__pc ?? ''),
    contactHref: buildContactCtaHref({
      firstName: lender.FirstName,
      salesforceId: lender.AccountId_15__c,
      stateSlug: state.slug,
      form: 'lender',
    }),
    profileHref: `/${state.slug}`,
    stateName: state.name,
    stateSlug: state.slug,
    areaName: selectedArea || primaryAreaName(lender, state) || undefined,
    aaScore: selectedArea
      ? assignmentScoreForArea(lender, state, selectedArea) ?? undefined
      : maxStateAssignmentScore(lender, state),
  };
}

function assignmentsInState(record: PartnerRecord, state: RoutingState) {
  return (record.Area_Assignments__r?.records ?? []).filter((assignment) =>
    stateMatches(assignment.Area__r?.State__c, state),
  );
}

function primaryAreaName(record: PartnerRecord, state: RoutingState): string {
  return assignmentsInState(record, state)[0]?.Area__r?.Name ?? '';
}

function maxStateAssignmentScore(record: PartnerRecord, state: RoutingState): number {
  return assignmentsInState(record, state).reduce(
    (max, assignment) => Math.max(max, assignment.AA_Score__c ?? 0),
    0,
  );
}

function assignmentScoreForArea(
  record: PartnerRecord,
  state: RoutingState,
  areaName: string,
): number | null {
  const target = normalizeCompactText(areaName);
  const assignment = assignmentsInState(record, state).find(
    (item) => normalizeCompactText(item.Area__r?.Name ?? '') === target,
  );
  return assignment ? assignment.AA_Score__c ?? 0 : null;
}

function snippet(input: string, maxLength = 160): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).replace(/\s+\S*$/, '')}...`;
}
