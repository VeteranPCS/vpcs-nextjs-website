import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/magic-link';
import { attio } from '@/lib/attio';
import { slack } from '@/lib/slack';

interface UpdateRequest {
    token: string;
    updates: {
        stage?: string;
        contact_confirmed?: boolean;
        notes?: string;
        sale_price?: number;
        property_address?: string;
        expected_close_date?: string;
        actual_close_date?: string;
    };
}

interface UpdateResponse {
    success: boolean;
    error?: string;
}

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/magic-link/update
 *
 * Updates a deal from the agent portal using a magic link token.
 *
 * Request body:
 * {
 *   token: string,
 *   updates: { stage?, contact_confirmed?, notes?, ... }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<UpdateResponse>> {
    try {
        const body: UpdateRequest = await request.json();
        const { token, updates } = body;

        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'Token is required'
            }, { status: 400 });
        }

        if (!updates || Object.keys(updates).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No updates provided'
            }, { status: 400 });
        }

        // 1. Validate the token
        const validation = validateMagicLink(token);

        if (!validation.valid || !validation.agent_id || !validation.deal_id) {
            return NextResponse.json({
                success: false,
                error: validation.error || 'Invalid or expired token'
            }, { status: 401 });
        }

        // 2. Build update payload
        const updateData: Record<string, any> = {
            last_updated: new Date().toISOString(),
        };

        // Map updates to Attio fields
        if (updates.notes !== undefined) {
            updateData.notes = updates.notes;
        }
        if (updates.sale_price !== undefined) {
            updateData.sale_price = updates.sale_price;
        }
        if (updates.property_address !== undefined) {
            updateData.property_address = updates.property_address;
        }
        if (updates.expected_close_date !== undefined) {
            updateData.expected_close_date = updates.expected_close_date;
        }
        if (updates.actual_close_date !== undefined) {
            updateData.actual_close_date = updates.actual_close_date;
        }

        // Handle contact confirmation
        if (updates.contact_confirmed === true) {
            updateData.contact_confirmed = true;
            updateData.contact_confirmed_at = new Date().toISOString();
        }

        // Handle stage changes
        let newStage: string | undefined;
        if (updates.stage) {
            newStage = updates.stage;
            updateData.last_stage_change = new Date().toISOString();
        }

        // 3. Update the deal in Attio
        try {
            await attio.updateListEntry(
                'customer_deals',
                validation.deal_id,
                updateData,
                newStage
            );
        } catch (error) {
            console.error('Error updating deal in Attio:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to update deal'
            }, { status: 500 });
        }

        // 4. If stage changed to "Closed Won", send Slack notification
        if (newStage === 'Closed Won') {
            try {
                // Fetch deal and customer info for the notification
                const dealEntries = await attio.queryListEntries('customer_deals', {
                    filter: { entry_id: { $eq: validation.deal_id } },
                    limit: 1
                });

                if (dealEntries.length > 0) {
                    const deal = dealEntries[0];
                    const parentRecordId = deal.parent_record_id || deal.parent?.record_id;
                    let customerInfo = null;
                    if (parentRecordId) {
                        customerInfo = await attio.getRecord('customers', parentRecordId);
                    }

                    // Get agent info
                    const isLender = validation.type === 'lender';
                    const objectType = isLender ? 'lenders' : 'agents';
                    const agentInfo = await attio.getRecord(objectType, validation.agent_id);

                    await slack.sendDealClosed({
                        customerName: customerInfo?.name || 'Unknown Customer',
                        agentName: agentInfo?.name || 'Unknown Agent',
                        salePrice: updates.sale_price,
                        dealType: deal.entry_values?.deal_type?.[0]?.value || 'Buying',
                    });
                }
            } catch (notificationError) {
                // Log but don't fail the request
                console.error('Error sending Closed Won notification:', notificationError);
            }
        }

        console.log(`Deal ${validation.deal_id} updated successfully by ${validation.type} ${validation.agent_id}`);

        return NextResponse.json({
            success: true
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Magic link update error:', errorMessage);
        return NextResponse.json({
            success: false,
            error: 'An error occurred while updating the deal'
        }, { status: 500 });
    }
}
