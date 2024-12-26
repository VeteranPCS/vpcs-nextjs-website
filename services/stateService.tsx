import { API_ENDPOINTS, VETERENCE_SALESFORCE_BASE_URL } from '@/constants/api'
import { api, RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { SALESFORCETOKEN } from '@/services/salesForceTokenService';

interface CityMap {
  _type: 'image';
  alt: string;
  asset: {
    _ref: string;
    _type: 'reference'
    image_url: string;
  };
}

interface CitySlug {
  current: string;
  _type: 'slug';
}

export interface CityList {
  short_name: string;
  _id: string;
  _updatedAt: string;
  city_map: CityMap;
  city_name: string;
  _createdAt: string;
  _rev: string;
  _type: 'city_list';
  city_slug: CitySlug;
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
  fetchStateDetails: async (city: string): Promise<CityList> => {
    try {
      const response = await api({
        endpoint: `${API_ENDPOINTS.fetchStateDetails}?city=${city}`,
        type: RequestType.GET,
      });

      if (response?.status === 200) {
        return response.data as CityList;
      } else {
        throw new Error('Failed to fetch Reviews');
      }
    } catch (error: any) {
      console.error('Error fetching Reviews:', error);
      throw error;
    }
  },
  fetchAgentsListByCity: async (city: string): Promise<AgentsData> => {
    try {
      const query = `SELECT+Id%2C+Name%2C+AccountId_15__c%2C+PhotoUrl%2c+FirstName%2C+LastName%2C+Agent_Bio__pc%2C+Bases_Serviced__pc%2C+Military_Status__pc%2C+Military_Service__pc%2C+Brokerage_Name__pc%2C+BillingCity%2C+BillingState%2C+BillingStateCode+FROM+Account+WHERE+isAgent__pc+%3D+true+AND+Active_on_Website__pc+%3D+true+AND+BillingState+%3D+'${city}'`
      const response = await salesForceAPI({
        endpoint: `${VETERENCE_SALESFORCE_BASE_URL}/services/data/v62.0/query?q=${query}`,
        type: RequestType.GET,
      });

      if (response?.status === 200) {

        response.data.records.forEach((agent: Agent) => {
          // if (agent.PhotoUrl) {
          //   agent.PhotoUrl = `${VETERENCE_SALESFORCE_BASE_URL}${agent.PhotoUrl}?oauth_token=${SALESFORCETOKEN}`;
          // }
          if (agent.PhotoUrl) {
            // Try to get the CDN version of the image if available
            try {
              const photoId = agent.PhotoUrl.split('/').pop();
              agent.PhotoUrl = `${VETERENCE_SALESFORCE_BASE_URL}/sfc/servlet.shepherd/version/download/${photoId}?oauth_token=${SALESFORCETOKEN}`;
            } catch (error) {
              console.error('Error constructing photo URL:', error);
              agent.PhotoUrl = '/default-profile.png'; // Fallback to default image
            }
          }
        });
        return response.data as AgentsData;
      } else if (response?.status === 401) {
        try {
          await getSalesforceToken(); // Refresh the token
          return await stateService.fetchAgentsListByCity(city);
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
  fetchLendersListByCity: async (city: string): Promise<LendersData> => {
    try {
      const query = `SELECT+Id%2C+Name%2C+AccountId_15__c%2C+PhotoUrl%2c+FirstName%2C+LastName%2C+Agent_Bio__pc%2C+Bases_Serviced__pc%2C+Military_Status__pc%2C+Military_Service__pc%2C+Brokerage_Name__pc%2C+Individual_NMLS_ID__pc%2C+Company_NMLS_ID__pc%2C+BillingCity%2C+BillingState%2C+BillingStateCode+FROM+Account+WHERE+isLender__pc+%3D+true+AND+Active_on_Website__pc+%3D+true+AND+BillingState+%3D+'${city}'`
      const response = await salesForceAPI({
        endpoint: `${VETERENCE_SALESFORCE_BASE_URL}/services/data/v62.0/query?q=${query}`,
        type: RequestType.GET,
      });

      if (response?.status === 200) {

        response.data.records.forEach((agent: Agent) => {
          if (agent.PhotoUrl) {
            agent.PhotoUrl = `${VETERENCE_SALESFORCE_BASE_URL}${agent.PhotoUrl}`;
          }
        });
        return response.data as LendersData;
      } else if (response?.status === 401) {
        try {
          await getSalesforceToken();
          return await stateService.fetchLendersListByCity(city);
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
  }
};

export default stateService;