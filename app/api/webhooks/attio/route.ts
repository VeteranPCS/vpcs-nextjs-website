import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { attio } from "@/lib/attio";
import { sendEmail } from "@/lib/email";
import { calculateBonus } from "@/lib/bonus-calculator";
import crypto from "crypto";
import React from "react";

const ATTIO_WEBHOOK_SECRET = process.env.ATTIO_WEBHOOK_SECRET;

// Your Attio workspace ID - webhooks from other workspaces will be rejected
const ALLOWED_WORKSPACE_ID = process.env.ATTIO_WORKSPACE_ID;

// Enable debug logging in preview/development environments
const IS_PRODUCTION = process.env.VERCEL_ENV === "production";
const DEBUG = !IS_PRODUCTION;

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log("[attio-webhook]", ...args);
  }
}

// Maximum payload size (100KB should be more than enough for webhook events)
const MAX_PAYLOAD_SIZE = 100 * 1024;

// Maximum number of events to process per webhook (prevents DoS)
const MAX_EVENTS_PER_WEBHOOK = 50;

// Only these object types trigger revalidation
const ALLOWED_OBJECT_SLUGS = new Set([
  "agents",
  "lenders",
  "areas",
  "area_assignments",
]);

interface AttioWebhookEvent {
  event_type:
    | "record.created"
    | "record.updated"
    | "record.deleted"
    | "list-entry.created"
    | "list-entry.updated";
  id: {
    workspace_id: string;
    object_id: string;
    record_id: string;
    list_id?: string;
    entry_id?: string;
    attribute_id?: string;
  };
  actor: {
    type: string;
    id: string;
  };
}

interface AttioWebhookPayload {
  webhook_id: string;
  events: AttioWebhookEvent[];
}

// Map Attio object UUIDs to their slugs
// These are specific to your workspace - update if objects are recreated
const OBJECT_ID_TO_SLUG: Record<string, string> = {
  // TODO: Add your object IDs here after first successful webhook
  // Format: "object-uuid": "object-slug"
};

// Map Attio list UUIDs to their slugs (populated dynamically on first webhook)
const LIST_ID_TO_SLUG: Record<string, string> = {};

// Stage-change email configuration: which list + stage combos trigger emails
interface StageEmailConfig {
  emailLabel: string;
  subject: (name: string) => string;
  parentObject: string;
}

const STAGE_EMAIL_MAP: Record<string, Record<string, StageEmailConfig>> = {
  customer_deals: {
    "Under Contract": {
      emailLabel: "C4: Under Contract",
      subject: (name) => `Congratulations ${name} - You're Under Contract!`,
      parentObject: "customers",
    },
    "Paid Complete": {
      emailLabel: "C5: Transaction Closed / Paid Complete",
      subject: (name) =>
        `Welcome Home, ${name}! Your VeteranPCS Move-In Bonus Details`,
      parentObject: "customers",
    },
  },
  agent_onboarding: {
    "Contract Sent": {
      emailLabel: "A4: Agent Contract Ready",
      subject: (name) => `Your VeteranPCS Contract is Ready, ${name}`,
      parentObject: "agents",
    },
    "Live on Website": {
      emailLabel: "A5: Agent Live on Website",
      subject: (name) => `You're Live on VeteranPCS, ${name}!`,
      parentObject: "agents",
    },
  },
  lender_onboarding: {
    "Contract Sent": {
      emailLabel: "L4: Lender Contract Ready",
      subject: (name) => `Your VeteranPCS Contract is Ready, ${name}`,
      parentObject: "lenders",
    },
    "Live on Website": {
      emailLabel: "L5: Lender Live on Website",
      subject: (name) => `You're Live on VeteranPCS, ${name}!`,
      parentObject: "lenders",
    },
  },
};

interface WebhookResponse {
  success: boolean;
  error?: string;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify Attio webhook signature using timing-safe comparison
 * @see https://docs.attio.com/rest-api/guides/webhooks
 */
function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  return timingSafeCompare(signature, expectedSig);
}

/**
 * POST /api/webhooks/attio
 *
 * Handles Attio webhook events for cache revalidation.
 * When agents, lenders, areas, or area_assignments are updated,
 * this webhook revalidates the affected state/area pages.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  debugLog("Received webhook request", {
    env: process.env.VERCEL_ENV,
    url: request.url,
  });

  try {
    // 1. Require webhook secret in production
    if (!ATTIO_WEBHOOK_SECRET) {
      debugLog("ERROR: Webhook secret not configured");
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 503 },
      );
    }

    // 2. Check content-length to prevent large payload attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      debugLog("ERROR: Payload too large", { contentLength });
      return NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 },
      );
    }

    // 3. Verify signature before processing
    const signature =
      request.headers.get("attio-signature") ||
      request.headers.get("x-attio-signature");
    const body = await request.text();

    debugLog("Verifying signature", {
      hasSignature: !!signature,
      bodyLength: body.length,
    });

    // Double-check body size after reading (content-length can be spoofed)
    if (body.length > MAX_PAYLOAD_SIZE) {
      debugLog("ERROR: Body too large after reading");
      return NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 },
      );
    }

    if (!verifySignature(body, signature, ATTIO_WEBHOOK_SECRET)) {
      debugLog("ERROR: Invalid signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 },
      );
    }

    debugLog("Signature verified successfully");

    // 4. Parse and validate payload structure
    let payload: AttioWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      debugLog("ERROR: Invalid JSON in body");
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    // 5. Validate payload has expected structure
    if (!payload.events || !Array.isArray(payload.events)) {
      debugLog("ERROR: Invalid payload structure", { payload });
      return NextResponse.json(
        { success: false, error: "Invalid payload structure" },
        { status: 400 },
      );
    }

    debugLog("Payload parsed", {
      webhookId: payload.webhook_id,
      eventCount: payload.events.length,
    });

    // 6. Limit number of events to prevent DoS
    if (payload.events.length > MAX_EVENTS_PER_WEBHOOK) {
      payload.events = payload.events.slice(0, MAX_EVENTS_PER_WEBHOOK);
    }

    return await handleWebhookPayload(payload);
  } catch (error) {
    debugLog("ERROR: Unhandled exception", { error });
    // Don't leak error details to client
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}

async function handleWebhookPayload(
  payload: AttioWebhookPayload,
): Promise<NextResponse<WebhookResponse>> {
  const { events } = payload;
  const allRevalidatedPaths: string[] = [];

  for (const event of events) {
    const { event_type, id } = event;

    debugLog("Processing event", { event_type, id });

    // Validate event structure
    if (!event_type || !id || typeof id !== "object") {
      debugLog("Skipping event: invalid structure");
      continue;
    }

    // Handle list-entry events (stage-change emails)
    if (event_type.startsWith("list-entry.")) {
      handleListEntryEvent(event).catch((err) => {
        debugLog("Error handling list entry event (non-fatal)", { err });
      });
      continue;
    }

    // Only handle record events for cache revalidation
    if (!event_type.startsWith("record.")) {
      debugLog("Skipping event: not a record or list-entry event");
      continue;
    }

    const { workspace_id, object_id, record_id } = id;

    // Validate workspace ID if configured (prevents cross-workspace attacks)
    if (ALLOWED_WORKSPACE_ID && workspace_id !== ALLOWED_WORKSPACE_ID) {
      debugLog("Skipping event: workspace mismatch", {
        expected: ALLOWED_WORKSPACE_ID,
        received: workspace_id,
      });
      continue;
    }

    // Validate IDs are present and look like UUIDs (basic format check)
    if (!isValidUUID(object_id) || !isValidUUID(record_id)) {
      debugLog("Skipping event: invalid UUID format", { object_id, record_id });
      continue;
    }

    // Look up the object slug from UUID (or fetch it if not cached)
    let objectSlug = OBJECT_ID_TO_SLUG[object_id];
    debugLog("Object slug lookup", { object_id, cachedSlug: objectSlug });

    if (!objectSlug) {
      try {
        debugLog("Fetching object info from Attio API", { object_id });
        const objectInfo = await attio.getObject(object_id);
        objectSlug = objectInfo?.api_slug;
        debugLog("Fetched object slug", { objectSlug });
      } catch (error) {
        debugLog("Failed to fetch object info", { error });
        continue;
      }
    }

    // Only process allowed object types (defense in depth)
    if (!objectSlug || !ALLOWED_OBJECT_SLUGS.has(objectSlug)) {
      debugLog("Skipping event: object type not allowed", { objectSlug });
      continue;
    }

    debugLog("Finding paths to revalidate", { objectSlug, record_id });
    const revalidatedPaths = await revalidateAffectedPaths(
      objectSlug,
      record_id,
    );
    debugLog("Paths found", { revalidatedPaths });
    allRevalidatedPaths.push(...revalidatedPaths);
  }

  const uniquePaths = [...new Set(allRevalidatedPaths)];
  debugLog("Total unique paths to revalidate", {
    count: uniquePaths.length,
    paths: uniquePaths,
  });

  // Revalidate but don't expose which paths were affected
  for (const path of uniquePaths) {
    try {
      debugLog("Calling revalidatePath", { path });
      revalidatePath(path);
      debugLog("revalidatePath completed", { path });
    } catch (error) {
      debugLog("revalidatePath failed", { path, error });
    }
  }

  debugLog("Webhook processing complete", {
    revalidatedCount: uniquePaths.length,
  });
  return NextResponse.json({ success: true });
}

/**
 * Basic UUID format validation (v4 UUID)
 */
function isValidUUID(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

/**
 * Determine which paths need revalidation based on the updated object
 */
async function revalidateAffectedPaths(
  objectType: string,
  recordId: string,
): Promise<string[]> {
  const paths: string[] = [];

  debugLog("revalidateAffectedPaths called", { objectType, recordId });

  try {
    switch (objectType) {
      case "agents":
        // Agent updated → find states where agent is assigned
        // Strategy: Query assignments, then parallel fetch areas, then parallel fetch states
        debugLog("Querying area_assignments for agent");
        const agentAssignments = await attio.queryRecords("area_assignments", {
          filter: { agent: { target_record_id: { $eq: recordId } } },
          limit: 100,
        });
        debugLog("Found agent assignments", { count: agentAssignments.length });

        if (agentAssignments.length > 0) {
          // Extract unique area IDs
          const areaIdSet = new Set<string>();
          for (const assignment of agentAssignments) {
            const a = assignment as { area?: string };
            if (a.area) areaIdSet.add(a.area);
          }
          const areaIds = Array.from(areaIdSet);
          debugLog("Unique area IDs", { count: areaIds.length });

          if (areaIds.length > 0) {
            // Parallel fetch all areas by ID (Attio doesn't support $in filter on id field)
            const areaResults = await Promise.all(
              areaIds.map((areaId) =>
                attio.getRecord("areas", areaId).catch(() => null),
              ),
            );
            const areas = areaResults.filter(
              (a): a is { state?: string } => a !== null,
            );
            debugLog("Fetched areas", { count: areas.length });

            // Extract unique state IDs
            const stateIdSet = new Set<string>();
            for (const area of areas) {
              if (area.state) stateIdSet.add(area.state);
            }
            const stateIds = Array.from(stateIdSet);
            debugLog("Unique state IDs", { count: stateIds.length });

            if (stateIds.length > 0) {
              // Parallel fetch all states by ID
              const stateResults = await Promise.all(
                stateIds.map((stateId) =>
                  attio.getRecord("states", stateId).catch(() => null),
                ),
              );
              const states = stateResults.filter(
                (s): s is { state_slug?: string } => s !== null,
              );
              debugLog("Fetched states", { count: states.length });

              for (const state of states) {
                if (state.state_slug) {
                  paths.push(`/${state.state_slug}`);
                }
              }
            }
          }
        }
        break;

      case "lenders":
        // Lender updated → get states directly from lender.states reverse reference
        // (Similar to how agents work via area_assignments)
        debugLog("Fetching lender record to get assigned states");
        const lender = await attio.getRecord("lenders", recordId);
        debugLog("Lender record", {
          id: lender?.id,
          hasStates: !!lender?.states,
        });

        if (lender?.states) {
          // states field can be a single ID string or array of IDs
          const stateIds = Array.isArray(lender.states)
            ? lender.states
            : [lender.states];
          debugLog("Lender state IDs", { count: stateIds.length });

          if (stateIds.length > 0) {
            // Parallel fetch all states by ID
            const stateResults = await Promise.all(
              stateIds.map((stateId: string) =>
                attio.getRecord("states", stateId).catch(() => null),
              ),
            );
            const lenderStates = stateResults.filter(
              (s): s is { state_slug?: string } => s !== null,
            );
            debugLog("Fetched lender states", { count: lenderStates.length });

            for (const state of lenderStates) {
              if (state.state_slug) {
                paths.push(`/${state.state_slug}`);
              }
            }
          }
        }
        debugLog("Found states for lender", { count: paths.length });
        break;

      case "areas":
        // Area updated → revalidate state page
        debugLog("Getting state path for area");
        const areaStatePath = await getStatePathForArea(recordId);
        if (areaStatePath) paths.push(areaStatePath);
        break;

      case "area_assignments":
        // Area assignment updated → revalidate area's state page
        debugLog("Getting area_assignment record");
        const assignment = await attio.getRecord("area_assignments", recordId);
        debugLog("Area assignment", { assignment });
        if (assignment?.area) {
          const assignmentStatePath = await getStatePathForArea(
            assignment.area,
          );
          if (assignmentStatePath) paths.push(assignmentStatePath);
        }
        break;

      default:
        debugLog("Unknown object type, no paths to revalidate");
    }
  } catch (error) {
    debugLog("Error in revalidateAffectedPaths", { error });
  }

  debugLog("revalidateAffectedPaths result", { paths });
  return [...new Set(paths)];
}

/**
 * Get the state page path for a given area ID
 */
async function getStatePathForArea(areaId: string): Promise<string | null> {
  debugLog("getStatePathForArea called", { areaId });

  try {
    const area = await attio.getRecord("areas", areaId);
    debugLog("Area record", {
      area: area ? { name: area.name, state: area.state } : null,
    });
    if (!area) return null;

    const stateId = area.state;
    if (!stateId) {
      debugLog("No state ID on area");
      return null;
    }

    const state = await attio.getRecord("states", stateId);
    debugLog("State record", {
      state: state ? { state_slug: state.state_slug } : null,
    });
    if (!state?.state_slug) return null;

    const path = `/${state.state_slug}`;
    debugLog("getStatePathForArea result", { path });
    return path;
  } catch (error) {
    debugLog("Error in getStatePathForArea", { error });
    return null;
  }
}

// ==========================================================================
// LIST ENTRY EVENT HANDLING (stage-change emails via Resend)
// ==========================================================================

/**
 * Resolve a list UUID to its slug, using cache or Attio API.
 */
async function resolveListSlug(listId: string): Promise<string | null> {
  if (LIST_ID_TO_SLUG[listId]) {
    return LIST_ID_TO_SLUG[listId];
  }

  try {
    const listInfo = await attio.getList(listId);
    if (listInfo?.api_slug) {
      LIST_ID_TO_SLUG[listId] = listInfo.api_slug;
      return listInfo.api_slug;
    }
  } catch (error) {
    debugLog("Failed to fetch list info", { listId, error });
  }

  return null;
}

/**
 * Handle list-entry.created and list-entry.updated events.
 * Fetches the entry, checks the current stage, and sends the appropriate
 * stage-change email via Resend if it hasn't already been sent.
 */
async function handleListEntryEvent(event: AttioWebhookEvent): Promise<void> {
  const { event_type, id } = event;
  const { list_id, entry_id, workspace_id } = id;

  debugLog("handleListEntryEvent", { event_type, list_id, entry_id });

  // Validate workspace
  if (ALLOWED_WORKSPACE_ID && workspace_id !== ALLOWED_WORKSPACE_ID) {
    debugLog("Skipping list entry event: workspace mismatch");
    return;
  }

  if (!list_id || !entry_id) {
    debugLog("Skipping list entry event: missing list_id or entry_id");
    return;
  }

  // 1. Resolve list slug
  const listSlug = await resolveListSlug(list_id);
  if (!listSlug) {
    debugLog("Skipping list entry event: could not resolve list slug", {
      list_id,
    });
    return;
  }

  debugLog("Resolved list slug", { listSlug });

  // 2. Check if this list has any email-triggering stages
  const stageMap = STAGE_EMAIL_MAP[listSlug];
  if (!stageMap) {
    debugLog("Skipping list entry event: no email config for list", {
      listSlug,
    });
    return;
  }

  // 3. Fetch the list entry to get current stage
  let entry: Record<string, any>;
  try {
    entry = await attio.getListEntry(listSlug, entry_id);
  } catch (error) {
    debugLog("Failed to fetch list entry", { listSlug, entry_id, error });
    return;
  }

  debugLog("Fetched list entry", {
    entry_id: entry.entry_id,
    parent_record_id: entry.parent_record_id,
    stage: entry.stage,
  });

  // 4. Get current stage
  const currentStage = entry.stage;
  if (!currentStage || typeof currentStage !== "string") {
    debugLog("Skipping: no stage on entry");
    return;
  }

  // 5. Check if this stage triggers an email
  const emailConfig = stageMap[currentStage];
  if (!emailConfig) {
    debugLog("No email configured for this stage", { listSlug, currentStage });
    return;
  }

  // 6. Check stage_email_sent to prevent duplicate emails
  const stageEmailSent: string = entry.stage_email_sent || "";
  if (stageEmailSent.includes(currentStage)) {
    debugLog("Email already sent for this stage, skipping", {
      currentStage,
      stageEmailSent,
    });
    return;
  }

  // 7. Fetch parent record to get recipient details
  const parentRecordId = entry.parent_record_id;
  if (!parentRecordId) {
    debugLog("Skipping: no parent_record_id on entry");
    return;
  }

  let parentRecord: Record<string, any>;
  try {
    parentRecord = await attio.getRecord(
      emailConfig.parentObject,
      parentRecordId,
    );
  } catch (error) {
    debugLog("Failed to fetch parent record", {
      objectSlug: emailConfig.parentObject,
      parentRecordId,
      error,
    });
    return;
  }

  const recipientEmail = parentRecord.email;
  const firstName = parentRecord.first_name || "there";
  const lastName = parentRecord.last_name || "";

  if (!recipientEmail) {
    debugLog("Skipping: no email on parent record", { parentRecordId });
    return;
  }

  debugLog("Sending stage email", {
    to: recipientEmail,
    label: emailConfig.emailLabel,
    stage: currentStage,
  });

  // 8. Build and send the email
  try {
    const emailElement = await buildStageEmail(
      listSlug,
      currentStage,
      entry,
      parentRecord,
    );
    if (!emailElement) {
      debugLog("No email template returned for stage", {
        listSlug,
        currentStage,
      });
      return;
    }

    await sendEmail({
      to: recipientEmail,
      subject: emailConfig.subject(firstName),
      react: emailElement,
      attioNote: {
        objectSlug: emailConfig.parentObject,
        recordId: parentRecordId,
        emailLabel: emailConfig.emailLabel,
      },
    });

    debugLog("Stage email sent successfully", {
      label: emailConfig.emailLabel,
      to: recipientEmail,
    });

    // 9. Mark stage as email-sent to prevent duplicates
    const updatedSent = stageEmailSent
      ? `${stageEmailSent},${currentStage}`
      : currentStage;

    attio
      .updateListEntry(listSlug, entry_id, {
        stage_email_sent: updatedSent,
      })
      .catch((err: unknown) => {
        debugLog("Failed to update stage_email_sent (non-fatal)", { err });
      });
  } catch (error) {
    debugLog("Failed to send stage email", {
      label: emailConfig.emailLabel,
      error,
    });
  }
}

/**
 * Build the React email element for a given list + stage combination.
 * Uses dynamic imports to keep the handler lean.
 */
async function buildStageEmail(
  listSlug: string,
  stage: string,
  entry: Record<string, any>,
  parentRecord: Record<string, any>,
): Promise<React.ReactElement | null> {
  const firstName = parentRecord.first_name || "there";
  const lastName = parentRecord.last_name || "";

  switch (listSlug) {
    case "customer_deals": {
      if (stage === "Under Contract") {
        // Fetch agent info if available on the deal entry
        let agentFirstName: string | undefined;
        let agentLastName: string | undefined;
        if (entry.agent) {
          try {
            const agent = await attio.getRecord("agents", entry.agent);
            agentFirstName = agent?.first_name;
            agentLastName = agent?.last_name;
          } catch {
            debugLog("Could not fetch deal agent for Under Contract email");
          }
        }

        const { default: UnderContract } = await import(
          "@/emails/templates/customer/UnderContract"
        );
        return React.createElement(UnderContract, {
          customerFirstName: firstName,
          agentFirstName: agentFirstName || "Your Agent",
          agentLastName: agentLastName || "",
        });
      }

      if (stage === "Paid Complete") {
        // Calculate bonus from sale price (handle number or currency object)
        const rawPrice = entry.sale_price;
        const salePrice =
          typeof rawPrice === "number" ? rawPrice
          : typeof rawPrice?.currency_value === "number" ? rawPrice.currency_value
          : 0;
        const { bonus, charity } = calculateBonus(salePrice);

        const { default: TransactionClosed } = await import(
          "@/emails/templates/customer/TransactionClosed"
        );
        return React.createElement(TransactionClosed, {
          customerFirstName: firstName,
          moveInBonus: bonus.toLocaleString(),
          charityAmount: charity.toLocaleString(),
        });
      }
      break;
    }

    case "agent_onboarding": {
      if (stage === "Contract Sent") {
        const { default: ContractReady } = await import(
          "@/emails/templates/agent/ContractReady"
        );
        return React.createElement(ContractReady, {
          firstName,
        });
      }

      if (stage === "Live on Website") {
        const { default: LiveOnWebsite } = await import(
          "@/emails/templates/agent/LiveOnWebsite"
        );
        return React.createElement(LiveOnWebsite, {
          firstName,
        });
      }
      break;
    }

    case "lender_onboarding": {
      if (stage === "Contract Sent") {
        const { default: ContractReady } = await import(
          "@/emails/templates/lender/ContractReady"
        );
        return React.createElement(ContractReady, {
          firstName,
        });
      }

      if (stage === "Live on Website") {
        const { default: LiveOnWebsite } = await import(
          "@/emails/templates/lender/LiveOnWebsite"
        );
        return React.createElement(LiveOnWebsite, {
          firstName,
        });
      }
      break;
    }
  }

  return null;
}
