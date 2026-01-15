import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { attio } from '@/lib/attio';
import crypto from 'crypto';

const ATTIO_WEBHOOK_SECRET = process.env.ATTIO_WEBHOOK_SECRET;

interface AttioWebhookPayload {
    event_type: 'record.created' | 'record.updated' | 'record.deleted';
    object: {
        api_slug: string;
    };
    record: {
        id: {
            record_id: string;
        };
    };
}

interface WebhookResponse {
    success: boolean;
    revalidated?: string[];
    error?: string;
}

/**
 * POST /api/webhooks/attio
 *
 * Handles Attio webhook events for cache revalidation.
 * When agents, lenders, areas, or area_assignments are updated,
 * this webhook revalidates the affected state/area pages.
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
    try {
        // 1. Verify webhook signature
        if (ATTIO_WEBHOOK_SECRET) {
            const signature = request.headers.get('x-attio-signature');
            const body = await request.text();

            const expectedSig = crypto
                .createHmac('sha256', ATTIO_WEBHOOK_SECRET)
                .update(body)
                .digest('hex');

            if (signature !== expectedSig) {
                console.error('Invalid Attio webhook signature');
                return NextResponse.json({
                    success: false,
                    error: 'Invalid signature'
                }, { status: 401 });
            }

            // Re-parse the body since we consumed it for signature verification
            const payload: AttioWebhookPayload = JSON.parse(body);
            return await handleWebhookPayload(payload);
        } else {
            // No secret configured, just parse the body directly
            const payload: AttioWebhookPayload = await request.json();
            return await handleWebhookPayload(payload);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Attio webhook error:', errorMessage);
        return NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: 500 });
    }
}

async function handleWebhookPayload(payload: AttioWebhookPayload): Promise<NextResponse<WebhookResponse>> {
    const { event_type, object, record } = payload;

    // Only handle record update events
    if (!event_type.startsWith('record.')) {
        return NextResponse.json({
            success: true,
            revalidated: []
        });
    }

    const objectType = object.api_slug;
    const recordId = record.id.record_id;

    console.log(`Processing Attio webhook: ${event_type} on ${objectType}/${recordId}`);

    // Revalidate affected paths based on object type
    const revalidatedPaths = await revalidateAffectedPaths(objectType, recordId);

    console.log(`Revalidated ${revalidatedPaths.length} paths:`, revalidatedPaths);

    return NextResponse.json({
        success: true,
        revalidated: revalidatedPaths
    });
}

/**
 * Determine which paths need revalidation based on the updated object
 */
async function revalidateAffectedPaths(objectType: string, recordId: string): Promise<string[]> {
    const paths: string[] = [];

    try {
        switch (objectType) {
            case 'agents':
                // Agent updated → revalidate all state/area pages where agent is assigned
                const agentAssignments = await attio.queryRecords('area_assignments', {
                    filter: { agent: { target_record_id: { $eq: recordId } } }
                });

                for (const assignment of agentAssignments) {
                    const areaId = assignment.area;
                    if (areaId) {
                        const areaPaths = await getPathsForArea(areaId);
                        paths.push(...areaPaths);
                    }
                }
                break;

            case 'lenders':
                // Lender updated → revalidate all state pages where lender is assigned
                const allStates = await attio.queryRecords('states', { limit: 100 });
                for (const state of allStates) {
                    const lenders = state.lenders;
                    if (Array.isArray(lenders) && lenders.includes(recordId)) {
                        if (state.state_slug) {
                            paths.push(`/${state.state_slug}`);
                        }
                    }
                }
                break;

            case 'areas':
                // Area updated → revalidate state page and area page
                const areaPaths = await getPathsForArea(recordId);
                paths.push(...areaPaths);
                break;

            case 'area_assignments':
                // Area assignment updated → revalidate area's state and area pages
                const assignment = await attio.getRecord('area_assignments', recordId);
                if (assignment?.area) {
                    const assignmentAreaPaths = await getPathsForArea(assignment.area);
                    paths.push(...assignmentAreaPaths);
                }
                break;
        }
    } catch (error) {
        console.error(`Error determining paths for ${objectType}/${recordId}:`, error);
    }

    // Deduplicate paths
    const uniquePaths = [...new Set(paths)];

    // Revalidate each path
    for (const path of uniquePaths) {
        try {
            revalidatePath(path);
            console.log(`Revalidated: ${path}`);
        } catch (revalError) {
            console.error(`Failed to revalidate ${path}:`, revalError);
        }
    }

    return uniquePaths;
}

/**
 * Get the state and area page paths for a given area ID
 */
async function getPathsForArea(areaId: string): Promise<string[]> {
    const paths: string[] = [];

    try {
        const area = await attio.getRecord('areas', areaId);
        if (!area) return paths;

        const stateId = area.state;
        if (!stateId) return paths;

        const state = await attio.getRecord('states', stateId);
        if (!state?.state_slug) return paths;

        // State page: /texas
        paths.push(`/${state.state_slug}`);

        // Area page: /texas/san-antonio
        if (area.name) {
            const areaSlug = slugify(area.name);
            paths.push(`/${state.state_slug}/${areaSlug}`);
        }
    } catch (error) {
        console.error(`Error getting paths for area ${areaId}:`, error);
    }

    return paths;
}

/**
 * Create URL-safe slug from text
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
