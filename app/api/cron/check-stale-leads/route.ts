import { NextRequest, NextResponse } from 'next/server';
import { attio } from '@/lib/attio';
import { openphone } from '@/lib/openphone';
import { slack } from '@/lib/slack';
import { generateMagicLink } from '@/lib/magic-link';

const CRON_SECRET = process.env.CRON_SECRET;
const STALE_HOURS = 12; // Re-route after 12 hours without contact confirmation

interface CronResponse {
    success: boolean;
    processed?: number;
    rerouted?: number;
    escalated?: number;
    error?: string;
}

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/check-stale-leads
 *
 * Checks for stale leads (12+ hours without contact confirmation)
 * and re-routes them to the next highest-scoring agent.
 *
 * Run hourly via cron job with: Authorization: Bearer {CRON_SECRET}
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

        console.log('Starting stale leads check...');

        // 2. Calculate 12 hours ago
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - STALE_HOURS);
        const cutoffTime = twelveHoursAgo.toISOString();

        // 3. Query for stale leads in customer_deals pipeline
        // Conditions: stage = "New Lead", contact_confirmed = false, created < 12h ago, reroute_count = 0
        const staleDeals = await attio.queryListEntries('customer_deals', {
            filter: {
                $and: [
                    // Note: We can't filter by entry_values directly in queryListEntries
                    // So we'll fetch all New Lead entries and filter in memory
                ]
            }
        });

        // Filter to find stale deals that need re-routing
        const dealsToReroute = staleDeals.filter((deal: any) => {
            const entryValues = deal.entry_values || {};

            // Check stage
            const stageValue = entryValues.stage;
            let stageName = '';
            if (Array.isArray(stageValue) && stageValue.length > 0) {
                stageName = stageValue[0]?.status?.title || stageValue[0]?.status || '';
            } else if (typeof stageValue === 'object') {
                stageName = stageValue?.status?.title || stageValue?.status || '';
            }
            if (stageName !== 'New Lead') return false;

            // Check contact_confirmed
            const contactConfirmed = entryValues.contact_confirmed?.[0]?.value ?? entryValues.contact_confirmed ?? false;
            if (contactConfirmed === true) return false;

            // Check reroute_count
            const rerouteCount = entryValues.reroute_count?.[0]?.value ?? entryValues.reroute_count ?? 0;
            if (rerouteCount > 0) return false;

            // Check creation time
            const createdAt = deal.created_at;
            if (!createdAt) return false;
            if (new Date(createdAt) >= new Date(cutoffTime)) return false;

            // Check if there's an agent assigned
            const agentRef = entryValues.agent;
            if (!agentRef) return false;

            return true;
        });

        console.log(`Found ${dealsToReroute.length} stale deals to process`);

        let processed = 0;
        let rerouted = 0;
        let escalated = 0;

        // 4. Process each stale deal
        for (const deal of dealsToReroute) {
            processed++;
            const dealId = deal.id?.entry_id || deal.entry_id;
            const entryValues = deal.entry_values || {};

            try {
                // Get current agent ID
                const agentRef = entryValues.agent;
                let currentAgentId: string | null = null;
                if (Array.isArray(agentRef) && agentRef.length > 0) {
                    currentAgentId = agentRef[0]?.target_record_id;
                } else if (typeof agentRef === 'object') {
                    currentAgentId = agentRef?.target_record_id;
                }

                if (!currentAgentId) {
                    console.warn(`Deal ${dealId} has no agent assigned, skipping`);
                    continue;
                }

                // Get deal's area (from agent's primary assignment)
                const areaId = await getAgentPrimaryArea(currentAgentId);
                if (!areaId) {
                    console.warn(`Could not find area for agent ${currentAgentId}, escalating`);
                    await escalateDeal(deal);
                    escalated++;
                    continue;
                }

                // Find next best agent
                const newAgentId = await findNextBestAgent(areaId, currentAgentId);

                if (newAgentId) {
                    // Re-route to new agent
                    await rerouteDeal(deal, dealId, newAgentId);
                    rerouted++;
                    console.log(`Re-routed deal ${dealId} from ${currentAgentId} to ${newAgentId}`);
                } else {
                    // No agent found, escalate to admin
                    await escalateDeal(deal);
                    escalated++;
                    console.log(`No agent available for deal ${dealId}, escalated to admin`);
                }
            } catch (dealError) {
                console.error(`Error processing deal ${dealId}:`, dealError);
            }
        }

        console.log(`Stale leads check complete: processed=${processed}, rerouted=${rerouted}, escalated=${escalated}`);

        return NextResponse.json({
            success: true,
            processed,
            rerouted,
            escalated
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Stale leads cron error:', errorMessage);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

/**
 * Get agent's primary area (highest AA_Score)
 */
async function getAgentPrimaryArea(agentId: string): Promise<string | null> {
    try {
        const assignments = await attio.queryRecords('area_assignments', {
            filter: {
                $and: [
                    { agent: { target_record_id: { $eq: agentId } } },
                    { status: { $eq: 'Active' } }
                ]
            }
        });

        if (!assignments.length) return null;

        // Sort by aa_score descending and return the top area
        const sorted = assignments.sort((a: any, b: any) => (b.aa_score || 0) - (a.aa_score || 0));
        return sorted[0]?.area || null;
    } catch (error) {
        console.error(`Error getting primary area for agent ${agentId}:`, error);
        return null;
    }
}

/**
 * Find the next best agent in an area, excluding the current agent
 */
async function findNextBestAgent(areaId: string, excludeAgentId: string): Promise<string | null> {
    try {
        const assignments = await attio.queryRecords('area_assignments', {
            filter: {
                $and: [
                    { area: { target_record_id: { $eq: areaId } } },
                    { status: { $eq: 'Active' } }
                ]
            }
        });

        // Filter out the excluded agent and sort by aa_score
        const availableAssignments = assignments
            .filter((a: any) => a.agent !== excludeAgentId)
            .sort((a: any, b: any) => (b.aa_score || 0) - (a.aa_score || 0));

        if (!availableAssignments.length) return null;

        // Verify the agent is active on website
        const topAgentId = availableAssignments[0].agent;
        const agent = await attio.getRecord('agents', topAgentId);
        if (agent?.active_on_website !== true) {
            // Try the next one
            for (let i = 1; i < availableAssignments.length; i++) {
                const nextAgentId = availableAssignments[i].agent;
                const nextAgent = await attio.getRecord('agents', nextAgentId);
                if (nextAgent?.active_on_website === true) {
                    return nextAgentId;
                }
            }
            return null;
        }

        return topAgentId;
    } catch (error) {
        console.error(`Error finding next agent for area ${areaId}:`, error);
        return null;
    }
}

/**
 * Re-route a deal to a new agent
 */
async function rerouteDeal(deal: any, dealId: string, newAgentId: string): Promise<void> {
    // Update the deal with new agent
    await attio.updateListEntry('customer_deals', dealId, {
        agent: { target_object: 'agents', target_record_id: newAgentId },
        reroute_count: 1,
        last_updated: new Date().toISOString(),
    });

    // Get new agent info for notification
    const newAgent = await attio.getRecord('agents', newAgentId);
    if (!newAgent?.phone) {
        console.warn(`New agent ${newAgentId} has no phone number, skipping SMS`);
        return;
    }

    // Get customer info
    const parentRecordId = deal.parent_record_id || deal.parent?.record_id;
    let customerName = 'Customer';
    if (parentRecordId) {
        const customer = await attio.getRecord('customers', parentRecordId);
        customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Customer';
    }

    // Generate magic link and send SMS
    const magicLink = generateMagicLink(newAgentId, dealId, 'agent');
    const dealType = deal.entry_values?.deal_type?.[0]?.value || deal.entry_values?.deal_type || 'Buying';

    await openphone.sendRerouteNotification({
        to: newAgent.phone,
        agentName: newAgent.first_name || newAgent.name || 'Agent',
        customerName,
        dealType,
        magicLink,
    });
}

/**
 * Escalate a deal to admin when no agent is available
 */
async function escalateDeal(deal: any): Promise<void> {
    // Get customer info
    const parentRecordId = deal.parent_record_id || deal.parent?.record_id;
    let customerName = 'Unknown';
    let customerEmail = 'Unknown';
    if (parentRecordId) {
        const customer = await attio.getRecord('customers', parentRecordId);
        customerName = customer?.name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown';
        customerEmail = customer?.email || 'Unknown';
    }

    // Send Slack alert
    await slack.sendManualAssignmentNeeded({
        customerName,
        customerEmail,
        reason: 'No agent available for re-route after 12 hours without contact',
    });
}
