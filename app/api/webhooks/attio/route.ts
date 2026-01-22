import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { attio } from "@/lib/attio";
import crypto from "crypto";

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
  event_type: "record.created" | "record.updated" | "record.deleted";
  id: {
    workspace_id: string;
    object_id: string;
    record_id: string;
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

    // Only handle record events
    if (!event_type.startsWith("record.")) {
      debugLog("Skipping event: not a record event");
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
        // Lender updated → find states where lender is assigned via State.lenders multi-ref
        // Attio doesn't support reverse queries on multi-ref fields (no $contains operator)
        // Fetch all 52 states in one API call, then filter server-side to find assignments
        debugLog("Fetching all states to find lender assignments");
        const allStates = await attio.queryRecords("states", { limit: 100 });
        debugLog("Fetched states", { count: allStates.length });

        for (const state of allStates) {
          // lenders field can be a single ID string or array of IDs
          const lenderIds = state.lenders;
          const hasLender = Array.isArray(lenderIds)
            ? lenderIds.includes(recordId)
            : lenderIds === recordId;

          if (hasLender && state.state_slug) {
            paths.push(`/${state.state_slug}`);
          }
        }
        debugLog("Found states with lender", { count: paths.length });
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
