import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { attio } from "@/lib/attio";
import crypto from "crypto";

const ATTIO_WEBHOOK_SECRET = process.env.ATTIO_WEBHOOK_SECRET;

// Your Attio workspace ID - webhooks from other workspaces will be rejected
const ALLOWED_WORKSPACE_ID = process.env.ATTIO_WORKSPACE_ID;

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
  try {
    // 1. Require webhook secret in production
    if (!ATTIO_WEBHOOK_SECRET) {
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 503 },
      );
    }

    // 2. Check content-length to prevent large payload attacks
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
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

    // Double-check body size after reading (content-length can be spoofed)
    if (body.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 },
      );
    }

    if (!verifySignature(body, signature, ATTIO_WEBHOOK_SECRET)) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 },
      );
    }

    // 4. Parse and validate payload structure
    let payload: AttioWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    // 5. Validate payload has expected structure
    if (!payload.events || !Array.isArray(payload.events)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload structure" },
        { status: 400 },
      );
    }

    // 6. Limit number of events to prevent DoS
    if (payload.events.length > MAX_EVENTS_PER_WEBHOOK) {
      payload.events = payload.events.slice(0, MAX_EVENTS_PER_WEBHOOK);
    }

    return await handleWebhookPayload(payload);
  } catch {
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

    // Validate event structure
    if (!event_type || !id || typeof id !== "object") {
      continue;
    }

    // Only handle record events
    if (!event_type.startsWith("record.")) {
      continue;
    }

    const { workspace_id, object_id, record_id } = id;

    // Validate workspace ID if configured (prevents cross-workspace attacks)
    if (ALLOWED_WORKSPACE_ID && workspace_id !== ALLOWED_WORKSPACE_ID) {
      continue;
    }

    // Validate IDs are present and look like UUIDs (basic format check)
    if (!isValidUUID(object_id) || !isValidUUID(record_id)) {
      continue;
    }

    // Look up the object slug from UUID (or fetch it if not cached)
    let objectSlug = OBJECT_ID_TO_SLUG[object_id];
    if (!objectSlug) {
      try {
        const objectInfo = await attio.getObject(object_id);
        objectSlug = objectInfo?.api_slug;
      } catch {
        // Object lookup failed, skip this event
        continue;
      }
    }

    // Only process allowed object types (defense in depth)
    if (!objectSlug || !ALLOWED_OBJECT_SLUGS.has(objectSlug)) {
      continue;
    }

    const revalidatedPaths = await revalidateAffectedPaths(
      objectSlug,
      record_id,
    );
    allRevalidatedPaths.push(...revalidatedPaths);
  }

  const uniquePaths = [...new Set(allRevalidatedPaths)];

  // Revalidate but don't expose which paths were affected
  for (const path of uniquePaths) {
    try {
      revalidatePath(path);
    } catch {
      // Revalidation failed for this path
    }
  }

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

  try {
    switch (objectType) {
      case "agents":
        // Agent updated → revalidate all state/area pages where agent is assigned
        const agentAssignments = await attio.queryRecords("area_assignments", {
          filter: { agent: { target_record_id: { $eq: recordId } } },
        });

        for (const assignment of agentAssignments) {
          const areaId = assignment.area;
          if (areaId) {
            const areaPaths = await getPathsForArea(areaId);
            paths.push(...areaPaths);
          }
        }
        break;

      case "lenders":
        // Lender updated → revalidate all state pages where lender is assigned
        const allStates = await attio.queryRecords("states", { limit: 100 });
        for (const state of allStates) {
          const lenders = state.lenders;
          if (Array.isArray(lenders) && lenders.includes(recordId)) {
            if (state.state_slug) {
              paths.push(`/${state.state_slug}`);
            }
          }
        }
        break;

      case "areas":
        // Area updated → revalidate state page and area page
        const areaPaths = await getPathsForArea(recordId);
        paths.push(...areaPaths);
        break;

      case "area_assignments":
        // Area assignment updated → revalidate area's state and area pages
        const assignment = await attio.getRecord("area_assignments", recordId);
        if (assignment?.area) {
          const assignmentAreaPaths = await getPathsForArea(assignment.area);
          paths.push(...assignmentAreaPaths);
        }
        break;
    }
  } catch {
    // Error determining paths, return empty
  }

  return [...new Set(paths)];
}

/**
 * Get the state and area page paths for a given area ID
 */
async function getPathsForArea(areaId: string): Promise<string[]> {
  const paths: string[] = [];

  try {
    const area = await attio.getRecord("areas", areaId);
    if (!area) return paths;

    const stateId = area.state;
    if (!stateId) return paths;

    const state = await attio.getRecord("states", stateId);
    if (!state?.state_slug) return paths;

    // State page: /texas
    paths.push(`/${state.state_slug}`);

    // Area page: /texas/san-antonio
    if (area.name) {
      const areaSlug = slugify(area.name);
      paths.push(`/${state.state_slug}/${areaSlug}`);
    }
  } catch {
    // Error fetching area/state data
  }

  return paths;
}

/**
 * Create URL-safe slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
