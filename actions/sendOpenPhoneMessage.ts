'use server';

export const OPEN_PHONE_FROM_NUMBER = "+17194153014";

interface OpenPhoneMessageParams {
    content: string;
    from: string;
    to: string[];
}

/**
 * Sends a message via OpenPhone API
 * @param params Message parameters including content, from, and to
 * @returns Response from the OpenPhone API
 */
export async function sendOpenPhoneMessage(params: OpenPhoneMessageParams) {
    try {
        const { content, from, to } = params;
        console.log("Sending OpenPhone message:", { content, from, to });
        const response = await fetch('https://api.openphone.com/v1/messages', {
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