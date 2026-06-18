import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { resolveDestinationLocation } from '@/lib/ai/routing/destination';
import type { CoverageRoutingResult, PublicPartner } from '@/lib/ai/routing/types';

const TX_AGENTS = [
  {
    id: '1', name: 'Jane Carter', firstName: 'Jane', lastName: 'Carter',
    brokerage: 'Lone Star Realty', city: 'Austin',
    militaryStatus: 'Veteran', militaryService: 'Army', statesLicensed: 'TX',
    role: 'agent', photoUrl: '', bio: 'Army veteran serving Austin-area military buyers.',
    contactHref: '/contact-agent?form=agent&fn=Jane&id=1&state=texas',
    profileHref: '/texas#austin', stateName: 'Texas', stateSlug: 'texas',
  },
  {
    id: '2', name: 'Marcus Webb', firstName: 'Marcus', lastName: 'Webb',
    brokerage: 'Hill Country Homes', city: 'San Antonio',
    militaryStatus: 'Military Spouse', militaryService: 'Navy', statesLicensed: 'TX',
    role: 'agent', photoUrl: '', bio: 'Military spouse helping San Antonio families.',
    contactHref: '/contact-agent?form=agent&fn=Marcus&id=2&state=texas',
    profileHref: '/texas#san-antonio', stateName: 'Texas', stateSlug: 'texas',
  },
];

/** The only agent names a faithful answer may present for Texas. */
export const MOCK_TX_AGENT_NAMES = TX_AGENTS.map((a) => a.name);

const MOCK_PARTNERS: PublicPartner[] = [
  partner('1', 'Jason Anderson', 'Jason', 'agent', 'Colorado Springs', 'Colorado', 'colorado'),
  partner('2', 'Ciarra Borucki', 'Ciarra', 'agent', 'Colorado Springs', 'Colorado', 'colorado'),
  partner('3', 'Anthony Gracia', 'Anthony', 'agent', 'Colorado Springs', 'Colorado', 'colorado'),
  partner('4', 'Denver Partner', 'Denver', 'agent', 'Denver', 'Colorado', 'colorado'),
  partner('5', 'Norfolk Partner', 'Norfolk', 'agent', 'Norfolk', 'Virginia', 'virginia'),
  partner('6', 'Killeen Partner', 'Killeen', 'agent', 'Killeen - Fort Hood', 'Texas', 'texas'),
];

function partner(
  id: string,
  name: string,
  firstName: string,
  role: 'agent' | 'lender',
  areaName: string,
  stateName: string,
  stateSlug: string,
): PublicPartner {
  return {
    id,
    role,
    name,
    firstName,
    brokerage: `${areaName} Realty`,
    city: areaName,
    militaryStatus: 'Veteran',
    militaryService: 'Army',
    photoUrl: '',
    bio: `Serves military families in ${areaName}.`,
    contactHref: role === 'agent'
      ? `/contact-agent?form=agent&fn=${firstName}&id=${id}&state=${stateSlug}`
      : `/contact-lender?form=lender&fn=${firstName}&id=${id}&state=${stateSlug}`,
    profileHref: `/${stateSlug}`,
    stateName,
    stateSlug,
    areaName,
    aaScore: 90 - Number(id),
  };
}

function routeFixture(destination: string, stateHint?: string): CoverageRoutingResult {
  const resolved = resolveDestinationLocation(destination, stateHint);
  if (resolved.type === 'ambiguous') {
    return {
      destination: resolved,
      coverageAreas: [],
      needsClarification: true,
      caveat: resolved.caveat,
    };
  }

  const input = `${destination} ${stateHint ?? ''}`.toLowerCase();
  const selected =
    input.includes('boulder') || input.includes('80301')
      ? coverageArea('Denver', 'Colorado', 'CO', 'colorado', 25, false, 'high')
      : input.includes('norfolk')
        ? coverageArea('Norfolk', 'Virginia', 'VA', 'virginia', 0, true, 'high')
        : input.includes('cavazos') || input.includes('hood')
          ? coverageArea('Killeen - Fort Hood', 'Texas', 'TX', 'texas', 0, true, 'high')
          : input.includes('colorado') && resolved.type === 'state'
            ? coverageArea('Colorado Springs', 'Colorado', 'CO', 'colorado', undefined, false, 'medium')
            : coverageArea('Colorado Springs', 'Colorado', 'CO', 'colorado', 0, true, 'high');

  const caveat = resolved.type === 'state'
    ? resolved.caveat
    : selected.exactMatch
      ? undefined
      : `I do not see a ${resolved.normalizedName}-specific VeteranPCS coverage area right now. The closest active VeteranPCS coverage area I found is ${selected.areaName}.`;

  return {
    destination: resolved,
    coverageAreas: [selected],
    selectedCoverageArea: selected,
    needsClarification: false,
    caveat,
  };
}

function coverageArea(
  areaName: string,
  stateName: string,
  stateCode: string,
  stateSlug: string,
  distanceMiles: number | undefined,
  exactMatch: boolean,
  confidence: 'high' | 'medium' | 'low',
) {
  return {
    areaName,
    slug: areaName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    stateName,
    stateCode,
    stateSlug,
    latitude: 0,
    longitude: 0,
    agentCount: 3,
    lenderAvailable: true,
    topAgentScore: 90,
    topLenderScore: 80,
    aliases: [],
    distanceMiles,
    confidence,
    reason: exactMatch
      ? `${areaName} matches this active VeteranPCS coverage area.`
      : `Closest active VeteranPCS coverage area found in ${stateName}.`,
    exactMatch,
  };
}

/**
 * Mock versions of the real concierge tools (same names + shapes) returning
 * canned data. Deterministic, free, and offline — no Salesforce/Sanity.
 * submitAgentRequest keeps needsApproval:true to mirror production.
 */
export function mockTools(): ToolSet {
  return {
    listStates: tool({
      description: 'List US states with VeteranPCS partners.',
      inputSchema: z.object({}),
      execute: async () => ({ ok: true, data: { states: [{ slug: 'texas', name: 'Texas' }, { slug: 'colorado', name: 'Colorado' }] } }),
    }),
    resolveDestinationLocation: tool({
      description:
        'Resolve a user-named destination to deterministic geography. Use before partner lookup for bases, cities, ZIPs, and states.',
      inputSchema: z.object({ destination: z.string(), stateHint: z.string().optional() }),
      execute: async ({ destination, stateHint }) => ({
        ok: true,
        data: { destination: resolveDestinationLocation(destination, stateHint) },
      }),
    }),
    findCoverageAreas: tool({
      description:
        'Route a resolved destination to active VeteranPCS coverage areas and return caveats when exact coverage is missing.',
      inputSchema: z.object({ destination: z.string(), stateHint: z.string().optional() }),
      execute: async ({ destination, stateHint }) => ({
        ok: true,
        data: routeFixture(destination, stateHint),
      }),
    }),
    getPartnersForCoverageArea: tool({
      description:
        'Get the top 3 actionable VeteranPCS partners for a selected coverage area. Call after findCoverageAreas.',
      inputSchema: z.object({
        state: z.string(),
        areaName: z.string().optional(),
        role: z.enum(['agent', 'lender']),
      }),
      execute: async ({ state, areaName, role }) => {
        const normalizedState = state.toLowerCase().includes('virginia')
          ? 'Virginia'
          : state.toLowerCase().includes('texas') || state.toUpperCase() === 'TX'
            ? 'Texas'
            : 'Colorado';
        const partners = MOCK_PARTNERS
          .filter((item) => item.role === role)
          .filter((item) => item.stateName === normalizedState)
          .filter((item) => !areaName || item.areaName === areaName)
          .slice(0, 3);
        return {
          ok: true,
          data: {
            role,
            stateName: normalizedState,
            stateCode: normalizedState === 'Colorado' ? 'CO' : normalizedState === 'Virginia' ? 'VA' : 'TX',
            stateSlug: normalizedState.toLowerCase().replace(/\s+/g, '-'),
            areaName,
            matchedArea: Boolean(areaName),
            partners,
          },
        };
      },
    }),
    getAgentsForState: tool({
      description: 'Get up to 3 vetted real estate agents who serve a given US state.',
      inputSchema: z.object({ state: z.string() }),
      execute: async () => ({
        ok: true,
        data: { stateSlug: 'texas', stateName: 'Texas', agents: TX_AGENTS },
      }),
    }),
    getLendersForState: tool({
      description: 'Get up to 3 vetted VA-loan lenders who serve a given US state.',
      inputSchema: z.object({ state: z.string() }),
      execute: async () => ({
        ok: true,
        data: { stateSlug: 'texas', stateName: 'Texas', lenders: [] },
      }),
    }),
    submitAgentRequest: tool({
      description:
        'Send the user contact details so a vetted agent can reach out. Required: firstName, lastName, email, phone, destinationState.',
      inputSchema: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string(),
        destinationState: z.string(),
      }),
      needsApproval: true,
      execute: async () => ({ ok: true, data: { kind: 'agent', message: 'sent' } }),
    }),
  };
}
