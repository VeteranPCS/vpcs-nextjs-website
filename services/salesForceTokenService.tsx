import { salesForceTokenAPI, RequestType } from '@/services/api';

let SALESFORCETOKEN: string | null = null;

export async function getSalesforceToken() {
    try {
        const response = await salesForceTokenAPI({
            endpoint: `https://login.salesforce.com/services/oauth2/token?grant_type=password&client_id=${process.env.SALESFORCE_CLIENT_ID}&client_secret=${process.env.SALESFORCE_CLIENT_SECRET}&username=${process.env.SALESFORCE_USERNAME}&password=${process.env.SALESFORCE_PASSWORD}${process.env.SALESFORCE_TOKEN}`,
            type: RequestType.POST,
        })

        if (response?.status === 200) {
            SALESFORCETOKEN = response.data.access_token;
            return response.data.access_token
        } else {
            throw new Error('Failed to FETCH Salesforce Token');
        }
    } catch (error) {
        console.error('Error fetching Salesforce token:', error);
        throw error;
    }
}

export { SALESFORCETOKEN }

