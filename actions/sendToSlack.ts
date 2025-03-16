'use server';

export default async function sendToSlack({ headerText, name, email, phoneNumber, message }: { headerText: string, name: string, email: string, phoneNumber: string, message: string }) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('SLACK_WEBHOOK_URL is not configured');
        return { ok: false };
    }

    const payload = {
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: headerText,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Name:*\n${name}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Email:*\n${email}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Phone Number:*\n${phoneNumber}`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Message:*\n${message}`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Submitted: ${new Date().toLocaleString()}`
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Slack API error:', errorData);
            return { ok: false, error: errorData };
        }

        return { ok: true };
    } catch (error) {
        console.error('Error sending to Slack:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}