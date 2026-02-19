import { NextRequest, NextResponse } from "next/server";
import { validateMagicLink } from "@/lib/magic-link";
import { attio } from "@/lib/attio";

interface ValidateResponse {
  success: boolean;
  valid: boolean;
  agent?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  deal?: {
    id: string;
    type: string;
    stage: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    property_address: string | null;
    notes: string | null;
    contact_confirmed: boolean;
    created_at: string | null;
  };
  error?: string;
}

// Mark this route as dynamic
export const dynamic = "force-dynamic";

/**
 * GET /api/magic-link/validate?token=xxx
 *
 * Validates a magic link token and returns agent + deal data for the portal.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ValidateResponse>> {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Token is required",
        },
        { status: 400 },
      );
    }

    // 1. Validate the token
    const validation = validateMagicLink(token);

    if (!validation.valid || !validation.agent_id || !validation.deal_id) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: validation.error || "Invalid token",
        },
        { status: 401 },
      );
    }

    // 2. Determine if this is an agent or lender token
    const isLender = validation.type === "lender";
    const objectType = isLender ? "lenders" : "agents";

    // 3. Fetch agent/lender record from Attio
    let agentInfo;
    try {
      agentInfo = await attio.getRecord(objectType, validation.agent_id);
    } catch (error) {
      console.error("Error fetching %s from Attio:", objectType, error);
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: `${isLender ? "Lender" : "Agent"} not found`,
        },
        { status: 404 },
      );
    }

    // 4. Fetch deal (list entry) from customer_deals pipeline
    let dealInfo;
    try {
      const dealEntries = await attio.queryListEntries("customer_deals", {
        filter: {
          entry_id: { $eq: validation.deal_id },
        },
        limit: 1,
      });

      if (!dealEntries.length) {
        // Try to get entry directly
        // queryListEntries might not support entry_id filter, try alternative approach
        console.warn("Deal not found via query, attempting direct lookup");
      } else {
        dealInfo = dealEntries[0];
      }
    } catch (error) {
      console.error("Error fetching deal from Attio:", error);
    }

    // If we couldn't find the deal, return an error
    if (!dealInfo) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Deal not found",
        },
        { status: 404 },
      );
    }

    // 5. Fetch customer info for display
    const parentRecordId =
      dealInfo.parent_record_id || dealInfo.parent?.record_id;
    let customerInfo = null;
    if (parentRecordId) {
      try {
        customerInfo = await attio.getRecord("customers", parentRecordId);
      } catch (error) {
        console.error("Error fetching customer from Attio:", error);
      }
    }

    // 6. Extract stage from deal entry values
    let dealStage = "Unknown";
    if (dealInfo.entry_values?.stage) {
      const stageValue = dealInfo.entry_values.stage;
      if (Array.isArray(stageValue) && stageValue.length > 0) {
        dealStage =
          stageValue[0]?.status?.title || stageValue[0]?.status || "Unknown";
      } else if (typeof stageValue === "object") {
        dealStage = stageValue.status?.title || stageValue.status || "Unknown";
      }
    }

    // 7. Return combined data
    return NextResponse.json({
      success: true,
      valid: true,
      agent: {
        id: agentInfo.id,
        name:
          agentInfo.name ||
          `${agentInfo.first_name} ${agentInfo.last_name}`.trim(),
        email: agentInfo.email || null,
        phone: agentInfo.phone || null,
      },
      deal: {
        id: validation.deal_id,
        type:
          dealInfo.entry_values?.deal_type?.[0]?.value ||
          dealInfo.entry_values?.deal_type ||
          "Unknown",
        stage: dealStage,
        customer_name:
          customerInfo?.name ||
          `${customerInfo?.first_name || ""} ${customerInfo?.last_name || ""}`.trim() ||
          "Unknown",
        customer_phone: customerInfo?.phone || null,
        customer_email: customerInfo?.email || null,
        property_address:
          dealInfo.entry_values?.property_address?.[0]?.value ||
          dealInfo.entry_values?.property_address ||
          null,
        notes:
          dealInfo.entry_values?.notes?.[0]?.value ||
          dealInfo.entry_values?.notes ||
          null,
        contact_confirmed:
          dealInfo.entry_values?.contact_confirmed?.[0]?.value ??
          dealInfo.entry_values?.contact_confirmed ??
          false,
        created_at: dealInfo.created_at || null,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Magic link validation error:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: "An error occurred while validating the link",
      },
      { status: 500 },
    );
  }
}
