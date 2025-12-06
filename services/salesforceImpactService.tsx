import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api'
import { RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';

// RecordTypeId for Opportunity records we're querying
const OPPORTUNITY_RECORD_TYPE_ID = '0124x000000Z7G3AAK';

// The SOQL query to get aggregate sums
const IMPACT_QUERY = `
    SELECT SUM(Payout_Amount__c), SUM(Charity_Amount__c), SUM(Sale_Price__c) 
    FROM Opportunity 
    WHERE RecordTypeId = '${OPPORTUNITY_RECORD_TYPE_ID}'
`.replace(/\s+/g, ' ').trim();

// Response type from Salesforce aggregate query
interface SalesforceAggregateResponse {
    totalSize: number;
    done: boolean;
    records: Array<{
        attributes: {
            type: string;
        };
        expr0: number; // SUM(Payout_Amount__c) - Cash back amount
        expr1: number; // SUM(Charity_Amount__c) - Charity donation amount
        expr2: number; // SUM(Sale_Price__c) - Total real estate volume sold
    }>;
}

// Cached result to avoid multiple API calls
let cachedResult: SalesforceAggregateResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches the aggregate impact data from Salesforce
 * Uses caching to avoid repeated API calls within the cache duration
 */
async function fetchImpactData(): Promise<SalesforceAggregateResponse> {
    const now = Date.now();

    // Return cached result if still valid
    if (cachedResult && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedResult;
    }

    try {
        const response = await salesForceAPI({
            endpoint: `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(IMPACT_QUERY)}`,
            type: RequestType.GET,
        });

        if (response?.status === 200) {
            cachedResult = response.data as SalesforceAggregateResponse;
            cacheTimestamp = now;
            return cachedResult;
        } else if (response?.status === 401) {
            // Token expired: Refresh and retry
            await getSalesforceToken();
            return await fetchImpactData();
        } else {
            throw new Error(`Failed to fetch impact data: ${response?.status}`);
        }
    } catch (error: any) {
        console.error('Error fetching impact data from Salesforce:', error);
        throw error;
    }
}

/**
 * Formats a number as USD currency string
 * @param amount - The amount to format
 * @returns Formatted string like "$532,687"
 */
function formatAsUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Formats a large number rounded to the nearest million
 * @param amount - The amount to format
 * @returns Formatted string like "$189 Million"
 */
function formatAsMillions(amount: number): string {
    const millions = Math.round(amount / 1_000_000);
    return `$${millions} Million`;
}

/**
 * Fetches the total cash back amount (Payout_Amount__c) from Salesforce
 * This is the sum of all payout amounts given back to military families
 * @returns Formatted USD string (e.g., "$532,687")
 */
export async function getCashBackAmount(): Promise<string> {
    try {
        const data = await fetchImpactData();

        if (data.records && data.records.length > 0) {
            const amount = data.records[0].expr0 || 0;
            return formatAsUSD(amount);
        }

        throw new Error('No records returned from Salesforce');
    } catch (error) {
        console.error('Error getting cash back amount:', error);
        // Return fallback value in case of error
        return '$384,287';
    }
}

/**
 * Fetches the total charity donation amount (Charity_Amount__c) from Salesforce
 * This is the sum of all amounts donated to military foundations
 * @returns Formatted USD string (e.g., "$53,280")
 */
export async function getCharityAmount(): Promise<string> {
    try {
        const data = await fetchImpactData();

        if (data.records && data.records.length > 0) {
            const amount = data.records[0].expr1 || 0;
            return formatAsUSD(amount);
        }

        throw new Error('No records returned from Salesforce');
    } catch (error) {
        console.error('Error getting charity amount:', error);
        // Return fallback value in case of error
        return '$36,000';
    }
}

/**
 * Fetches the total real estate volume sold (Sale_Price__c) from Salesforce
 * This is the sum of all sale prices, formatted to the nearest million
 * @returns Formatted string (e.g., "$189 Million")
 */
export async function getTotalVolumeSold(): Promise<string> {
    try {
        const data = await fetchImpactData();

        if (data.records && data.records.length > 0) {
            const amount = data.records[0].expr2 || 0;
            return formatAsMillions(amount);
        }

        throw new Error('No records returned from Salesforce');
    } catch (error) {
        console.error('Error getting total volume sold:', error);
        // Return fallback value in case of error
        return '$136 Million';
    }
}

/**
 * Fetches all impact metrics at once
 * More efficient when you need multiple values since it only makes one API call
 * @returns Object containing all three formatted values
 */
export async function getAllImpactMetrics(): Promise<{
    cashBackAmount: string;
    charityAmount: string;
    totalVolumeSold: string;
}> {
    try {
        const data = await fetchImpactData();

        if (data.records && data.records.length > 0) {
            const record = data.records[0];
            return {
                cashBackAmount: formatAsUSD(record.expr0 || 0),
                charityAmount: formatAsUSD(record.expr1 || 0),
                totalVolumeSold: formatAsMillions(record.expr2 || 0),
            };
        }

        throw new Error('No records returned from Salesforce');
    } catch (error) {
        console.error('Error getting all impact metrics:', error);
        // Return fallback values in case of error
        return {
            cashBackAmount: '$384,287',
            charityAmount: '$36,000',
            totalVolumeSold: '$136 Million',
        };
    }
}

const salesforceImpactService = {
    getCashBackAmount,
    getCharityAmount,
    getTotalVolumeSold,
    getAllImpactMetrics,
};

export default salesforceImpactService;

