import { type NextRequest, NextResponse } from "next/server";
import agentService from "@/services/agentService";
import { revalidatePath } from "next/cache";

// Utility function to verify Salesforce signature (if using HMAC-based verification)
function verifySalesforceSignature(req: NextRequest): boolean {
    const salesforceSignature = req.headers.get("X-Salesforce-Signature");
    const expectedSecret = process.env.SALESFORCE_WEBHOOK_SECRET;

    if (!salesforceSignature || !expectedSecret) {
        return false;
    }

    // Compare signatures (consider using HMAC validation if Salesforce sends a hash)
    return salesforceSignature === expectedSecret;
}

function convertStateNameToPathName(state: string): string {
    return `/${state.toLowerCase().replace(/\s+/g, "-")}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!verifySalesforceSignature(req)) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
        }

        // Extract accountId
        const { accountId } = body;

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
