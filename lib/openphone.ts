// lib/openphone.ts
// SMS notifications via OpenPhone API

const OPENPHONE_API_KEY = process.env.OPEN_PHONE_API_KEY;
const OPENPHONE_FROM_NUMBER = process.env.OPEN_PHONE_FROM_NUMBER;
const OPENPHONE_API_URL = 'https://api.openphone.com/v1';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class OpenPhoneClient {
  private apiKey: string | undefined;
  private fromNumber: string | undefined;

  constructor() {
    this.apiKey = OPENPHONE_API_KEY;
    this.fromNumber = OPENPHONE_FROM_NUMBER;
  }

  /**
   * Send an SMS message
   *
   * @param to - Phone number in E.164 format (e.g., +15551234567)
   * @param text - Message content (max 1600 chars for standard SMS)
   */
  async sendSMS(params: { to: string; text: string }): Promise<SMSResult> {
    if (!this.apiKey || !this.fromNumber) {
      console.warn('OpenPhone not configured, skipping SMS');
      return {
        success: false,
        error: 'OpenPhone not configured',
      };
    }

    // Validate E.164 format
    if (!params.to.match(/^\+[1-9]\d{1,14}$/)) {
      return {
        success: false,
        error: `Invalid phone number format: ${params.to}. Must be E.164 format.`,
      };
    }

    try {
      const response = await fetch(`${OPENPHONE_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        body: JSON.stringify({
          from: this.fromNumber,
          to: [params.to],
          content: params.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `OpenPhone API error: ${response.status} ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.data?.id || data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send new lead notification to agent/lender
   */
  async sendNewLeadNotification(params: {
    to: string;
    agentName: string;
    customerName: string;
    dealType: 'Buying' | 'Selling' | 'Lender';
    magicLink: string;
  }): Promise<SMSResult> {
    const message = `Hi ${params.agentName}! New VeteranPCS lead: ${params.customerName} needs a ${params.dealType.toLowerCase()} agent. View details and confirm contact: ${params.magicLink}`;

    return this.sendSMS({
      to: params.to,
      text: message,
    });
  }

  /**
   * Send stalled deal reminder (7 days)
   */
  async sendStalledDealReminder(params: {
    to: string;
    agentName: string;
    customerName: string;
    stage: string;
    magicLink: string;
  }): Promise<SMSResult> {
    const message = `VeteranPCS Reminder: Hi ${params.agentName}, your deal with ${params.customerName} hasn't been updated in 7 days. Current stage: ${params.stage}. Update now: ${params.magicLink}`;

    return this.sendSMS({
      to: params.to,
      text: message,
    });
  }

  /**
   * Send lead reroute notification to new agent
   */
  async sendRerouteNotification(params: {
    to: string;
    agentName: string;
    customerName: string;
    dealType: 'Buying' | 'Selling' | 'Lender';
    magicLink: string;
  }): Promise<SMSResult> {
    const message = `Hi ${params.agentName}! A VeteranPCS lead has been reassigned to you: ${params.customerName} (${params.dealType.toLowerCase()}). Please contact them ASAP: ${params.magicLink}`;

    return this.sendSMS({
      to: params.to,
      text: message,
    });
  }

  /**
   * Send contact confirmation reminder
   */
  async sendContactReminder(params: {
    to: string;
    agentName: string;
    customerName: string;
    hoursRemaining: number;
    magicLink: string;
  }): Promise<SMSResult> {
    const message = `VeteranPCS: Hi ${params.agentName}, please confirm contact with ${params.customerName} within ${params.hoursRemaining}h or the lead may be reassigned. Update status: ${params.magicLink}`;

    return this.sendSMS({
      to: params.to,
      text: message,
    });
  }
}

export const openphone = new OpenPhoneClient();
