import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { SALESFORCETOKEN, getSalesforceToken } from "@/services/salesForceTokenService";

// ***** start - import from files *****
import { BASE_API_URL } from "@/constants/api";
// ***** end - import from files *****

// ***** start - static variables *****
const mainUrl = BASE_API_URL;
// ***** end - static variables *****

// Enum for API Request Types
export enum RequestType {
    POST = "post",
    GET = "get",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
    POST_WITHOUT_TOKEN = "postWithoutToken",
    POST_FORM_DATA = "postFormData",
    PATCH_FORM_DATA = "patchFormData",
}

// Interface for headers
interface CustomHeaders {
    [key: string]: string | undefined;
}

// Interface for the API function parameters
interface ApiParams {
    endpoint: string;
    data?: any;
    type: RequestType;
    logOutToken?: string;
    isNonAuthenticated?: boolean;
    customHeader?: CustomHeaders;
}

// ***** start - Api function for calling any type of APIs *****
export const api = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    const config: AxiosRequestConfig = {
        url: `${mainUrl}/${endpoint}`,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache", 
        },
    };

    try {
        res = await axios(config);  
    } catch (err: any) {
        res = err.response; 
    }

    return res;  // Return the response or error
};
// ***** end - Api function for calling any type of APIs *****

export const salesForceAPI = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;

    if(!SALESFORCETOKEN) {
        await getSalesforceToken()
    }
    
    const config: AxiosRequestConfig = {
        url: endpoint,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache", 
            Authorization: `Bearer ${SALESFORCETOKEN}`,
        },
    };

    try {
        res = await axios(config);  
    } catch (err: any) {
        res = err.response; 
    }

    return res;  // Return the response or error
};

export const salesForceTokenAPI = async ({
    endpoint,
    data,
    type
}: ApiParams): Promise<AxiosResponse | undefined> => {
    let res: AxiosResponse | undefined;
    
    const config: AxiosRequestConfig = {
        url: endpoint,
        method: type as any,
        data,
        headers: {
            "Cache-Control": "no-cache", 
        },
    };

    try {
        res = await axios(config);  
    } catch (err: any) {
        res = err.response; 
    }

    return res;  // Return the response or error
};