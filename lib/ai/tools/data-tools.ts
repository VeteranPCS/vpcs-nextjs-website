import { tool } from 'ai';
import { z } from 'zod';
import stateService, {
  type StateList,
} from '@/services/stateService';
import { logError, logInfo } from '@/services/loggingService';
import { stateInputSchema, type ToolResult } from '@/lib/ai/tools/types';
import { getPartnersForState } from '@/lib/ai/routing/partners';
import type { PublicPartner } from '@/lib/ai/routing/types';

// --- Public-facing trimmed shapes (NO PII: no PersonEmail or PersonMobilePhone) ---

export interface PublicState {
  slug: string;
  name: string;
}

export type PublicAgent = PublicPartner;
export type PublicLender = PublicPartner;

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

// --- Tool: getAgentsForState ---

const getAgentsForStateTool = tool({
  description:
    'Get up to 3 vetted real estate agents who serve a given US state. For city/base/ZIP requests, prefer resolveDestinationLocation -> findCoverageAreas -> getPartnersForCoverageArea first. Returns card-ready public data only (no email or phone).',
  inputSchema: stateInputSchema,
  execute: async ({
    state,
  }): Promise<ToolResult<{ stateSlug: string; stateName: string; agents: PublicAgent[] }>> => {
    try {
      const { state: matched } = await normalizeStateInput(state);
      if (!matched) {
        return { ok: false, error: `Could not find a state matching "${state}".` };
      }
      if (!matched.short_name) {
        logError('Concierge tool: getAgentsForState matched state missing short_name', {
          slug: matched.state_slug?.current,
          input: state,
        });
      }
      const data = await getPartnersForState(matched.short_name, 'agent');
      const agents = (data?.partners ?? []).filter((a) => a.id);
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
    'Get up to 3 vetted VA-loan lenders who serve a given US state. For city/base/ZIP requests, prefer resolveDestinationLocation -> findCoverageAreas -> getPartnersForCoverageArea first. Returns card-ready public data only (no email or phone).',
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
      if (!matched.short_name) {
        logError('Concierge tool: getLendersForState matched state missing short_name', {
          slug: matched.state_slug?.current,
          input: state,
        });
      }
      const data = await getPartnersForState(matched.short_name, 'lender');
      const lenders = (data?.partners ?? []).filter((l) => l.id);
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
