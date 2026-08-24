import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPIWithRefresh, salesForceImageAPI } from '@/services/api';
import { escapeSoqlLiteral, isStateCode } from '@/services/soql';
import { logDebug, logError } from '@/services/loggingService';
import { getStateBySlug, STATE_LIST } from '@/lib/content/states';
import { absoluteUrl } from '@/lib/siteUrl';
import { toLegacyImage, type LegacyImage } from '@/lib/content/loader';

// Dynamic node:fs import keeps these calls out of client bundles that
// transitively import this module. Only ever runs server-side. (The module is
// now also hard server-only via the lib/content/states import above; type-only
// imports from client components remain fine because they compile away.)
const headshotFilenameCache = new Map<'agents' | 'lenders', Promise<ReadonlySet<string>>>();

async function resolveHeadshot(
  role: 'agents' | 'lenders',
  salesforceID: string,
): Promise<string | null> {
  const [{ default: fs }, { default: path }] = await Promise.all([
    import('node:fs'),
    import('node:path'),
  ]);
  const filename = `${salesforceID}.webp`;
  let filenamesPromise = headshotFilenameCache.get(role);
  if (!filenamesPromise) {
    const directory = path.join(process.cwd(), 'public', 'images', role);
    filenamesPromise = fs.promises.readdir(directory).then((filenames) => new Set(filenames));
    headshotFilenameCache.set(role, filenamesPromise);
  }

  // Salesforce 15-character IDs are case-sensitive. Reading the directory and
  // checking its returned names prevents case-insensitive development machines
  // from assigning one partner's headshot to a different, case-colliding ID.
  const filenames = await filenamesPromise;
  return filenames.has(filename) ? `/images/${role}/${filename}` : null;
}

// One row of the state list, sourced from the repo-committed export
// (content/_data/site/state_list.json via lib/content/states). The loader
// validates every field at module load and throws — so rows are always fully
// populated and unique by short_name/slug, and consumers keep the null-free
// shape the Sanity-era filtering used to guarantee.
export type StateList = {
  _id: string;
  _updatedAt: string;
  state_slug: { _type: 'slug'; current: string };
  short_name: string;
  state_name: string;
};

// fetchStateDetails returns the full state_list document. state_map keeps the
// Sanity-era `asset.image_url` shape (see LegacyImage) so consumers don't
// churn; the URL is now the local public/ path of the committed state map.
export type StateDetails = StateList & {
  _type: 'state_list';
  _createdAt: string;
  state_map: LegacyImage | null;
};

export interface Agent {
  Name: string;
  AccountId_15__c: string;
  PhotoUrl?: string; // Keeping optional as it's not returned in the query
  FirstName: string;
  LastName: string;
  Agent_Bio__pc: string;
  Military_Status__pc: string;
  Military_Service__pc: string;
  Brokerage_Name__pc: string;
  BillingAddress: {
    city?: string;
    state: string;
  };
  BillingStateCode: string;
  State_s_Licensed_in__pc: string;
  Other_States__pc?: string; // Multi-select picklist: Salesforce returns a ';'-delimited string (INCLUDES is a WHERE filter, not a shape-changer)
  PersonEmail?: string;
  PersonMobilePhone?: string;
  Area_Assignments__r?: {
    records: {
      Id: string;
      Name: string;
      AA_Score__c: number;
      Area__r: {
        Name: string;
        State__c: string;
      };
    }[];
  };
}

export interface Lenders {
  Name: string;
  AccountId_15__c: string;
  PhotoUrl?: string;
  FirstName: string;
  Agent_Bio__pc: string;
  Military_Status__pc: string;
  Military_Service__pc: string;
  Brokerage_Name__pc: string;
  BillingCity: string | null;
  BillingState: string;
  Individual_NMLS_ID__pc: string;
  Company_NMLS_ID__pc: string;
  Area_Assignments__r?: {
    records: {
      Id: string;
      Name: string;
      AA_Score__c: number;
      Area__r: {
        Name: string;
        State__c: string;
      };
    }[];
  };
}

export interface AgentsData {
  totalSize: number;
  done: boolean;
  records: Agent[];
}

export interface LendersData {
  totalSize: number;
  done: boolean;
  records: Lenders[];
}

// Empty-result sentinel shared by the agent/lender state queries. Callers
// (SSR pages, the areas route, MCP + llms.txt endpoints, concierge tools)
// access `.records` directly, so the "no matches" path must still be a
// well-formed AgentsData/LendersData object — not a bare array.
const EMPTY_RESULT = { totalSize: 0, done: true, records: [] };

// Internal, single source of truth for the state-licensed Account query that
// both fetchAgentsListByState and fetchLendersListByState run. Consolidating
// here means the SOQL escaping for the user-derived `state` value lives in
// exactly ONE place (defense in depth: the value is also validated below).
async function runStateLicensedQuery<T extends { AccountId_15__c: string }>(
  params: {
    state: string;
    selectClause: string;
    roleFlag: 'isAgent__pc' | 'isLender__pc';
    headshotRole: 'agents' | 'lenders';
    requireHeadshot: boolean;
    label: string;
  },
): Promise<{ totalSize: number; done: boolean; records: T[] }> {
  const { state, selectClause, roleFlag, headshotRole, requireHeadshot, label } = params;

  // Primary gate: only accept a 2-letter state code. Invalid input never
  // reaches the query builder. SSR pages rely on the empty-list path, so we
  // return an empty result rather than throwing.
  if (!isStateCode(state)) {
    logDebug(`Rejected non-state-code input for ${label}`, { state });
    return { ...EMPTY_RESULT, records: [] as T[] };
  }

  // Backstop: escape the (already validated) value before interpolating it
  // into the SOQL string literal.
  const safeState = escapeSoqlLiteral(state);

  const query = `
    ${selectClause}
    FROM Account
    WHERE ${roleFlag} = true
      AND Active_on_Website__pc = true
      AND (State_s_Licensed_in__pc LIKE '%${safeState}%'
          OR Other_States__pc INCLUDES ('${safeState}'))
  `.replace(/\s+/g, ' ').trim();

  const response = await salesForceAPIWithRefresh({
    endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
    type: RequestType.GET,
  });

  if (response?.status === 200) {
    const resolved = await Promise.all(
      response.data.records.map(async (record: T) => {
        const PhotoUrl = await resolveHeadshot(headshotRole, record.AccountId_15__c);
        if (PhotoUrl) return { ...record, PhotoUrl };
        return requireHeadshot ? null : record;
      }),
    );
    const records = resolved.filter((record): record is T => record !== null);

    return { ...response.data, records };
  } else {
    throw new Error('Failed to fetch State Based Agent List');
  }
}

const stateService = {
  // Kept async (data is now local) so the exported signatures — and every
  // consumer (SSR pages, sitemap, llms.txt, MCP, concierge tools, /api/v1) —
  // are unchanged from the Sanity-backed implementation.
  fetchStateList: async (): Promise<StateList[]> => {
    return STATE_LIST.map(({ _id, _updatedAt, state_slug, short_name, state_name }) => ({
      _id,
      _updatedAt,
      state_slug,
      short_name,
      state_name,
    }));
  },
  fetchStateDetails: async (state: string): Promise<StateDetails> => {
    const doc = getStateBySlug(state);
    if (!doc) {
      // Same throw-on-unknown-slug contract as the Sanity-backed version: the
      // [state] page catches it and renders its failure copy; the per-state
      // llms.txt route catches it and returns 404.
      throw new Error('Failed to fetch State Details');
    }
    return {
      _id: doc._id,
      _type: 'state_list',
      _createdAt: doc._createdAt,
      _updatedAt: doc._updatedAt,
      short_name: doc.short_name,
      state_name: doc.state_name,
      state_slug: doc.state_slug,
      state_map: toLegacyImage(doc.state_map),
    };
  },
  fetchAgentsListByState: async (
    state: string,
    options: { requireHeadshot?: boolean } = {},
  ): Promise<AgentsData> => {
    const { requireHeadshot = true } = options;
    try {
      const result = await runStateLicensedQuery<Agent>({
        state,
        selectClause: `
          SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc,
                Military_Service__pc, Brokerage_Name__pc, BillingAddress,
                (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
        `,
        roleFlag: 'isAgent__pc',
        headshotRole: 'agents',
        requireHeadshot,
        label: 'fetchAgentsListByState',
      });
      return result as AgentsData;
    } catch (error: any) {
      logError('Error fetching State Based Agent List', { state }, error);
      throw error;
    }
  },
  fetchLendersListByState: async (
    state: string,
    options: { requireHeadshot?: boolean } = {},
  ): Promise<LendersData> => {
    const { requireHeadshot = true } = options;
    try {
      const result = await runStateLicensedQuery<Lenders>({
        state,
        selectClause: `
          SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc, Military_Service__pc, Brokerage_Name__pc, BillingCity, BillingState, Individual_NMLS_ID__pc, Company_NMLS_ID__pc,
          (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
        `,
        roleFlag: 'isLender__pc',
        headshotRole: 'lenders',
        requireHeadshot,
        label: 'fetchLendersListByState',
      });
      return result as LendersData;
    } catch (error: any) {
      logError('Error fetching State Based Agent List', { state }, error);
      throw error;
    }
  },
  fetchStateImage: async (state_slug: string): Promise<string> => {
    const image = getStateBySlug(state_slug)?.state_map;
    if (!image) {
      // Same throw contract as before (unknown slug or missing map).
      throw new Error('No state map found');
    }
    // The Sanity implementation returned an absolute CDN URL; keep the
    // absolute-URL contract (the /api/v1 image route forwards this verbatim
    // to external consumers) by resolving the local path on the site origin.
    return absoluteUrl(image.path);
  },
  fetchAgentById: async (agentId: string): Promise<Agent | null> => {
    try {
      // Escape the (user-derived) id before interpolating it into the SOQL
      // string literal. Valid Salesforce ids are alphanumeric, so this is a
      // no-op for legitimate input and a backstop against injection otherwise.
      const safeAgentId = escapeSoqlLiteral(agentId);
      const query = `
        SELECT Name, Brokerage_Name__pc, PersonEmail, PersonMobilePhone
        FROM Account
        WHERE Id = '${safeAgentId}'
          AND Active_on_Website__pc = true
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPIWithRefresh({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });

      if (response?.status === 200 && response.data.records.length > 0) {
        const agent = response.data.records[0];
        return agent as Agent;
      }

      return null;
    } catch (error: any) {
      console.error("Error fetching Agent by ID:", error);
      throw error;
    }
  }
};

export default stateService;
