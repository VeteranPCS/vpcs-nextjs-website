import { SanityDocument } from '@sanity/client'
import { urlForImage } from '@/sanity/lib/image'
import { client } from '@/sanity/lib/client'
import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI, salesForceImageAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';

interface MainImage {
    alt: string; // Alternative text for the image
    asset: {
        image_url: string; // URL of the image
        _ref: string; // Reference ID for the image asset
        _type: string; // Type of the asset, typically "reference"
    };
    _type: "image"; // Type of the main image, typically "image"
}

interface AgentDocument extends SanityDocument {
    image: MainImage;
    mainImage?: MainImage;
    _id: string;
    _rev: string;
    _type: 'agent';
}

const stateAbbreviations = {
    AL: "alabama",
    AK: "alaska",
    AZ: "arizona",
    AR: "arkansas",
    CA: "california",
    CO: "colorado",
    CT: "connecticut",
    DE: "delaware",
    FL: "florida",
    GA: "georgia",
    HI: "hawaii",
    ID: "idaho",
    IL: "illinois",
    IN: "indiana",
    IA: "iowa",
    KS: "kansas",
    KY: "kentucky",
    LA: "louisiana",
    ME: "maine",
    MD: "maryland",
    MA: "massachusetts",
    MI: "michigan",
    MN: "minnesota",
    MS: "mississippi",
    MO: "missouri",
    MT: "montana",
    NE: "nebraska",
    NV: "nevada",
    NH: "new-hampshire",
    NJ: "new-jersey",
    NM: "new-mexico",
    NY: "new-york",
    NC: "north-carolina",
    ND: "north-dakota",
    OH: "ohio",
    OK: "oklahoma",
    OR: "oregon",
    PA: "pennsylvania",
    RI: "rhode-island",
    SC: "south-carolina",
    SD: "south-dakota",
    TN: "tennessee",
    TX: "texas",
    UT: "utah",
    VT: "vermont",
    VA: "virginia",
    WA: "washington",
    WV: "west-virginia",
    WI: "wisconsin",
    WY: "wyoming"
};

function combineStateValues(data: any): string[] {
    try {
        // Check if records array exists and has at least one record
        if (!data || !data.records || data.records.length === 0) {
            throw new Error("Invalid data: No records available.");
        }

        const record = data.records[0]; // Assuming we only process the first record

        // Extract state values, ensuring they are strings before splitting
        const statesLicensed = record.State_s_Licensed_in__pc ? record.State_s_Licensed_in__pc.split(", ") : [];
        const otherStates = record.Other_States__pc ? record.Other_States__pc.split(", ") : [];

        // Combine the arrays and remove any duplicates
        const combinedStates = Array.from(new Set([...statesLicensed, ...otherStates]));

        return combinedStates;
    } catch (error: any) {
        console.error("Error combining state values:", error.message);
        return [];
    }
}

function getStateFullNames(abbreviations: string[]) {
    try {
        if (!Array.isArray(abbreviations)) {
            throw new Error("Input must be an array of state abbreviations.");
        }

        return abbreviations.map(abbr => {
            const fullName: string = stateAbbreviations[abbr as keyof typeof stateAbbreviations];
            if (!fullName) {
                console.warn(`Unknown state abbreviation: ${abbr}`);
            }
            return fullName || '';
        }).filter(Boolean); // Remove null values
    } catch (error: any) {
        console.error("Error converting state abbreviations to full names:", error.message);
        return [];
    }
}


const agentService = {
    fetchAgentsList: async (): Promise<AgentDocument[]> => {
        try {
            const agents = await client.fetch<AgentDocument[]>(`*[_type == "real_state_agents"]`);

            agents.forEach((agent: AgentDocument) => {
                if (agent.mainImage?.asset?._ref) {
                    agent.mainImage.asset.image_url = urlForImage(agent.mainImage.asset);
                }
            });

            if (agents) {
                return agents;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    getAgentImage: async (salesforceID: string): Promise<string> => {
        try {
            const agent = await client.fetch<AgentDocument>(`*[_type == "agent" && salesforceID == $salesforceID][0]`, { salesforceID });

            if (agent.image?.asset?._ref) {
                agent.image.asset.image_url = urlForImage(agent.image.asset);
            }
            if (agent) {
                return agent.image.asset.image_url;
            } else {
                throw new Error('Failed to Fetch About Page Details');
            }
        } catch (error: any) {
            console.error('Error fetching About Page Details:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    getAgentState: async (salesforceID: string): Promise<string[]> => {
        try {
            const query = `
        SELECT State_s_Licensed_in__pc, Other_States__pc
        FROM Account
        WHERE AccountId_15__c = '${salesforceID}'
      `.replace(/\s+/g, ' ').trim();

            const response = await salesForceAPI({
                endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
                type: RequestType.GET,
            });

            if (response?.status === 200) {
                const data = response.data;
                console.log('data:', data);
                const combinedStates = combineStateValues(data);
                console.log(combinedStates);
                const fullStateNames = getStateFullNames(combinedStates);
                console.log(fullStateNames);
                return fullStateNames;

            } else if (response?.status === 401) {
                // Token expired: Refresh and retry
                try {
                    await getSalesforceToken(); // Refresh token
                    return await agentService.getAgentState(salesforceID); // Retry the request
                } catch (tokenError) {
                    console.error("Failed to refresh token:", tokenError);
                    throw tokenError;
                }
            } else {
                throw new Error("Failed to fetch agent state.");
            }
        } catch (error: any) {
            console.error('Error fetching agent state:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }

    },
};

export default agentService;