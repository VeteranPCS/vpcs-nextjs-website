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

        const response = await fetch('https://api.openphone.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': process.env.OPEN_PHONE_API_KEY || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                from,
                to,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenPhone API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending OpenPhone message:', error);
        throw error;
    }
}