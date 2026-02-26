// lib/attio-data-loader.ts
// Pre-fetches all Attio data once and provides in-memory filtering
// This reduces 260+ API calls during build to just 5 calls

import { attio } from './attio';
import { unstable_cache } from 'next/cache';

// Cache duration: 1 hour (data is relatively static)
const CACHE_DURATION = 3600;

// Data interfaces
export interface AttioState {
  id: string;
  name: string;
  state_code: string;
  state_slug: string;
  lenders: string[]; // Array of lender IDs
}

export interface AttioArea {
  id: string;
  name: string;
  state: string; // State ID reference
}

export interface AttioAreaAssignment {
  id: string;
  agent: string; // Agent ID reference
  area: string; // Area ID reference
  status: string;
  aa_score: number;
}

export interface AttioAgent {
  id: string;
  salesforce_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  military_status: string;
  military_service: string;
  brokerage_name: string;
  city: string;
  headshot_url: string;
  active_on_website: boolean;
}

export interface AttioLender {
  id: string;
  salesforce_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  military_status: string;
  military_service: string;
  brokerage_name: string;
  company_name: string;
  city: string;
  individual_nmls: string;
  company_nmls: string;
  headshot_url: string;
  active_on_website: boolean;
}

// Using plain objects instead of Maps for JSON serialization compatibility with unstable_cache
export interface AttioDataCache {
  states: Record<string, AttioState>; // keyed by state_code
  statesBySlug: Record<string, AttioState>; // keyed by state_slug
  areas: Record<string, AttioArea>; // keyed by area ID
  areasByState: Record<string, AttioArea[]>; // keyed by state ID
  areaAssignments: AttioAreaAssignment[];
  assignmentsByArea: Record<string, AttioAreaAssignment[]>; // keyed by area ID
  assignmentsByAgent: Record<string, AttioAreaAssignment[]>; // keyed by agent ID
  agents: Record<string, AttioAgent>; // keyed by agent ID
  activeAgents: AttioAgent[];
  lenders: Record<string, AttioLender>; // keyed by lender ID
  activeLenders: AttioLender[];
}

// Singleton cache - populated once, reused across all page builds
let dataCache: AttioDataCache | null = null;

/**
 * Fetches all Attio data and builds lookup maps
 * Uses Next.js unstable_cache for build-time caching
 */
async function fetchAllData(): Promise<AttioDataCache> {
  console.log('[AttioDataLoader] Fetching all data from Attio...');
  const startTime = Date.now();

  // Fetch all data in parallel (5 API calls total)
  const [statesRaw, areasRaw, assignmentsRaw, agentsRaw, lendersRaw] = await Promise.all([
    attio.queryRecords('states', { limit: 100 }),
    attio.queryRecords('areas', { limit: 500 }),
    attio.queryRecords('area_assignments', { limit: 2000 }),
    attio.queryRecords('agents', { filter: { active_on_website: { $eq: true } }, limit: 2000 }),
    attio.queryRecords('lenders', { filter: { active_on_website: { $eq: true } }, limit: 500 }),
  ]);

  console.log(`[AttioDataLoader] Fetched: ${statesRaw.length} states, ${areasRaw.length} areas, ${assignmentsRaw.length} assignments, ${agentsRaw.length} agents, ${lendersRaw.length} lenders`);

  // Build lookup objects (using plain objects for JSON serialization compatibility)
  const states: Record<string, AttioState> = {};
  const statesBySlug: Record<string, AttioState> = {};
  for (const s of statesRaw) {
    const state: AttioState = {
      id: s.id,
      name: s.name,
      state_code: s.state_code,
      state_slug: s.state_slug,
      lenders: Array.isArray(s.lenders) ? s.lenders : s.lenders ? [s.lenders] : [],
    };
    states[s.state_code] = state;
    if (s.state_slug) {
      statesBySlug[s.state_slug] = state;
    }
  }

  const areas: Record<string, AttioArea> = {};
  const areasByState: Record<string, AttioArea[]> = {};
  for (const a of areasRaw) {
    const area: AttioArea = {
      id: a.id,
      name: a.name,
      state: a.state, // This is the state ID reference
    };
    areas[a.id] = area;

    const stateId = a.state;
    if (stateId) {
      if (!areasByState[stateId]) {
        areasByState[stateId] = [];
      }
      areasByState[stateId].push(area);
    }
  }

  const areaAssignments: AttioAreaAssignment[] = assignmentsRaw.map((aa: any) => ({
    id: aa.id,
    agent: aa.agent,
    area: aa.area,
    status: aa.status,
    aa_score: aa.aa_score || 0,
  }));

  const assignmentsByArea: Record<string, AttioAreaAssignment[]> = {};
  const assignmentsByAgent: Record<string, AttioAreaAssignment[]> = {};
  for (const aa of areaAssignments) {
    if (aa.area) {
      if (!assignmentsByArea[aa.area]) {
        assignmentsByArea[aa.area] = [];
      }
      assignmentsByArea[aa.area].push(aa);
    }
    if (aa.agent) {
      if (!assignmentsByAgent[aa.agent]) {
        assignmentsByAgent[aa.agent] = [];
      }
      assignmentsByAgent[aa.agent].push(aa);
    }
  }

  const agents: Record<string, AttioAgent> = {};
  const activeAgents: AttioAgent[] = [];
  for (const a of agentsRaw) {
    const agent: AttioAgent = {
      id: a.id,
      salesforce_id: a.salesforce_id,
      name: a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim(),
      first_name: a.first_name || '',
      last_name: a.last_name || '',
      email: a.email || '',
      phone: a.phone || '',
      bio: a.bio || '',
      military_status: a.military_status || '',
      military_service: a.military_service || '',
      brokerage_name: a.brokerage_name || '',
      city: a.city || '',
      headshot_url: a.headshot_url || '',
      active_on_website: a.active_on_website === true,
    };
    agents[a.id] = agent;
    if (agent.active_on_website) {
      activeAgents.push(agent);
    }
  }

  const lenders: Record<string, AttioLender> = {};
  const activeLenders: AttioLender[] = [];
  for (const l of lendersRaw) {
    const lender: AttioLender = {
      id: l.id,
      salesforce_id: l.salesforce_id,
      name: l.name || `${l.first_name || ''} ${l.last_name || ''}`.trim(),
      first_name: l.first_name || '',
      last_name: l.last_name || '',
      email: l.email || '',
      phone: l.phone || '',
      bio: l.bio || '',
      military_status: l.military_status || '',
      military_service: l.military_service || '',
      brokerage_name: l.brokerage_name || '',
      company_name: l.company_name || '',
      city: l.city || '',
      headshot_url: l.headshot_url || '',
      individual_nmls: l.individual_nmls || '',
      company_nmls: l.company_nmls || '',
      active_on_website: l.active_on_website === true,
    };
    lenders[l.id] = lender;
    if (lender.active_on_website) {
      activeLenders.push(lender);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[AttioDataLoader] Data loaded and indexed in ${elapsed}ms`);

  return {
    states,
    statesBySlug,
    areas,
    areasByState,
    areaAssignments,
    assignmentsByArea,
    assignmentsByAgent,
    agents,
    activeAgents,
    lenders,
    activeLenders,
  };
}

/**
 * Cached version of fetchAllData using Next.js unstable_cache
 * Cache is tagged so it can be invalidated via revalidateTag('attio-data')
 */
const getCachedData = unstable_cache(
  async () => fetchAllData(),
  ['attio-all-data'],
  {
    revalidate: CACHE_DURATION,
    tags: ['attio-data'],
  }
);

/**
 * Gets the Attio data cache, fetching if needed
 * During build, this is called once and the result is reused
 * Falls back to direct fetch when unstable_cache isn't available (scripts/testing)
 */
export async function getAttioData(): Promise<AttioDataCache> {
  // Use in-memory cache if available (same build process)
  if (dataCache) {
    return dataCache;
  }

  // Try unstable_cache first (works during Next.js rendering)
  // Falls back to direct fetch when outside Next.js context (scripts, tests)
  try {
    dataCache = await getCachedData();
  } catch (error) {
    // unstable_cache not available - fetch directly
    console.log('[AttioDataLoader] unstable_cache unavailable, fetching directly...');
    dataCache = await fetchAllData();
  }
  return dataCache;
}

/**
 * Gets agents for a specific state using pre-loaded data
 * @param stateCode - Two-letter state code (e.g., "TX")
 */
export async function getAgentsForState(stateCode: string): Promise<AttioAgent[]> {
  const data = await getAttioData();

  const state = data.states[stateCode];
  if (!state) {
    return [];
  }

  // Get all areas in this state
  const stateAreas = data.areasByState[state.id] || [];
  if (stateAreas.length === 0) {
    return [];
  }

  // Get all area IDs for this state
  const areaIds = new Set(stateAreas.map(a => a.id));

  // Get all active assignments for these areas
  const agentIds = new Set<string>();
  for (const areaId of areaIds) {
    const assignments = data.assignmentsByArea[areaId] || [];
    for (const aa of assignments) {
      if (aa.status === 'Active' && aa.agent) {
        agentIds.add(aa.agent);
      }
    }
  }

  // Filter to active agents with assignments in this state
  return data.activeAgents.filter(agent => agentIds.has(agent.id));
}

/**
 * Gets lenders for a specific state using pre-loaded data
 * @param stateCode - Two-letter state code (e.g., "TX")
 */
export async function getLendersForState(stateCode: string): Promise<AttioLender[]> {
  const data = await getAttioData();

  const state = data.states[stateCode];
  if (!state) {
    return [];
  }

  // State.lenders is the multi-ref field containing lender IDs
  const lenderIds = new Set(state.lenders);
  if (lenderIds.size === 0) {
    return [];
  }

  // Filter to active lenders assigned to this state
  return data.activeLenders.filter(lender => lenderIds.has(lender.id));
}

/**
 * Gets area assignments for a specific agent
 */
export async function getAreaAssignmentsForAgent(agentId: string): Promise<AttioAreaAssignment[]> {
  const data = await getAttioData();
  return data.assignmentsByAgent[agentId] || [];
}

/**
 * Gets area by ID
 */
export async function getAreaById(areaId: string): Promise<AttioArea | undefined> {
  const data = await getAttioData();
  return data.areas[areaId];
}

/**
 * Gets state by state code
 */
export async function getStateByCode(stateCode: string): Promise<AttioState | undefined> {
  const data = await getAttioData();
  return data.states[stateCode];
}

/**
 * Clears the in-memory cache (useful for testing or forced refresh)
 */
export function clearDataCache(): void {
  dataCache = null;
}
