'use server';

interface OpenPhoneMessageParams {
    content: string;
    from: string;
    to: string[];
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response;
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                console.error(`Fetch aborted after 30s on attempt ${i + 1}`);
            }
            if (i < retries - 1) {
                console.log(`Retrying fetch attempt ${i + 1} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries reached');
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