'use server';

import fetchWithRetry from "@/utils/fetchWithRetry";

interface OpenPhoneMessageParams {
    content: string;
    from: string;
    to: string[];
}

export async function sendOpenPhoneMessage(params: OpenPhoneMessageParams) {
    try {
        const { content, from, to } = params;
        console.log("Sending OpenPhone message:", { content, from, to });
        const startTime = Date.now();
        const response = await fetchWithRetry('https://api.openphone.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': process.env.OPEN_PHONE_API_KEY || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                from,
                to
            }),
        });
        const endTime = Date.now();
        console.log(`OpenPhone request completed in ${endTime - startTime}ms`);

        console.log("OpenPhone response status:", response.status);
        console.log("OpenPhone response headers:", Object.fromEntries(response.headers));
        const responseData = await response.json();
        console.log("OpenPhone response data:", responseData);

        if (!response.ok) {
            throw new Error(`OpenPhone API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        return responseData;
    } catch (error) {
        console.error('Error sending OpenPhone message:', error);
        throw error;
    }
}