'use server';

import fetchWithRetry from "@/utils/fetchWithRetry";

interface OpenPhoneMessageParams {
    content: string;
    from: string;
    to: string[];
}

export async function sendOpenPhoneMessage(params: OpenPhoneMessageParams) {
    const { content, from, to } = params;
    // Log function invocation and recipient count
    console.log(`Initiating sendOpenPhoneMessage for ${to.length} recipients.`);
    try {
        // Log API call attempt
        console.log('Attempting to send message via OpenPhone API...');
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

        // Log API response status
        console.log(`Received response from OpenPhone API with status: ${response.status}`);

        const responseData = await response.json();

        if (!response.ok) {
            // Log API error status before throwing
            console.error(`OpenPhone API request failed with status: ${response.status}`);
            throw new Error(`OpenPhone API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        // Log successful API call
        console.log('Successfully sent message via OpenPhone API.');
        // Optionally log a non-sensitive ID if available and safe:
        if (responseData.id) {
            console.log(`OpenPhone Message ID: ${responseData.id}`);
        }

        return responseData;
    } catch (error) {
        // Enhance existing error logging with recipient count
        console.error(`Error sending OpenPhone message for ${to.length} recipients:`, error);
        throw error;
    }
}