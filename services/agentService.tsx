import { REAL_STATE_AGENTS } from '@/lib/content/homepage'
import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPIWithRefresh } from '@/services/api';
import { escapeSoqlLiteral } from '@/services/soql';
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
    // Logo data now comes from the repo-committed export in content/_data/site/
    // via lib/content/homepage (validated at module load); the response shape
    // matches the old Sanity fetch so consumers don't churn.
    fetchLogosList: async (): Promise<RealEstateAgentDocument[]> => {
        return REAL_STATE_AGENTS.map((agent) => ({
            _id: agent._id,
            // The repo export carries no document revision; the field only
            // exists to satisfy the legacy SanityDocument shape.
            _rev: '',
            _type: 'real_state_agents' as const,
            _createdAt: agent._createdAt,
            _updatedAt: agent._updatedAt,
            title: agent.title,
            url: agent.url,
            publishedAt: agent.publishedAt,
            mainImage: {
                _type: 'image' as const,
                alt: agent.mainImage.alt,
                asset: {
                    image_url: agent.mainImage.path,
                    // Original Sanity asset id, kept for shape compatibility.
                    _ref: agent.mainImage._sanityAssetId ?? '',
                    _type: 'reference',
                },
            },
        }));
    },
    getAgentState: async (salesforceID: string): Promise<string[]> => {
        // Primary gate: a Salesforce record id is a 15- or 18-char alphanumeric
        // string. Reject anything else (this value arrives straight off the
        // webhook body) so an injection payload never reaches the query builder.
        if (!/^[a-zA-Z0-9]{15,18}$/.test(salesforceID)) {
            throw new Error("Invalid Salesforce ID.");
        }

        // Backstop: escape the (already validated) id before interpolating it into
        // the SOQL string literal — defense in depth against a missed validation.
        const query = `
            SELECT State_s_Licensed_in__pc, Other_States__pc
            FROM Account
            WHERE AccountId_15__c = '${escapeSoqlLiteral(salesforceID)}'
        `.replace(/\s+/g, ' ').trim();

        const response = await salesForceAPIWithRefresh({
            endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query)}`,
            type: RequestType.GET,
        });

        if (response?.status === 200) {
            return getStateFullNames(combineStateValues(response.data));
        }

        throw new Error("Failed to fetch agent state.");
    },
};

export default agentService;
