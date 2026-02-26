import { client } from "@/sanity/lib/client";
import { urlForImage } from "@/sanity/lib/image";
import agentService from "./agentService";
import { Image } from "sanity";
import { attio } from "@/lib/attio";
import {
  getAttioData,
  getAgentsForState,
  getLendersForState,
  getAreaAssignmentsForAgent,
  getAreaById,
} from "@/lib/attio-data-loader";

interface StateMap extends Image {
  _type: "image";
  alt: string;
  asset: {
    _ref: string;
    _type: "reference";
    image_url: string;
  };
}

interface StateSlug {
  current: string;
  _type: "slug";
}

export interface StateList {
  short_name: string;
  _id: string;
  _updatedAt: string;
  state_map: StateMap;
  state_name: string;
  _createdAt: string;
  _rev: string;
  _type: "state_list";
  state_slug: StateSlug;
}

export interface Agent {
  Name: string;
  AccountId_15__c: string;
  attio_id?: string; // Attio record UUID for contact form links
  PhotoUrl?: string;
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
  Other_States__pc?: string[];
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
  attio_id?: string; // Attio record UUID for contact form links
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

// Helper: Map state slug to state code (e.g., "texas" -> "TX")
const stateSlugToCode: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new-hampshire": "NH",
  "new-jersey": "NJ",
  "new-mexico": "NM",
  "new-york": "NY",
  "north-carolina": "NC",
  "north-dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "puerto-rico": "PR",
  "rhode-island": "RI",
  "south-carolina": "SC",
  "south-dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west-virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "washington-dc": "DC",
};

// Reverse mapping: state code to lowercase state name for Area__r.State__c
const stateCodeToName: Record<string, string> = Object.entries(
  stateSlugToCode,
).reduce(
  (acc, [slug, code]) => {
    // Convert slug to state name (e.g., "new-york" -> "new york")
    acc[code] = slug.replace(/-/g, " ");
    return acc;
  },
  {} as Record<string, string>,
);

const stateService = {
  // ========== SANITY FUNCTIONS (unchanged) ==========

  fetchStateList: async (): Promise<StateList[]> => {
    try {
      const response = await client.fetch(
        `*[_type == "state_list"]{ state_slug, short_name }`,
      );
      if (response) {
        return response as StateList[];
      } else {
        throw new Error("Failed to fetch State List");
      }
    } catch (error: any) {
      console.error("Error fetching State List:", error);
      throw error;
    }
  },

  fetchStateDetails: async (state: string): Promise<StateList> => {
    try {
      const state_detail = await client.fetch<StateList>(
        `*[_type == "state_list" && state_slug.current == $state][0]`,
        { state: state },
      );

      if (state_detail) {
        return {
          ...state_detail,
          state_map: state_detail.state_map
            ? {
                ...state_detail.state_map,
                asset: {
                  ...state_detail.state_map.asset,
                  image_url: urlForImage(state_detail.state_map),
                },
              }
            : null,
        } as StateList;
      } else {
        throw new Error("Failed to fetch State Details");
      }
    } catch (error: any) {
      console.error("Error fetching State Details:", error);
      throw error;
    }
  },

  fetchStateImage: async (state_slug: string): Promise<string> => {
    try {
      const state_map = await client.fetch(
        `*[_type == "state_list" && state_slug.current == $state][0] { state_map }`,
        { state: state_slug },
      );
      if (!state_map?.state_map) {
        throw new Error("No state map found");
      }
      return urlForImage(state_map.state_map);
    } catch (error: any) {
      console.error("Error fetching State Image:", error);
      throw error;
    }
  },

  // ========== ATTIO FUNCTIONS (using pre-loaded data cache) ==========

  /**
   * Fetch agents list by state from Attio
   *
   * Uses pre-loaded data cache to avoid redundant API calls during build.
   * All Attio data is fetched once and cached, then filtered in memory.
   *
   * Flow:
   * 1. Get agents for state from cache (pre-filtered by active status and area assignments)
   * 2. Fetch photos from Sanity using salesforce_id
   * 3. Map to legacy interface format
   */
  fetchAgentsListByState: async (stateSlug: string): Promise<AgentsData> => {
    try {
      // Convert state slug to state code (e.g., "texas" -> "TX")
      const stateCode = stateSlugToCode[stateSlug] || stateSlug.toUpperCase();

      // Get pre-loaded data cache (fetches once, reused across all pages)
      const dataCache = await getAttioData();

      // Get state from cache (using plain object access)
      const state = dataCache.states[stateCode];
      if (!state) {
        return { totalSize: 0, done: true, records: [] };
      }

      // Get all areas in this state from cache
      const stateAreas = dataCache.areasByState[state.id] || [];
      if (stateAreas.length === 0) {
        return { totalSize: 0, done: true, records: [] };
      }

      // Build area ID set and map for quick lookup
      const areaIds = new Set(stateAreas.map((a) => a.id));
      const areaMap: Record<string, any> = {};
      for (const a of stateAreas) {
        areaMap[a.id] = a;
      }

      // Get active assignments for these areas
      const assignments: any[] = [];
      const agentIdSet = new Set<string>();
      for (const areaId of areaIds) {
        const areaAssignments = dataCache.assignmentsByArea[areaId] || [];
        for (const aa of areaAssignments) {
          if (aa.status === "Active" && aa.agent) {
            assignments.push(aa);
            agentIdSet.add(aa.agent);
          }
        }
      }

      if (agentIdSet.size === 0) {
        return { totalSize: 0, done: true, records: [] };
      }

      // Filter active agents to only those with assignments in this state
      const agents = dataCache.activeAgents.filter((agent) =>
        agentIdSet.has(agent.id),
      );

      // Fetch photos from Sanity and map to legacy interface
      const recordsWithPhotos = await Promise.all(
        agents.map(async (agent) => {
          let photoUrl: string | undefined;

          // Fetch photo from Sanity using salesforce_id
          // Note: Sanity stores 15-char IDs, Attio has 18-char IDs - truncate to 15
          if (agent.salesforce_id) {
            try {
              const sfId15 = agent.salesforce_id.substring(0, 15);
              photoUrl = await agentService.getAgentImage(sfId15);
            } catch (error) {
              console.error(
                "Error fetching photo for agent %s:",
                agent.salesforce_id,
                error,
              );
            }
          }

          // Fallback to Attio headshot_url if no Sanity photo found
          if (!photoUrl && agent.headshot_url) {
            photoUrl = agent.headshot_url;
          }

          // Get this agent's area assignments for this state
          // Note: State__c needs to be lowercase state name (e.g., "texas") to match page component comparison
          const stateNameLower =
            stateCodeToName[stateCode] || stateCode.toLowerCase();
          const agentAssignments = assignments
            .filter((a) => a.agent === agent.id)
            .map((a) => {
              const area = areaMap[a.area];
              return {
                Id: a.id,
                Name: "",
                AA_Score__c: a.aa_score || 0,
                Area__r: {
                  Name: area?.name || "",
                  State__c: stateNameLower,
                },
              };
            })
            .sort((a, b) => b.AA_Score__c - a.AA_Score__c);

          // Map to legacy Agent interface
          // Note: AccountId_15__c should be 15-char for Sanity compatibility
          const sfId15 = agent.salesforce_id
            ? agent.salesforce_id.substring(0, 15)
            : agent.id;
          return {
            Name: agent.name,
            AccountId_15__c: sfId15,
            attio_id: agent.id, // Attio UUID for contact form links
            PhotoUrl: photoUrl,
            FirstName: agent.first_name,
            LastName: agent.last_name,
            Agent_Bio__pc: agent.bio,
            Military_Status__pc: agent.military_status,
            Military_Service__pc: agent.military_service,
            Brokerage_Name__pc: agent.brokerage_name,
            BillingAddress: {
              city: agent.city,
              state: stateCode,
            },
            BillingStateCode: stateCode,
            State_s_Licensed_in__pc: stateCode,
            PersonEmail: agent.email,
            PersonMobilePhone: agent.phone,
            Area_Assignments__r: {
              records: agentAssignments,
            },
          } as Agent;
        }),
      );

      // Filter to only agents with photos
      const recordsWithValidPhotos = recordsWithPhotos.filter(
        (agent) => agent.PhotoUrl,
      );

      return {
        totalSize: recordsWithValidPhotos.length,
        done: true,
        records: recordsWithValidPhotos,
      };
    } catch (error: any) {
      console.error("Error fetching agents from Attio:", error);
      throw error;
    }
  },

  /**
   * Fetch lenders list by state from Attio
   *
   * Uses pre-loaded data cache to avoid redundant API calls during build.
   *
   * Flow:
   * 1. Get lenders for state from cache (pre-filtered by State.lenders and active status)
   * 2. Fetch photos from Sanity using salesforce_id
   * 3. Map to legacy interface format
   */
  fetchLendersListByState: async (stateSlug: string): Promise<LendersData> => {
    try {
      // Convert state slug to state code
      const stateCode = stateSlugToCode[stateSlug] || stateSlug.toUpperCase();

      // Get pre-loaded data cache (fetches once, reused across all pages)
      const dataCache = await getAttioData();

      // Get state from cache (using plain object access)
      const state = dataCache.states[stateCode];
      if (!state) {
        return { totalSize: 0, done: true, records: [] };
      }

      // State.lenders is already parsed as an array of lender IDs
      const lenderIds = state.lenders;
      if (lenderIds.length === 0) {
        return { totalSize: 0, done: true, records: [] };
      }

      // Convert to Set for O(1) lookup
      const lenderIdSet = new Set(lenderIds);

      // Filter active lenders to only those assigned to this state
      const lenders = dataCache.activeLenders.filter((lender) =>
        lenderIdSet.has(lender.id),
      );

      // Fetch photos from Sanity and map to legacy interface
      const recordsWithPhotos = await Promise.all(
        lenders.map(async (lender) => {
          let photoUrl: string | undefined;

          // Fetch photo from Sanity using salesforce_id
          // Note: Sanity stores 15-char IDs, Attio has 18-char IDs - truncate to 15
          if (lender.salesforce_id) {
            try {
              const sfId15 = lender.salesforce_id.substring(0, 15);
              photoUrl = await agentService.getAgentImage(sfId15);
            } catch (error) {
              console.error(
                "Error fetching photo for lender %s:",
                lender.salesforce_id,
                error,
              );
            }
          }

          // Fallback to Attio headshot_url if no Sanity photo found
          if (!photoUrl && lender.headshot_url) {
            photoUrl = lender.headshot_url;
          }

          // Map to legacy Lenders interface
          // Note: AccountId_15__c should be 15-char for Sanity compatibility
          const sfId15 = lender.salesforce_id
            ? lender.salesforce_id.substring(0, 15)
            : lender.id;
          return {
            Name: lender.name,
            AccountId_15__c: sfId15,
            attio_id: lender.id, // Attio UUID for contact form links
            PhotoUrl: photoUrl,
            FirstName: lender.first_name,
            Agent_Bio__pc: lender.bio,
            Military_Status__pc: lender.military_status,
            Military_Service__pc: lender.military_service,
            Brokerage_Name__pc: lender.brokerage_name || lender.company_name,
            BillingCity: lender.city || null,
            BillingState: stateCode,
            Individual_NMLS_ID__pc: lender.individual_nmls,
            Company_NMLS_ID__pc: lender.company_nmls,
            // Lenders don't use area assignments - they're assigned at state level
            Area_Assignments__r: { records: [] },
          } as Lenders;
        }),
      );

      // Filter to only lenders with photos
      const recordsWithValidPhotos = recordsWithPhotos.filter(
        (lender) => lender.PhotoUrl,
      );

      return {
        totalSize: recordsWithValidPhotos.length,
        done: true,
        records: recordsWithValidPhotos,
      };
    } catch (error: any) {
      console.error("Error fetching lenders from Attio:", error);
      throw error;
    }
  },

  /**
   * Fetch a single agent by Attio record ID
   * Used by contact forms to get agent details
   */
  fetchAgentById: async (agentId: string): Promise<Agent | null> => {
    try {
      // Query by id (Attio record ID) or salesforce_id
      let agents = await attio.queryRecords("agents", {
        filter: { id: { $eq: agentId } },
        limit: 1,
      });

      // If not found by id, try salesforce_id
      if (!agents.length) {
        agents = await attio.queryRecords("agents", {
          filter: { salesforce_id: { $eq: agentId } },
          limit: 1,
        });
      }

      if (!agents.length) {
        return null;
      }

      const agent = agents[0];

      // Only return if active on website
      if (!agent.active_on_website) {
        return null;
      }

      // Note: AccountId_15__c should be 15-char for Sanity compatibility
      const sfId15 = agent.salesforce_id
        ? agent.salesforce_id.substring(0, 15)
        : agent.id;
      return {
        Name:
          agent.name ||
          `${agent.first_name || ""} ${agent.last_name || ""}`.trim(),
        AccountId_15__c: sfId15,
        attio_id: agent.id, // Attio UUID for contact form links
        FirstName: agent.first_name || "",
        LastName: agent.last_name || "",
        Agent_Bio__pc: agent.bio || "",
        Military_Status__pc: agent.military_status || "",
        Military_Service__pc: agent.military_service || "",
        Brokerage_Name__pc: agent.brokerage_name || "",
        BillingAddress: { state: "" },
        BillingStateCode: "",
        State_s_Licensed_in__pc: "",
        PersonEmail: agent.email || "",
        PersonMobilePhone: agent.phone || "",
      } as Agent;
    } catch (error: any) {
      console.error("Error fetching agent by ID from Attio:", error);
      throw error;
    }
  },

  /**
   * Fetch a single lender by Attio record ID
   * Used by contact forms to get lender details
   */
  fetchLenderById: async (lenderId: string): Promise<Lenders | null> => {
    try {
      // Query by id (Attio record ID) or salesforce_id
      let lenders = await attio.queryRecords("lenders", {
        filter: { id: { $eq: lenderId } },
        limit: 1,
      });

      // If not found by id, try salesforce_id
      if (!lenders.length) {
        lenders = await attio.queryRecords("lenders", {
          filter: { salesforce_id: { $eq: lenderId } },
          limit: 1,
        });
      }

      if (!lenders.length) {
        return null;
      }

      const lender = lenders[0];

      // Only return if active on website
      if (!lender.active_on_website) {
        return null;
      }

      // Note: AccountId_15__c should be 15-char for Sanity compatibility
      const sfId15 = lender.salesforce_id
        ? lender.salesforce_id.substring(0, 15)
        : lender.id;
      return {
        Name:
          lender.name ||
          `${lender.first_name || ""} ${lender.last_name || ""}`.trim(),
        AccountId_15__c: sfId15,
        attio_id: lender.id, // Attio UUID for contact form links
        FirstName: lender.first_name || "",
        Agent_Bio__pc: lender.bio || "",
        Military_Status__pc: lender.military_status || "",
        Military_Service__pc: lender.military_service || "",
        Brokerage_Name__pc: lender.company_name || "",
        BillingCity: lender.city || null,
        BillingState: "",
        Individual_NMLS_ID__pc: lender.individual_nmls || "",
        Company_NMLS_ID__pc: lender.company_nmls || "",
      } as Lenders;
    } catch (error: any) {
      console.error("Error fetching lender by ID from Attio:", error);
      throw error;
    }
  },
};

export default stateService;
