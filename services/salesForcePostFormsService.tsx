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
        console.log("formData", formData)
        console.log("agent", paramsObj)

        const formBody = new URLSearchParams({
            oid: "00D4x000003yaV2",
            retURL: `https://veteranpcs.com/thank-you?path=/contact-agent/&retURL=https://veteranpcs.com/${paramsObj.state}&firstName=${paramsObj.fn}&form=agent`,
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
            "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D4x000003yaV2",
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

        // revalidatePath('/');
        // redirect("https://veteranpcs.com/");
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to submit form');
    }
}