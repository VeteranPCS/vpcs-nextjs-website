import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI, salesForceImageAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

interface StateMap {
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
  city_map: StateMap;
  city_name: string;
  _createdAt: string;
  _rev: string;
  _type: 'city_list';
  city_slug: StateSlug;
}

interface Agent {
  attributes: object; // Replace with the correct type for the 'attributes' field if needed
  Id: string;
  Name: string;
  AccountId_15__c: string;
  PhotoUrl: string;
  FirstName: string;
  LastName: string;
  Agent_Bio__pc: string;
  Bases_Serviced__pc: string | null;
  Military_Status__pc: string;
  Military_Service__pc: string;
  Brokerage_Name__pc: string;
  BillingCity: string | null;
  BillingState: string;
  BillingStateCode: string;
}

export interface Lenders {
  attributes: object; // Replace with the correct type for the 'attributes' field if needed
  Id: string;
  Name: string;
  AccountId_15__c: string;
  PhotoUrl: string;
  FirstName: string;
  LastName: string;
  Agent_Bio__pc: string;
  Bases_Serviced__pc: string | null;
  Military_Status__pc: string;
  Military_Service__pc: string;
  Brokerage_Name__pc: string;
  BillingCity: string | null;
  BillingState: string;
  BillingStateCode: string;
  Individual_NMLS_ID__pc: string;
  Company_NMLS_ID__pc: string;
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
      const response = await client.fetch(`*[_type == "city_list"]{ city_slug, short_name }`)
      if (response) {
        return response as StateList[];
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
      const state_detail = await client.fetch<StateList>(`*[_type == "city_list" && city_slug.current == $city][0]`, { city: state });

      if (state_detail.city_map?.asset?._ref) {
        state_detail.city_map.asset.image_url = urlForImage(state_detail.city_map.asset);  // Add the image URL to the response
      }
      if (state_detail) {
        return state_detail as StateList
      } else {
        throw new Error('Failed to fetch Reviews');
      }
    } catch (error: any) {
      console.error('Error fetching Reviews:', error);
      throw error;
    }
  },
  fetchAgentsListByState: async (state: string): Promise<AgentsData> => {
    try {
      const query = `
      SELECT Id, Name, AccountId_15__c, PhotoUrl, FirstName, LastName, Agent_Bio__pc, Bases_Serviced__pc, Military_Status__pc, Military_Service__pc, Brokerage_Name__pc, BillingCity, BillingState, BillingStateCode
      FROM Account
      WHERE isAgent__pc = true AND Active_on_Website__pc = true AND BillingStateCode = '${state}'
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPI({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });

      if (response?.status === 200) {
        const recordsWithUpdatedPhotoUrl = await Promise.all(
          response.data.records.map(async (agent: Agent) => {
            if (agent.PhotoUrl) {
              try {
                const photoResponse = await salesForceImageAPI({
                  endpoint: SALESFORCE_BASE_URL + agent.PhotoUrl,
                  type: RequestType.GET,
                });

                const base64Image = Buffer.from(photoResponse?.data).toString('base64');
                agent.PhotoUrl = `data:image/jpeg;base64,${base64Image}`;
                // agent.PhotoUrl = photoResponse?.data; // Ensure fallback to original URL
              } catch (error) {
                console.error(`Error fetching photo URL for agent ${agent.Id}:`, error);
              }
            }
            return agent;
          })
        );

        return { ...response.data, records: recordsWithUpdatedPhotoUrl } as AgentsData;
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
      SELECT Id, Name, AccountId_15__c, PhotoUrl, FirstName, LastName, Agent_Bio__pc, Bases_Serviced__pc, Military_Status__pc, Military_Service__pc, Brokerage_Name__pc, BillingCity, BillingState, BillingStateCode, Individual_NMLS_ID__pc, Company_NMLS_ID__pc
      FROM Account
      WHERE isLender__pc = true AND Active_on_Website__pc = true AND BillingStateCode = '${state}'
      `.replace(/\s+/g, ' ').trim();

      const response = await salesForceAPI({
        endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
        type: RequestType.GET,
      });
      if (response?.status === 200) {
        const recordsWithUpdatedPhotoUrl = await Promise.all(
          response.data.records.map(async (agent: Agent) => {
            if (agent.PhotoUrl) {
              try {
                const photoResponse = await salesForceImageAPI({
                  endpoint: SALESFORCE_BASE_URL + agent.PhotoUrl,
                  type: RequestType.GET,
                });

                const base64Image = Buffer.from(photoResponse?.data).toString('base64');
                agent.PhotoUrl = `data:image/jpeg;base64,${base64Image}`;
                // agent.PhotoUrl = photoResponse?.data; // Ensure fallback to original URL
              } catch (error) {
                console.error(`Error fetching photo URL for agent ${agent.Id}:`, error);
              }
            }
            return agent;
          })
        );

        return { ...response.data, records: recordsWithUpdatedPhotoUrl } as LendersData;
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
      const state_map = await client.fetch(`*[_type == "city_list" && city_slug.current == $city][0] { city_map }`, { city: state_slug });
      const image_url = urlForImage(state_map.city_map.asset);
      return image_url;
    } catch (error: any) {
      console.error('Error fetching State Image:', error);
      throw error;
    }
  }
};

export default stateService;