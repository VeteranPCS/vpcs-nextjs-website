import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI, salesForceImageAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { Image } from 'sanity';

// Dynamic node:fs import keeps these calls out of client bundles that
// transitively import this module. Only ever runs server-side.
async function resolveHeadshot(
  role: 'agents' | 'lenders',
  salesforceID: string,
): Promise<string | null> {
  const [{ default: fs }, { default: path }] = await Promise.all([
    import('node:fs'),
    import('node:path'),
  ]);
  const rel = `/images/${role}/${salesforceID}.webp`;
  return fs.existsSync(path.join(process.cwd(), 'public', rel)) ? rel : null;
}

interface StateMap extends Image {
  _type: 'image';
  alt: string;
  asset: {
    _ref: string;
    _type: 'reference'
    image_url: string;
  };
}

interface StateSlug {
  current: string;
  _type: 'slug';
}

export interface StateList {
  short_name: string;
  _id: string;
  _updatedAt: string;
  state_map: StateMap;
  state_name: string;
  _createdAt: string;
  _rev: string;
  _type: 'state_list';
  state_slug: StateSlug;
}

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
  Other_States__pc?: string[]; // INCLUDES can return an array
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

const stateService = {
  fetchStateList: async (): Promise<StateList[]> => {
    try {
      const response = await client.fetch(`*[_type == "state_list"]{ state_slug, short_name }`)
      if (response) {
        const seen = new Set<string>();
        return (response as StateList[]).filter((state) => {
          if (seen.has(state.short_name)) return false;
          seen.add(state.short_name);
          return true;
        });
      } else {
        throw new Error('Failed to fetch State List');
      }
    } catch (error: any) {
      console.error('Error fetching State List:', error);
      throw error;
    }
  },
  fetchStateDetails: async (state: string): Promise<StateList> => {
    try {
      const state_detail = await client.fetch<StateList>(`*[_type == "state_list" && state_slug.current == $state][0]`, { state: state });

      if (state_detail) {
        return {
          ...state_detail,
          state_map: state_detail.state_map ? {
            ...state_detail.state_map,
            asset: {
              ...state_detail.state_map.asset,
              image_url: urlForImage(state_detail.state_map)
            }
          } : null
        } as StateList;
      } else {
        throw new Error('Failed to fetch State Details');
      }
    } catch (error: any) {
      console.error('Error fetching State Details:', error);
      throw error;
    }
  },
  fetchAgentsListByState: async (state: string): Promise<AgentsData> => {
    try {
      const query = `
        SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc,
              Military_Service__pc, Brokerage_Name__pc, BillingAddress,
              (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
        FROM Account
        WHERE isAgent__pc = true
          AND Active_on_Website__pc = true
          AND (State_s_Licensed_in__pc LIKE '%${state}%'
              OR Other_States__pc INCLUDES ('${state}'))
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPI({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });

      if (response?.status === 200) {
        const resolved = await Promise.all(
          response.data.records.map(async (agent: Agent) => {
            const PhotoUrl = await resolveHeadshot('agents', agent.AccountId_15__c);
            return PhotoUrl ? { ...agent, PhotoUrl } : null;
          }),
        );
        const records = resolved.filter((agent): agent is Agent => agent !== null);

        return { ...response.data, records } as AgentsData;
      } else if (response?.status === 401) {
        // Token expired: Refresh and retry
        try {
          await getSalesforceToken(); // Refresh token
          return await stateService.fetchAgentsListByState(state); // Retry the request
        } catch (tokenError) {
          console.error("Failed to refresh token:", tokenError);
          throw tokenError;
        }
      } else {
        throw new Error("Failed to fetch State Based Agent List");
      }
    } catch (error: any) {
      console.error("Error fetching State Based Agent List:", error);
      throw error;
    }
  },
  fetchLendersListByState: async (state: string): Promise<LendersData> => {
    try {
      const query = `
      SELECT Name, AccountId_15__c, FirstName, Agent_Bio__pc, Military_Status__pc, Military_Service__pc, Brokerage_Name__pc, BillingCity, BillingState, Individual_NMLS_ID__pc, Company_NMLS_ID__pc,
      (SELECT Id, Name, AA_Score__c, Area__r.Name, Area__r.State__c FROM Area_Assignments__r ORDER BY AA_Score__c DESC)
      FROM Account
      WHERE isLender__pc = true
        AND Active_on_Website__pc = true
        AND (State_s_Licensed_in__pc LIKE '%${state}%'
            OR Other_States__pc INCLUDES ('${state}'))
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPI({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });
      if (response?.status === 200) {
        const resolved = await Promise.all(
          response.data.records.map(async (lender: Lenders) => {
            const PhotoUrl = await resolveHeadshot('lenders', lender.AccountId_15__c);
            return PhotoUrl ? { ...lender, PhotoUrl } : null;
          }),
        );
        const records = resolved.filter((lender): lender is Lenders => lender !== null);

        return { ...response.data, records } as LendersData;

      } else if (response?.status === 401) {
        try {
          await getSalesforceToken();
          return await stateService.fetchLendersListByState(state);
        } catch (tokenError) {
          console.error('Failed to refresh token:', tokenError);
          throw tokenError;
        }
      } else {
        throw new Error('Failed to fetch State Based Agent List');
      }
    } catch (error: any) {
      console.error('Error fetching State Based Agent List:', error);
      throw error;
    }
  },
  fetchStateImage: async (state_slug: string): Promise<string> => {
    try {
      const state_map = await client.fetch(`*[_type == "state_list" && state_slug.current == $state][0] { state_map }`, { state: state_slug });
      if (!state_map?.state_map) {
        throw new Error('No state map found');
      }
      return urlForImage(state_map.state_map);
    } catch (error: any) {
      console.error('Error fetching State Image:', error);
      throw error;
    }
  },
  fetchAgentById: async (agentId: string): Promise<Agent | null> => {
    try {
      const query = `
        SELECT Name, Brokerage_Name__pc, PersonEmail, PersonMobilePhone
        FROM Account
        WHERE Id = '${agentId}'
          AND Active_on_Website__pc = true
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPI({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });

      if (response?.status === 200 && response.data.records.length > 0) {
        const agent = response.data.records[0];
        return agent as Agent;
      } else if (response?.status === 401) {
        // Token expired: Refresh and retry
        try {
          await getSalesforceToken(); // Refresh token
          return await stateService.fetchAgentById(agentId); // Retry the request
        } catch (tokenError) {
          console.error("Failed to refresh token:", tokenError);
          throw tokenError;
        }
      }

      return null;
    } catch (error: any) {
      console.error("Error fetching Agent by ID:", error);
      throw error;
    }
  }
};

export default stateService;