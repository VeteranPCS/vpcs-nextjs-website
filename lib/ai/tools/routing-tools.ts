import { tool } from 'ai';
import { z } from 'zod';
import { resolveDestinationLocation } from '@/lib/ai/routing/destination';
import { findCoverageAreasForDestination } from '@/lib/ai/routing/coverage';
import { getPartnersForCoverageArea } from '@/lib/ai/routing/partners';
import { logError, logInfo } from '@/services/loggingService';
import type {
  CoverageRoutingResult,
  DestinationResolution,
  PartnerRole,
  PartnersForCoverageAreaResult,
} from '@/lib/ai/routing/types';
import type { ToolResult } from '@/lib/ai/tools/types';

const destinationInputSchema = z.object({
  destination: z
    .string()
    .min(1)
    .describe('Military base, city/town, ZIP code, or state the user named.'),
  stateHint: z
    .string()
    .optional()
    .describe('Optional state name or code if the user supplied it separately.'),
});

const partnersForCoverageAreaInputSchema = z.object({
  state: z
    .string()
    .min(2)
    .describe('US state name, slug, or 2-letter code returned by findCoverageAreas.'),
  areaName: z
    .string()
    .optional()
    .describe('Coverage area name selected by findCoverageAreas. Omit only for state-only requests.'),
  role: z.enum(['agent', 'lender']).describe('Partner type the user asked for.'),
});

const resolveDestinationLocationTool = tool({
  description:
    'Resolve a user-named destination to deterministic geography. Use before partner lookup when the user names a military base, city, town, ZIP, or state. Returns ambiguity instead of guessing.',
  inputSchema: destinationInputSchema,
  execute: async ({
    destination,
    stateHint,
  }): Promise<ToolResult<{ destination: DestinationResolution }>> => {
    try {
      const resolved = resolveDestinationLocation(destination, stateHint);
      logInfo('Concierge routing tool: resolveDestinationLocation', {
        input: destination,
        type: resolved.type,
        stateCode: resolved.stateCode,
        normalizedName: resolved.normalizedName,
      });
      return { ok: true, data: { destination: resolved } };
    } catch (error) {
      logError('Concierge routing tool: resolveDestinationLocation failed', { destination }, error);
      return { ok: false, error: 'Could not resolve that destination right now.' };
    }
  },
});

const findCoverageAreasTool = tool({
  description:
    'Route a resolved destination to active VeteranPCS coverage areas. Use after resolveDestinationLocation and before getPartnersForCoverageArea. Returns closest same-state coverage and caveats when exact coverage is missing.',
  inputSchema: destinationInputSchema,
  execute: async ({
    destination,
    stateHint,
  }): Promise<ToolResult<CoverageRoutingResult>> => {
    try {
      const result = await findCoverageAreasForDestination(destination, stateHint);
      logInfo('Concierge routing tool: findCoverageAreas', {
        input: destination,
        stateCode: result.destination.stateCode,
        selectedArea: result.selectedCoverageArea?.areaName,
        needsClarification: result.needsClarification,
      });
      return { ok: true, data: result };
    } catch (error) {
      logError('Concierge routing tool: findCoverageAreas failed', { destination, stateHint }, error);
      return { ok: false, error: 'Could not route that destination right now.' };
    }
  },
});

const getPartnersForCoverageAreaTool = tool({
  description:
    'Get the top 3 actionable VeteranPCS partners for a selected coverage area. Call this only after findCoverageAreas picks an area, or with state only for broad state requests. Partners are sorted by AA_Score where available and include card hrefs.',
  inputSchema: partnersForCoverageAreaInputSchema,
  execute: async ({
    state,
    areaName,
    role,
  }): Promise<ToolResult<PartnersForCoverageAreaResult>> => {
    try {
      const result = await getPartnersForCoverageArea(state, areaName, role as PartnerRole);
      if (!result) {
        return { ok: false, error: `Could not find a state matching "${state}".` };
      }
      logInfo('Concierge routing tool: getPartnersForCoverageArea', {
        state: result.stateCode,
        areaName: result.areaName,
        role: result.role,
        count: result.partners.length,
        matchedArea: result.matchedArea,
      });
      return { ok: true, data: result };
    } catch (error) {
      logError('Concierge routing tool: getPartnersForCoverageArea failed', { state, areaName, role }, error);
      return { ok: false, error: 'Could not load partners for that coverage area right now.' };
    }
  },
});

export const routingTools = {
  resolveDestinationLocation: resolveDestinationLocationTool,
  findCoverageAreas: findCoverageAreasTool,
  getPartnersForCoverageArea: getPartnersForCoverageAreaTool,
};
