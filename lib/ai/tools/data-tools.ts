import { tool } from 'ai';
import { z } from 'zod';
import stateService, {
  type Agent,
  type Lenders,
  type StateList,
} from '@/services/stateService';
import { logError, logInfo } from '@/services/loggingService';
import { stateInputSchema, type ToolResult } from '@/lib/ai/tools/types';

// --- Public-facing trimmed shapes (NO PII: no PhotoUrl, PersonEmail, PersonMobilePhone) ---

export interface PublicState {
  slug: string;
  name: string;
}

export interface PublicAgent {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  brokerage: string;
  city: string;
  militaryStatus: string;
  militaryService: string;
  statesLicensed: string;
}

export interface PublicLender {
  id: string;
  name: string;
  firstName: string;
  brokerage: string;
  city: string;
  militaryStatus: string;
  militaryService: string;
  individualNmlsId: string;
  companyNmlsId: string;
}

// --- State normalization ---

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function normalizeStateInput(
  raw: string,
): Promise<{ state: StateList | null; allStates: StateList[] }> {
  const allStates = await stateService.fetchStateList();
  const target = slugify(raw);
  const match =
    allStates.find((s) => s.state_slug?.current === target) ??
    allStates.find((s) => slugify(s.state_name || '') === target) ??
    allStates.find((s) => slugify(s.short_name || '') === target) ??
    null;
  return { state: match, allStates };
}

// --- Tool: listStates ---

const listStatesTool = tool({
  description:
    'List every US state where VeteranPCS has vetted partner agents and lenders. Returns slug and display name for each state.',
  inputSchema: z.object({}),
  execute: async (): Promise<
    ToolResult<{ states: PublicState[] }>
  > => {
    try {
      const raw = await stateService.fetchStateList();
      const states: PublicState[] = raw
        .filter((s) => s.state_slug?.current && s.state_name)
        .map((s) => ({
          slug: s.state_slug.current,
          name: s.state_name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      logInfo('Concierge tool: listStates', { count: states.length });
      return { ok: true, data: { states } };
    } catch (error) {
      logError('Concierge tool: listStates failed', undefined, error);
      return { ok: false, error: 'Could not load the list of states right now.' };
    }
  },
});

// --- Tool: getStateDetails ---

const getStateDetailsTool = tool({
  description:
    'Get details for a single US state by slug ("texas") or name ("Texas"). Use this when the user names a state and you need its Sanity record (display name, image, etc.).',
  inputSchema: stateInputSchema,
  execute: async ({ state }): Promise<ToolResult<{ state: StateList }>> => {
    try {
      const { state: matched } = await normalizeStateInput(state);
      if (!matched) {
        logInfo('Concierge tool: getStateDetails unknown state', {
          input: state,
        });
        return { ok: false, error: `Could not find a state matching "${state}".` };
      }
      const details = await stateService.fetchStateDetails(
        matched.state_slug.current,
      );
      logInfo('Concierge tool: getStateDetails', {
        slug: matched.state_slug.current,
      });
      return { ok: true, data: { state: details } };
    } catch (error) {
      logError('Concierge tool: getStateDetails failed', { state }, error);
      return { ok: false, error: 'Could not load state details right now.' };
    }
  },
});

// --- Helpers for ranking / trimming ---

function topAreaCity(record: Agent | Lenders): string {
  const area = record.Area_Assignments__r?.records?.[0]?.Area__r?.Name;
  return area ?? '';
}

function trimAgent(agent: Agent): PublicAgent {
  const billingCity = agent.BillingAddress?.city ?? '';
  return {
    id: agent.AccountId_15__c ?? '',
    name: agent.Name ?? '',
    firstName: agent.FirstName ?? '',
    lastName: agent.LastName ?? '',
    brokerage: agent.Brokerage_Name__pc ?? '',
    city: billingCity || topAreaCity(agent),
    militaryStatus: agent.Military_Status__pc ?? '',
    militaryService: agent.Military_Service__pc ?? '',
    statesLicensed: agent.State_s_Licensed_in__pc ?? '',
  };
}

function trimLender(lender: Lenders): PublicLender {
  const billingCity = lender.BillingCity ?? '';
  return {
    id: lender.AccountId_15__c ?? '',
    name: lender.Name ?? '',
    firstName: lender.FirstName ?? '',
    brokerage: lender.Brokerage_Name__pc ?? '',
    city: billingCity || topAreaCity(lender),
    militaryStatus: lender.Military_Status__pc ?? '',
    militaryService: lender.Military_Service__pc ?? '',
    individualNmlsId: lender.Individual_NMLS_ID__pc ?? '',
    companyNmlsId: lender.Company_NMLS_ID__pc ?? '',
  };
}

// --- Tool: getAgentsForState ---

const getAgentsForStateTool = tool({
  description:
    'Get up to 5 vetted real estate agents who serve a given US state. Use this when the user wants help finding an agent. Returns trimmed, public-facing data only (no email or phone).',
  inputSchema: stateInputSchema,
  execute: async ({
    state,
  }): Promise<ToolResult<{ stateSlug: string; stateName: string; agents: PublicAgent[] }>> => {
    try {
      const { state: matched } = await normalizeStateInput(state);
      if (!matched) {
        return { ok: false, error: `Could not find a state matching "${state}".` };
      }
      const data = await stateService.fetchAgentsListByState(matched.state_name);
      const agents = (data.records || [])
        .map(trimAgent)
        .filter((a) => a.id)
        .slice(0, 5);
      logInfo('Concierge tool: getAgentsForState', {
        slug: matched.state_slug.current,
        count: agents.length,
      });
      return {
        ok: true,
        data: {
          stateSlug: matched.state_slug.current,
          stateName: matched.state_name,
          agents,
        },
      };
    } catch (error) {
      logError('Concierge tool: getAgentsForState failed', { state }, error);
      return { ok: false, error: 'Could not load agents for that state right now.' };
    }
  },
});

// --- Tool: getLendersForState ---

const getLendersForStateTool = tool({
  description:
    'Get up to 5 vetted VA-loan lenders who serve a given US state. Use this when the user wants help finding a lender. Returns trimmed, public-facing data only (no email or phone).',
  inputSchema: stateInputSchema,
  execute: async ({
    state,
  }): Promise<
    ToolResult<{ stateSlug: string; stateName: string; lenders: PublicLender[] }>
  > => {
    try {
      const { state: matched } = await normalizeStateInput(state);
      if (!matched) {
        return { ok: false, error: `Could not find a state matching "${state}".` };
      }
      const data = await stateService.fetchLendersListByState(matched.state_name);
      const lenders = (data.records || [])
        .map(trimLender)
        .filter((l) => l.id)
        .slice(0, 5);
      logInfo('Concierge tool: getLendersForState', {
        slug: matched.state_slug.current,
        count: lenders.length,
      });
      return {
        ok: true,
        data: {
          stateSlug: matched.state_slug.current,
          stateName: matched.state_name,
          lenders,
        },
      };
    } catch (error) {
      logError('Concierge tool: getLendersForState failed', { state }, error);
      return { ok: false, error: 'Could not load lenders for that state right now.' };
    }
  },
});

export const dataTools = {
  listStates: listStatesTool,
  getStateDetails: getStateDetailsTool,
  getAgentsForState: getAgentsForStateTool,
  getLendersForState: getLendersForStateTool,
};
