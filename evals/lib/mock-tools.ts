import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

const TX_AGENTS = [
  {
    id: '1', name: 'Jane Carter', firstName: 'Jane', lastName: 'Carter',
    brokerage: 'Lone Star Realty', city: 'Austin',
    militaryStatus: 'Veteran', militaryService: 'Army', statesLicensed: 'TX',
  },
  {
    id: '2', name: 'Marcus Webb', firstName: 'Marcus', lastName: 'Webb',
    brokerage: 'Hill Country Homes', city: 'San Antonio',
    militaryStatus: 'Military Spouse', militaryService: 'Navy', statesLicensed: 'TX',
  },
];

/** The only agent names a faithful answer may present for Texas. */
export const MOCK_TX_AGENT_NAMES = TX_AGENTS.map((a) => a.name);

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
      execute: async () => ({ ok: true, data: { states: [{ slug: 'texas', name: 'Texas' }] } }),
    }),
    getAgentsForState: tool({
      description: 'Get up to 5 vetted real estate agents who serve a given US state.',
      inputSchema: z.object({ state: z.string() }),
      execute: async () => ({
        ok: true,
        data: { stateSlug: 'texas', stateName: 'Texas', agents: TX_AGENTS },
      }),
    }),
    getLendersForState: tool({
      description: 'Get up to 5 vetted VA-loan lenders who serve a given US state.',
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
