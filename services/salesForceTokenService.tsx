import { salesForceTokenAPI, RequestType } from '@/services/api';
import { SALESFORCE_LOGIN_BASE_URL } from '@/constants/api';

let SALESFORCETOKEN: string | null = null;
let GOOGLEAUTH: string | null = null;

export async function getSalesforceToken() {
    try {
        const response = await salesForceTokenAPI({
            endpoint: `${SALESFORCE_LOGIN_BASE_URL}/services/oauth2/token?grant_type=password&client_id=${process.env.SALESFORCE_CLIENT_ID}&client_secret=${process.env.SALESFORCE_CLIENT_SECRET}&username=${process.env.SALESFORCE_USERNAME}&password=${process.env.SALESFORCE_PASSWORD}${process.env.SALESFORCE_TOKEN}`,
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

export async function getGoogleAuthToken() {
    try {
        const authorizationUrl = process.env.GOOGLE_AUTH_URL +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            // `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
            `response_type=code&` +
            `scope=${process.env.GOOGLE_SCOPES}&` +
            `access_type=offline&` +
            `prompt=consent`;

        const response = await salesForceTokenAPI({
            endpoint: authorizationUrl,
            type: RequestType.POST,
        })

        if (response?.status === 200) {
            GOOGLEAUTH = response.data.access_token;
            return response.data.access_token
        } else {
            throw new Error('Failed to FETCH Google Auth Token');
        }
    } catch (error) {
        console.error('Error fetching Google Auth token:', error);
        throw error;
    }
}

export { SALESFORCETOKEN, GOOGLEAUTH }

