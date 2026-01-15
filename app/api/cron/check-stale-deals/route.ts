import { NextRequest, NextResponse } from 'next/server';
import { attio } from '@/lib/attio';
import { openphone } from '@/lib/openphone';
import { slack } from '@/lib/slack';
import { generateMagicLink } from '@/lib/magic-link';

const CRON_SECRET = process.env.CRON_SECRET;

// Thresholds for stale deal actions
const REMINDER_DAYS = 7;       // Send SMS reminder to agent
const ALERT_DAYS = 14;         // Send Slack alert to admin
const AUTO_CLOSE_DAYS = 45;    // Auto-close as Closed Lost

// Open stages that should be checked for staleness
const OPEN_STAGES = [
    'New Lead',
    'Contacted',
    'Touring',
    'Tracking <1mo',
    'Tracking 1-2mo',
    'Tracking 3-6mo',
    'Tracking 6+',
    'Under Contract',
];

interface CronResponse {
    success: boolean;
    sevenDayReminders?: number;
    fourteenDayAlerts?: number;
    autoClosed?: number;
    error?: string;
}

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/check-stale-deals
 *
 * Checks for stale deals and takes appropriate action:
 * - 7 days: Send SMS reminder to agent
 * - 14 days: Send Slack alert to admin
 * - 45 days: Auto-close as "Closed Lost"
 *
 * Run daily via cron job with: Authorization: Bearer {CRON_SECRET}
 */
export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
    try {
        // 1. Verify cron authorization
        if (CRON_SECRET) {
            const authHeader = request.headers.get('authorization');
            if (authHeader !== `Bearer ${CRON_SECRET}`) {
                return NextResponse.json({
                    success: false,
                    error: 'Unauthorized'
                }, { status: 401 });
            }
        }

        console.log('Starting stale deals check...');

        // 2. Calculate cutoff dates
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - REMINDER_DAYS * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - ALERT_DAYS * 24 * 60 * 60 * 1000);
        const fortyFiveDaysAgo = new Date(now.getTime() - AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);

        // 3. Fetch all open deals
        const allDeals = await attio.queryListEntries('customer_deals', {});

        // Filter to open stages only
        const openDeals = allDeals.filter((deal: any) => {
            const entryValues = deal.entry_values || {};
            const stageValue = entryValues.stage;
            let stageName = '';
            if (Array.isArray(stageValue) && stageValue.length > 0) {
                stageName = stageValue[0]?.status?.title || stageValue[0]?.status || '';
            } else if (typeof stageValue === 'object') {
                stageName = stageValue?.status?.title || stageValue?.status || '';
            }
            return OPEN_STAGES.includes(stageName);
        });

        console.log(`Found ${openDeals.length} open deals to check`);

        let sevenDayReminders = 0;
        let fourteenDayAlerts = 0;
        let autoClosed = 0;

        // Track deals we've already processed to avoid duplicates
        const processedFor7Day = new Set<string>();
        const processedFor14Day = new Set<string>();

        // 4. Process each open deal
        for (const deal of openDeals) {
            const dealId = deal.id?.entry_id || deal.entry_id;
            const entryValues = deal.entry_values || {};

            // Get last_updated timestamp
            const lastUpdated = entryValues.last_updated?.[0]?.value || entryValues.last_updated || deal.updated_at;
            if (!lastUpdated) continue;

            const lastUpdatedDate = new Date(lastUpdated);

            // Get last_stage_change for auto-close check
            const lastStageChange = entryValues.last_stage_change?.[0]?.value || entryValues.last_stage_change || deal.created_at;
            const lastStageChangeDate = lastStageChange ? new Date(lastStageChange) : null;

            try {
                // Check for 45-day auto-close (based on last_stage_change)
                if (lastStageChangeDate && lastStageChangeDate < fortyFiveDaysAgo) {
                    await autoCloseDeal(deal, dealId);
                    autoClosed++;
                    console.log(`Auto-closed deal ${dealId} (45+ days in same stage)`);
                    continue; // Don't send reminders for closed deals
                }

                // Check for 14-day admin alert
                if (lastUpdatedDate < fourteenDaysAgo && !processedFor14Day.has(dealId)) {
                    await sendAdminAlert(deal, dealId);
                    fourteenDayAlerts++;
                    processedFor14Day.add(dealId);
                    console.log(`Sent 14-day admin alert for deal ${dealId}`);
                }

                // Check for 7-day reminder (between 7 and 14 days)
                if (lastUpdatedDate < sevenDaysAgo && lastUpdatedDate >= fourteenDaysAgo && !processedFor7Day.has(dealId)) {
                    await sendAgentReminder(deal, dealId);
                    sevenDayReminders++;
                    processedFor7Day.add(dealId);
                    console.log(`Sent 7-day reminder for deal ${dealId}`);
                }
            } catch (dealError) {
                console.error(`Error processing deal ${dealId}:`, dealError);
            }
        }

        console.log(`Stale deals check complete: reminders=${sevenDayReminders}, alerts=${fourteenDayAlerts}, autoClosed=${autoClosed}`);

        return NextResponse.json({
            success: true,
            sevenDayReminders,
            fourteenDayAlerts,
            autoClosed
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Stale deals cron error:', errorMessage);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

/**
 * Send 7-day SMS reminder to agent
 */
async function sendAgentReminder(deal: any, dealId: string): Promise<void> {
    const entryValues = deal.entry_values || {};

    // Get agent info
    const agentRef = entryValues.agent;
    let agentId: string | null = null;
    if (Array.isArray(agentRef) && agentRef.length > 0) {
        agentId = agentRef[0]?.target_record_id;
    } else if (typeof agentRef === 'object') {
        agentId = agentRef?.target_record_id;
    }

    if (!agentId) {
        console.warn(`Deal ${dealId} has no agent, skipping reminder`);
        return;
    }

    const agent = await attio.getRecord('agents', agentId);
    if (!agent?.phone) {
        console.warn(`Agent ${agentId} has no phone, skipping reminder`);
        return;
    }

    // Get customer name
    const parentRecordId = deal.parent_record_id || deal.parent?.record_id;
    let customerName = 'Customer';
    if (parentRecordId) {
        const customer = await attio.getRecord('customers', parentRecordId);
        customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';
    }

    // Get current stage
    const stageValue = entryValues.stage;
    let stage = 'Unknown';
    if (Array.isArray(stageValue) && stageValue.length > 0) {
        stage = stageValue[0]?.status?.title || stageValue[0]?.status || 'Unknown';
    } else if (typeof stageValue === 'object') {
        stage = stageValue?.status?.title || stageValue?.status || 'Unknown';
    }

    // Generate magic link
    const magicLink = generateMagicLink(agentId, dealId, 'agent');

    await openphone.sendStalledDealReminder({
        to: agent.phone,
        agentName: agent.first_name || agent.name || 'Agent',
        customerName,
        stage,
        magicLink,
    });
}

/**
 * Send 14-day Slack alert to admin
 */
async function sendAdminAlert(deal: any, dealId: string): Promise<void> {
    const entryValues = deal.entry_values || {};

    // Get agent name
    const agentRef = entryValues.agent;
    let agentId: string | null = null;
    if (Array.isArray(agentRef) && agentRef.length > 0) {
        agentId = agentRef[0]?.target_record_id;
    } else if (typeof agentRef === 'object') {
        agentId = agentRef?.target_record_id;
    }

    let agentName = 'Unknown Agent';
    if (agentId) {
        const agent = await attio.getRecord('agents', agentId);
        agentName = agent?.name || `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() || 'Unknown Agent';
    }

    // Get customer name
    const parentRecordId = deal.parent_record_id || deal.parent?.record_id;
    let customerName = 'Unknown';
    if (parentRecordId) {
        const customer = await attio.getRecord('customers', parentRecordId);
        customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown';
    }

    // Get current stage
    const stageValue = entryValues.stage;
    let stage = 'Unknown';
    if (Array.isArray(stageValue) && stageValue.length > 0) {
        stage = stageValue[0]?.status?.title || stageValue[0]?.status || 'Unknown';
    } else if (typeof stageValue === 'object') {
        stage = stageValue?.status?.title || stageValue?.status || 'Unknown';
    }

    // Calculate days since last update
    const lastUpdated = entryValues.last_updated?.[0]?.value || entryValues.last_updated || deal.updated_at;
    const daysSinceUpdate = lastUpdated
        ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (24 * 60 * 60 * 1000))
        : 14;

    await slack.sendStalledDealAlert({
        dealId,
        customerName,
        agentName,
        stage,
        daysSinceUpdate,
    });
}

/**
 * Auto-close deal as "Closed Lost"
 */
async function autoCloseDeal(deal: any, dealId: string): Promise<void> {
    const entryValues = deal.entry_values || {};

    // Get existing notes
    let existingNotes = entryValues.notes?.[0]?.value || entryValues.notes || '';

    // Append auto-close note
    const autoCloseNote = `\n\n[Auto-closed: 45 days in same stage - ${new Date().toISOString()}]`;
    const updatedNotes = existingNotes + autoCloseNote;

    // Update the deal
    await attio.updateListEntry(
        'customer_deals',
        dealId,
        {
            notes: updatedNotes,
            last_updated: new Date().toISOString(),
            last_stage_change: new Date().toISOString(),
        },
        'Closed Lost'
    );
}
