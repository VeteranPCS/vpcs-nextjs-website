// services/salesForcePostFormsService.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function contactAgentPostForm(formData: any, queryString: string) {
    try {
        const paramsObj: { [key: string]: string } = {};
        new URLSearchParams(queryString).forEach((value, key) => {
            paramsObj[key] = value;
        });

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `https://veteranpcs.com/thank-you/`,
            "00N4x00000QPJUT": paramsObj.id,
            recordType: "0124x000000Z5yD",
            lead_source: "Website",
            "00N4x00000Lsr0GAAU": "true",
            country_code: "US",
            "00N4x00000QQ1LB": `https://veteranpcs.com/contact-agent${queryString}`,
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            mobile: formData.phone || "",
            "00N4x00000Lpb0T": formData.currentBase || "",
            "00N4x00000LspUs": formData.destinationBase || "",
            "00N4x00000QPksj": formData.howDidYouHear || "",
            "00N4x00000QPS7V": formData.tellusMore || "",
            "00N4x00000bfgFA": formData.additionalComments || "",
            "00N4x00000LsnP2": formData.status_select || "",
            "00N4x00000LsnOx": formData.branch_select || "",
            "00N4x00000QQ0Vz": formData.discharge_status || "",
            "00N4x00000LspV2": formData.state || "",
            "00N4x00000LspUi": formData.city || "",
            "00N4x00000LsaDm": formData.buyingSelling || "",
            "00N4x00000cKsNF": formData.timeframe || "",
            "00N4x00000LssBZ": formData.typeOfHome || "",
            "00N4x00000Lpb2K": formData.bedrooms || "",
            "00N4x00000Lpb2Z": formData.bathrooms || "",
            "00N4x00000LsaCy": formData.maxPrice || "",
            "00N4x00000Lpbfw": formData.preApproval || "",
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();


        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function GetListedAgentsPostForm(formData: any) {
    try {
        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: "https://veteranpcs.com/thank-you/",
            recordType: "0124x000000Z5yI",
            lead_source: "Website",
            "00N4x00000Lsr0G": "true",
            country_code: "US",
            "00N4x00000QQ1LB": "https://veteranpcs.com/get-listed-agents/",
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            mobile: formData.phone || "",
            "00N4x00000LsnP2": formData.status_select || "",
            "00N4x00000LsnOx": formData.branch_select || "",
            "00N4x00000QQ0Vz": formData.discharge_status || "",
            "state_code": formData.state || "",
            "city": formData.city || "",
            "00N4x00000LpcBo": formData.primaryState || "",
            "00N4x00000QPIOt": formData.otherStates || "",
            "00N4x00000LpcCm": formData.licenseNumber || "",
            "00N4x00000LpcCr": formData.brokerageName || "",
            "00N4x00000c4kPN": formData.managingBrokerName || "",
            "00N4x00000c4kPS": formData.managingBrokerPhone || "",
            "00N4x00000c4kPX": formData.managingBrokerEmail || "",
            "00N4x00000LsqCV": formData.citiesServiced || "",
            "00N4x00000LsqCa": formData.basesServiced || "",
            "00N4x00000LpcDQ": formData.personallyPCS || "",
            "00N4x00000LpcDV": formData.leadAcceptance || "",
            "00N4x00000QPksj": formData.howDidYouHear || "",
            "00N4x00000QPS7V": formData.tellusMore || "",
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();


        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function GetListedLendersPostForm(formData: any) {
    try {
        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: "https://veteranpcs.com/thank-you/",
            recordType: "0124x000000ZGGU",
            lead_source: "Website",
            "00N4x00000Lsr0G": "true",
            country_code: "US",
            "00N4x00000QQ1LB": "https://veteranpcs.com/get-listed-lendors/",
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            mobile: formData.phone || "",
            "00N4x00000LsnP2": formData.status_select || "",
            "00N4x00000LsnOx": formData.branch_select || "",
            "00N4x00000QQ0Vz": formData.discharge_status || "",
            "00N4x00000LpcBo": formData.primaryState || "",
            "00N4x00000QPIOt": formData.otherStates || "",
            "00N4x00000LsqCV": formData.localCities || "",
            "00N4x00000QPIOZ": formData.nmlsId || "",
            "00N4x00000LpcCr": formData.name || "",
            "street": formData.street || "",
            "state_code": formData.state || "",
            "city": formData.city || "",
            "zip": formData.zip || "",
            "00N4x00000QPIOe": formData.companyNMLSId || "",
            "00N4x00000QPksj": formData.howDidYouHear || "",
            "00N4x00000QPS7V": formData.tellusMore || "",
            "g-recaptcha-response": formData.captchaToken || "",
            "captcha_settings": formData.captcha_settings || "",
        }).toString();


        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}

export async function contactLenderPostForm(formData: any, fullQueryString: string) {
    const paramsObj: { [key: string]: string } = {};
    new URLSearchParams(fullQueryString).forEach((value, key) => {
        paramsObj[key] = value;
    });

    const formBody = new URLSearchParams({
        oid: "00D4x000003yaV2",
        retURL: "https://veteranpcs.com/thank-you",
        "00N4x00000QPJUT": paramsObj.id,
        recordType: "0124x000000Z5yD",
        lead_source: "Website",
        "00N4x00000Lsr0GAAU": "true",
        country_code: "US",
        "00N4x00000QQ1LB": `https://veteranpcs.com/contact-lender${fullQueryString}`,
        first_name: formData.firstName || "",
        last_name: formData.lastName || "",
        email: formData.email || "",
        mobile: formData.phone || "",
        "00N4x00000LspUs": formData.currentBase || "",
        "00N4x00000QPksj": formData.howDidYouHear || "",
        "00N4x00000QPS7V": formData.tellusMore || "",
        "00N4x00000bfgFA": formData.additionalComments || "",
        "g-recaptcha-response": formData.captchaToken || "",
        "captcha_settings": formData.captcha_settings || "",
    }).toString();

    try {
        const response = await fetch(
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formBody,
            }
        );

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        // const locationHeader = response.headers.get('Location');
        // if (locationHeader) {
        //     return { locationHeader };
        // }

        const data = await response.text();
        const redirectUrlMatch = data.match(/window.location(?:\.replace)?\(['"]([^'"]+)['"]\)/);
        const redirectUrl = redirectUrlMatch ? redirectUrlMatch[1] : null;

        if (redirectUrl) {
            return { redirectUrl };
        }

        return { message: 'Form submitted successfully!' };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}