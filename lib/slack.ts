// lib/slack.ts
// Slack webhook notifications for admin alerts

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

class SlackClient {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = SLACK_WEBHOOK_URL;
  }

  /**
   * Send a raw message to Slack
   */
  async send(message: SlackMessage): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('SLACK_WEBHOOK_URL not configured, skipping notification');
      return;
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack webhook failed: ${response.status} ${error}`);
    }
  }

  /**
   * Send a formatted alert with title and key-value details
   * Used for admin notifications about deals, leads, etc.
   */
  async sendAlert(title: string, details: Record<string, string>): Promise<void> {
    const fields = Object.entries(details).map(([key, value]) => ({
      type: 'mrkdwn' as const,
      text: `*${key}:*\n${value}`,
    }));

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title,
        },
      },
      {
        type: 'section',
        fields,
      },
    ];

    await this.send({
      text: title, // Fallback for notifications
      blocks,
    });
  }

  /**
   * Send an error notification
   * Used for system errors that need admin attention
   */
  async sendError(title: string, error: Error): Promise<void> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${error.message}\`\`\``,
        },
      },
    ];

    if (error.stack) {
      blocks.push({
        type: 'context',
        text: {
          type: 'mrkdwn',
          text: `Stack trace: \`${error.stack.split('\n')[1]?.trim() || 'N/A'}\``,
        },
      });
    }

    await this.send({
      text: `🚨 ${title}: ${error.message}`,
      blocks,
    });
  }

  /**
   * Send a new lead notification
   */
  async sendNewLead(params: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    agentName: string;
    dealType: 'Buying' | 'Selling' | 'Lender';
    area?: string;
  }): Promise<void> {
    await this.sendAlert('🏠 New Lead Assigned', {
      Customer: params.customerName,
      Email: params.customerEmail,
      ...(params.customerPhone && { Phone: params.customerPhone }),
      'Assigned To': params.agentName,
      'Deal Type': params.dealType,
      ...(params.area && { Area: params.area }),
    });
  }

  /**
   * Send a deal closed notification
   */
  async sendDealClosed(params: {
    customerName: string;
    agentName: string;
    salePrice?: number;
    dealType: 'Buying' | 'Selling' | 'Lender';
  }): Promise<void> {
    await this.sendAlert('🎉 Deal Closed!', {
      Customer: params.customerName,
      Agent: params.agentName,
      ...(params.salePrice && {
        'Sale Price': new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(params.salePrice),
      }),
      'Deal Type': params.dealType,
    });
  }

  /**
   * Send a stalled deal alert (14+ days)
   */
  async sendStalledDealAlert(params: {
    dealId: string;
    customerName: string;
    agentName: string;
    stage: string;
    daysSinceUpdate: number;
  }): Promise<void> {
    await this.sendAlert('⚠️ Deal Stalled - Admin Action Needed', {
      'Deal ID': params.dealId,
      Customer: params.customerName,
      Agent: params.agentName,
      'Current Stage': params.stage,
      'Days Since Update': params.daysSinceUpdate.toString(),
    });
  }

  /**
   * Send a manual assignment needed alert
   */
  async sendManualAssignmentNeeded(params: {
    customerName: string;
    customerEmail: string;
    area?: string;
    state?: string;
    reason: string;
  }): Promise<void> {
    await this.sendAlert('🔔 Manual Assignment Needed', {
      Customer: params.customerName,
      Email: params.customerEmail,
      ...(params.area && { Area: params.area }),
      ...(params.state && { State: params.state }),
      Reason: params.reason,
    });
  }
}

export const slack = new SlackClient();
