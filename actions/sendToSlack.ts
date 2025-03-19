'use server';
import formatPhoneNumber from '@/utils/formatPhoneNumber';

interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    fields?: Array<{
        type: string;
        text: string;
    }>;
    elements?: Array<{
        type: string;
        text: string;
    }>;
}

export default async function sendToSlack({
    headerText,
    name,
    email,
    phoneNumber,
    message,
    agentInfo
}: {
    headerText: string,
    name: string,
    email: string,
    phoneNumber: string,
    message: string,
    agentInfo?: {
        name: string,
        email: string,
        phoneNumber: string,
        brokerage?: string,
        state?: string
    }
}) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('SLACK_WEBHOOK_URL is not configured');
        return { ok: false };
    }

    const blocks: SlackBlock[] = [
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
                    text: `*Phone Number:*\n<tel:${phoneNumber}|${formatPhoneNumber(phoneNumber)}>`
                }
            ]
        }
    ];

    if (message) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Message:*\n${message}`,
            }
        });
    }

    if (agentInfo) {
        const agentFields = [
            {
                type: 'mrkdwn',
                text: `*Agent Name:*\n${agentInfo.name || ''}`
            },
            {
                type: 'mrkdwn',
                text: `*Agent Email:*\n${agentInfo.email || ''}`
            },
            {
                type: 'mrkdwn',
                text: `*Agent Phone:*\n${agentInfo.phoneNumber || ''}`
            }
        ];

        if (agentInfo.brokerage) {
            agentFields.push({
                type: 'mrkdwn',
                text: `*Agent Brokerage:*\n${agentInfo.brokerage}`
            });
        }

        if (agentInfo.state) {
            agentFields.push({
                type: 'mrkdwn',
                text: `*State:*\n${agentInfo.state.charAt(0).toUpperCase() + agentInfo.state.slice(1)}`
            });
        }

        blocks.push({
            type: 'section',
            fields: agentFields
        });
    }

    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `Submitted: ${new Date().toLocaleString()}`
            }
        ]
    });

    const payload = { blocks };

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