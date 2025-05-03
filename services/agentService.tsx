import { urlForImage } from '@/sanity/lib/image'
import { client } from '@/sanity/lib/client'
import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI, salesForceImageAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { AgentDocument } from '@/types/agent';

const stateAbbreviations = {
    AL: "alabama",
    AK: "alaska",
    AZ: "arizona",
    AR: "arkansas",
    CA: "california",
    CO: "colorado",
    CT: "connecticut",
    DC: "washington-dc",
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
    PR: "puerto-rico",
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
        const otherStates = record.Other_States__pc ? record.Other_States__pc.split(";") : [];

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
    fetchLogosList: async (): Promise<AgentDocument[]> => {
        try {
            const logos = await client.fetch<AgentDocument[]>(`*[_type == "real_state_agents"]`);

            logos.forEach((logo: AgentDocument) => {
                if (logo.mainImage?.asset?._ref) {
                    logo.mainImage.asset.image_url = urlForImage(logo.mainImage.asset);
                }
            });

            if (logos) {
                return logos;
            } else {
                throw new Error('Failed to Fetch Logos');
            }
        } catch (error: any) {
            console.error('Error fetching Logos:', error);
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
                // Ensure image_url exists and is a string before returning
                if (typeof agent.image?.asset?.image_url === 'string') {
                    return agent.image.asset.image_url;
                } else {
                    // Throw an error if image_url is missing or not a string
                    throw new Error('Agent image URL is missing or invalid');
                }
            } else {
                throw new Error('Failed to Fetch Agent Image');
            }
        } catch (error: any) {
            console.error('Error fetching Agent Image:', error);
            throw error; // You can handle the error more gracefully based on your needs
        }
    },
    getAgentState: async (salesforceID: string): Promise<string[]> => {
        console.log("Fetching agent state for Salesforce ID:", salesforceID);
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
                const combinedStates = combineStateValues(data);
                const fullStateNames = getStateFullNames(combinedStates);
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