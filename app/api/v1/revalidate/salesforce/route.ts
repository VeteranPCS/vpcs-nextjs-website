import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import agentService from "@/services/agentService";
import { revalidatePath } from "next/cache";
import fixtures from '@/config/salesforce/webdev-fixtures.json';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import { isWebdevPartnerFixture } from '@/lib/salesforce/webdev-fixtures';
import { isProductionSalesforceRuntime, isProtectedSalesforceWebdevPreview } from '@/lib/salesforce/environment.mjs';

// Verify the shared secret the Salesforce webhook sends in X-Salesforce-Signature.
// NOTE: this is still a shared-secret compare, not a true request signature. Full
// HMAC request signing is BLOCKED on the Salesforce sender being changed to HMAC
// the payload (external dependency) — tracked as a follow-up. What we CAN harden
// now is the compare itself: use crypto.timingSafeEqual so an attacker can't use
// response-timing to recover the secret byte by byte.
function verifySalesforceSignature(req: NextRequest): boolean {
    const salesforceSignature = req.headers.get("X-Salesforce-Signature");
    const productionSecret = process.env.SALESFORCE_WEBHOOK_SECRET;
    const webdevSecret = process.env.VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET;
    const expectedSecret = isProductionSalesforceRuntime()
        ? productionSecret
        : process.env.VPCS_SALESFORCE_PROFILE === 'webdev' && isProtectedSalesforceWebdevPreview() && webdevSecret !== productionSecret
            ? webdevSecret : undefined;

    if (!salesforceSignature || !expectedSecret) {
        return false;
    }

    const provided = Buffer.from(salesforceSignature);
    const expected = Buffer.from(expectedSecret);

    // timingSafeEqual throws on unequal-length buffers, so guard length first.
    // A length mismatch is already a non-match, so returning false here leaks
    // only the length, not the contents.
    if (provided.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(provided, expected);
}

function getWebdevCallbackRun(req: NextRequest): string | undefined {
    if (req.nextUrl.origin !== 'https://test.veteranpcs.com') return;
    const [runId, start, end, ...extra] = (process.env.VPCS_WEBDEV_SALESFORCE_WEBHOOK_WINDOW ?? '').split(':');
    if (extra.length || !runId || !/^[A-Za-z0-9_-]{1,64}$/.test(runId) ||
        !start || !end || !/^\d{13}$/.test(start) || !/^\d{13}$/.test(end)) return;
    const startMs = Number(start);
    const endMs = Number(end);
    const now = Date.now();
    if (now < startMs || now >= endMs || endMs - startMs > 30 * 60 * 1000) return;
    if (runId !== req.headers.get('X-VPCS-Callback-Run')) return;
    return runId;
}

function convertStateNameToPathName(state: string): string {
    return `/${state.toLowerCase().replace(/\s+/g, "-")}`;
}

export async function POST(req: NextRequest) {
    try {
        if (!verifySalesforceSignature(req)) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
        }

        const production = isProductionSalesforceRuntime();
        const webdevRun = production ? undefined : getWebdevCallbackRun(req);
        if (!production && !webdevRun) return new Response('Unauthorized', { status: 401 });

        // Extract accountId
        const { accountId } = await req.json();

        if (!accountId) {
            return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400 });
        }

        if (webdevRun) {
            const expectedId = fixtures.accountIds.agents[0]?.slice(0, 15);
            const salesforce = getSalesforceConfig();
            if (typeof accountId !== 'string' || accountId !== expectedId ||
                salesforce.deliveryMode !== 'capture' || salesforce.allowSandboxWrites ||
                !isWebdevPartnerFixture(salesforce, 'agents', accountId)) {
                return new Response('Unauthorized', { status: 401 });
            }
        }

        console.log("Salesforce Webhook Received:", accountId);

        const agentStates = await agentService.getAgentState(accountId);

        if (!agentStates || agentStates.length === 0) {
            return new Response(JSON.stringify({ message: "No states found" }), { status: 404 });
        }

        if (webdevRun && (agentStates.length !== 1 || agentStates[0] !== 'Colorado')) {
            return new Response('Unexpected WebDev fixture state', { status: 409 });
        }

        for (const state of agentStates) {
            const path = convertStateNameToPathName(state);
            revalidatePath(path);
            console.log("Revalidated path:", path);
        }

        if (webdevRun) console.info('Salesforce WebDev callback accepted', { runId: webdevRun, pathCount: agentStates.length });

        // You can process the account updates here (e.g., update a database, trigger other workflows)
        return NextResponse.json({
            status: 200,
            received: true,
            now: Date.now(),
            accountId,
        });

    } catch (err: any) {
        console.error("Salesforce Webhook Error:", err);
        return new Response("Internal Server Error", { status: 500 });
    }
}
