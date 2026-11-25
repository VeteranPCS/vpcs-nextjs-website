import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import agentService from "@/services/agentService";
import { revalidatePath } from "next/cache";
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

function convertStateNameToPathName(state: string): string {
    return `/${state.toLowerCase().replace(/\s+/g, "-")}`;
}

export async function POST(req: NextRequest) {
    try {
        if (!verifySalesforceSignature(req)) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
        }

        // Extract accountId
        const { accountId } = await req.json();

        if (!accountId) {
            return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400 });
        }

        console.log("Salesforce Webhook Received:", accountId);

        const agentStates = await agentService.getAgentState(accountId);

        if (!agentStates || agentStates.length === 0) {
            return new Response(JSON.stringify({ message: "No states found" }), { status: 404 });
        }

        for (const state of agentStates) {
            const path = convertStateNameToPathName(state);
            revalidatePath(path);
            console.log("Revalidated path:", path);
        }

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
