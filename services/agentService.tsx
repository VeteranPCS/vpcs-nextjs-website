import { urlForImage } from '@/sanity/lib/image'
import { client } from '@/sanity/lib/client'
import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { RealEstateAgentDocument } from '@/types/agent';
import { STATE_ABBR_TO_SLUG as stateAbbreviations } from '@/lib/states';

function combineStateValues(data: any): string[] {
    if (!data?.records?.length) return [];
    const record = data.records[0];
    const statesLicensed = record.State_s_Licensed_in__pc ? record.State_s_Licensed_in__pc.split(", ") : [];
    const otherStates = record.Other_States__pc ? record.Other_States__pc.split(";") : [];
    return Array.from(new Set([...statesLicensed, ...otherStates]));
}

function getStateFullNames(abbreviations: string[]): string[] {
    return abbreviations
        .map(abbr => stateAbbreviations[abbr as keyof typeof stateAbbreviations] ?? '')
        .filter(Boolean);
}

const agentService = {
    fetchLogosList: async (): Promise<RealEstateAgentDocument[]> => {
        const logos = await client.fetch<RealEstateAgentDocument[]>(`*[_type == "real_state_agents"]`);

        logos.forEach((logo) => {
            if (logo.mainImage?.asset?._ref) {
                logo.mainImage.asset.image_url = urlForImage(logo.mainImage.asset);
            }
        });

        return logos;
    },
    getAgentState: async (salesforceID: string): Promise<string[]> => {
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
            return getStateFullNames(combineStateValues(response.data));
        }

        if (response?.status === 401) {
            await getSalesforceToken();
            return agentService.getAgentState(salesforceID);
        }

        throw new Error("Failed to fetch agent state.");
    },
};

export default agentService;
