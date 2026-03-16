// app/api/cron/stale-leads/route.ts
// Stale lead re-routing and deal lifecycle cron job.
// Runs every 2 hours via Vercel cron.
//
// Rule 1: 12-hour re-route — New Leads with no contact confirmation get
//         reassigned to next-highest AA_Score agent in the same area.
// Rule 2: 7-day reminder — SMS reminder to agent for stale open deals.
// Rule 3: 14-day alert — Slack alert to admin for stale deals.
// Rule 4: 45-day auto-close — Deals stuck in one stage get auto-closed.

import { NextRequest, NextResponse } from "next/server";
import { attio } from "@/lib/attio";
import { openphone } from "@/lib/openphone";
import { slack } from "@/lib/slack";
import { generateMagicLink } from "@/lib/magic-link";

const CRON_SECRET = process.env.CRON_SECRET;

// Open (active) stages in the customer_deals pipeline
const OPEN_STAGES = [
  "New Lead",
  "Tracking <1mo",
  "Tracking 1-2mo",
  "Tracking 3-6mo",
  "Tracking 6+mo",
  "Under Contract",
  "Transaction Closed",
];

interface CronStats {
  rerouted: number;
  rerouteSkipped: number;
  reminders7d: number;
  alerts14d: number;
  autoClosed45d: number;
  errors: string[];
}

/**
 * Parse a list entry returned by queryListEntries into a flat object.
 * List entries have a different shape from records: entry_values is a
 * dict of attribute slugs -> value arrays (same value-envelope format
 * as records).
 */
function parseListEntry(entry: any): Record<string, any> {
  const parsed: Record<string, any> = {
    entry_id: entry.id?.entry_id,
    parent_record_id: entry.id?.parent_record_id,
    created_at: entry.created_at,
  };

  const values = entry.entry_values || {};
  for (const [key, valueArray] of Object.entries(values)) {
    const arr = valueArray as any[];
    if (!arr || arr.length === 0) {
      parsed[key] = null;
      continue;
    }
    // Status fields have a nested status object
    if (arr[0].status) {
      parsed[key] = arr[0].status.title || arr[0].status;
    } else if (arr[0].option) {
      parsed[key] = arr[0].option.title;
    } else if (arr[0].target_record_id) {
      parsed[key] = arr.length > 1
        ? arr.map((v: any) => v.target_record_id)
        : arr[0].target_record_id;
    } else if (arr[0].original_phone_number) {
      parsed[key] = arr[0].original_phone_number;
    } else if (arr[0].email_address) {
      parsed[key] = arr[0].email_address;
    } else if (arr[0].value !== undefined) {
      parsed[key] = arr[0].value;
    } else {
      parsed[key] = arr[0];
    }
  }

  return parsed;
}

/**
 * Fetch all open customer_deals entries. The Attio query API for list entries
 * does not support rich date-comparison operators, so we fetch broadly and
 * filter in code.
 */
async function fetchOpenDeals(): Promise<Record<string, any>[]> {
  const entries: Record<string, any>[] = [];
  let offset = 0;
  const PAGE_SIZE = 100;

  // Paginate through all entries
  while (true) {
    const page = await attio.queryListEntries("customer_deals", {
      limit: PAGE_SIZE,
    });

    for (const entry of page) {
      entries.push(parseListEntry(entry));
    }

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;

    // Safety cap to prevent runaway pagination
    if (offset > 5000) break;
  }

  // Filter to open stages only
  return entries.filter((e) => {
    const stage = e.stage;
    return stage && OPEN_STAGES.includes(stage);
  });
}

// ============================================================================
// Rule 1: 12-hour re-route for stale New Leads
// ============================================================================

async function processStaleNewLeads(stats: CronStats): Promise<void> {
  const now = Date.now();
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  const deals = await fetchOpenDeals();
  const newLeads = deals.filter((d) => {
    if (d.stage !== "New Lead") return false;
    if (d.contact_confirmed === true) return false;
    if ((d.reroute_count || 0) >= 1) return false;

    // Check if created more than 12 hours ago
    const createdAt = d.created_at ? new Date(d.created_at).getTime() : 0;
    return now - createdAt > TWELVE_HOURS_MS;
  });

  for (const deal of newLeads) {
    try {
      const currentAgentId = deal.agent;
      const areaId = deal.area;

      if (!areaId) {
        // No area on deal — cannot find replacement agent
        await slack.sendManualAssignmentNeeded({
          customerName: deal.deal_name || "Unknown",
          customerEmail: "",
          reason: "Stale lead has no area assigned — cannot auto-reroute",
        });
        stats.rerouteSkipped++;
        continue;
      }

      // Find area assignments sorted by AA_Score descending
      const areaAssignments = await attio.queryRecords("area_assignments", {
        filter: {
          $and: [
            { area: { target_record_id: { $eq: areaId } } },
            { status: { $eq: "Active" } },
          ],
        },
        sort: [{ attribute: "aa_score", direction: "desc" }],
        limit: 20,
      });

      // Pick the next agent (skip the current one)
      const nextAssignment = areaAssignments.find(
        (aa: any) => aa.agent !== currentAgentId,
      );

      if (!nextAssignment) {
        await slack.sendManualAssignmentNeeded({
          customerName: deal.deal_name || "Unknown",
          customerEmail: "",
          area: areaId,
          reason:
            "No alternative agent available in area for 12-hour re-route",
        });
        stats.rerouteSkipped++;
        continue;
      }

      const newAgentId = nextAssignment.agent;

      // Fetch new agent details
      const newAgent = await attio.getRecord("agents", newAgentId);
      if (!newAgent) {
        stats.rerouteSkipped++;
        continue;
      }

      // Update the deal: reassign agent, increment reroute_count
      await attio.updateListEntry("customer_deals", deal.entry_id, {
        agent: {
          target_object: "agents",
          target_record_id: newAgentId,
        },
        reroute_count: (deal.reroute_count || 0) + 1,
        last_updated: new Date().toISOString(),
      });

      // Also update the parent customer record's buying_agent
      if (deal.parent_record_id) {
        await attio.updateRecord("customers", deal.parent_record_id, {
          buying_agent: {
            target_object: "agents",
            target_record_id: newAgentId,
          },
        });
      }

      // Send A1 lead alert email to new agent (fire-and-forget)
      try {
        const { default: AgentLeadAlert } = await import(
          "@/emails/templates/agent/LeadAlert"
        );
        const { sendEmail } = await import("@/lib/email");
        const magicLink = generateMagicLink(newAgentId, deal.entry_id, "agent");

        // Fetch customer info for the email
        let customerName = deal.deal_name || "Veteran";
        let customerEmail = "";
        let customerPhone = "";
        if (deal.parent_record_id) {
          try {
            const customer = await attio.getRecord(
              "customers",
              deal.parent_record_id,
            );
            customerName =
              `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
              customerName;
            customerEmail = customer?.email || "";
            customerPhone = customer?.phone || "";
          } catch {
            // Continue with defaults
          }
        }

        await sendEmail({
          to: newAgent.email,
          subject: "New Lead from VeteranPCS - Reassigned to You",
          react: AgentLeadAlert({
            agentFirstName: newAgent.first_name || "",
            customerFirstName: customerName.split(" ")[0] || "",
            customerLastName: customerName.split(" ").slice(1).join(" ") || "",
            customerPhone,
            customerEmail,
            destinationCity: deal.destination_city || "",
            destinationState: deal.destination_state || "",
            dealType: deal.deal_type || "Buying",
            militaryStatus: "",
            notes: "This lead was reassigned because the previous agent did not confirm contact within 12 hours.",
            magicLink,
          }),
          attioNote: {
            objectSlug: "agents",
            recordId: newAgentId,
            emailLabel: "A1: Lead Alert (Re-routed)",
          },
        });
      } catch (emailErr) {
        stats.errors.push(
          `Email to new agent failed for deal ${deal.entry_id}: ${emailErr}`,
        );
      }

      // Send SMS to new agent
      if (newAgent.phone) {
        const magicLink = generateMagicLink(newAgentId, deal.entry_id, "agent");
        openphone
          .sendRerouteNotification({
            to: newAgent.phone,
            agentName: newAgent.first_name || newAgent.name || "Agent",
            customerName: deal.deal_name || "Veteran",
            dealType: deal.deal_type || "Buying",
            magicLink,
          })
          .catch((err) => {
            stats.errors.push(
              `SMS to new agent failed for deal ${deal.entry_id}: ${err}`,
            );
          });
      }

      stats.rerouted++;
    } catch (err) {
      stats.errors.push(
        `Re-route failed for deal ${deal.entry_id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ============================================================================
// Rule 2: 7-day stale deal SMS reminder
// ============================================================================

async function process7DayReminders(
  deals: Record<string, any>[],
  stats: CronStats,
): Promise<void> {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const staleDeals = deals.filter((d) => {
    const lastUpdated = d.last_updated
      ? new Date(d.last_updated).getTime()
      : 0;
    return lastUpdated > 0 && now - lastUpdated >= SEVEN_DAYS_MS;
  });

  for (const deal of staleDeals) {
    try {
      const agentId = deal.agent;
      if (!agentId) continue;

      const agent = await attio.getRecord("agents", agentId);
      if (!agent?.phone) continue;

      const magicLink = generateMagicLink(agentId, deal.entry_id, "agent");
      await openphone.sendStalledDealReminder({
        to: agent.phone,
        agentName: agent.first_name || agent.name || "Agent",
        customerName: deal.deal_name || "Customer",
        stage: deal.stage || "Unknown",
        magicLink,
      });

      stats.reminders7d++;
    } catch (err) {
      stats.errors.push(
        `7-day reminder failed for deal ${deal.entry_id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ============================================================================
// Rule 3: 14-day stale deal Slack alert
// ============================================================================

async function process14DayAlerts(
  deals: Record<string, any>[],
  stats: CronStats,
): Promise<void> {
  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  const staleDeals = deals.filter((d) => {
    const lastUpdated = d.last_updated
      ? new Date(d.last_updated).getTime()
      : 0;
    return lastUpdated > 0 && now - lastUpdated >= FOURTEEN_DAYS_MS;
  });

  for (const deal of staleDeals) {
    try {
      let agentName = "Unassigned";
      if (deal.agent) {
        try {
          const agent = await attio.getRecord("agents", deal.agent);
          agentName =
            `${agent?.first_name || ""} ${agent?.last_name || ""}`.trim() ||
            "Unknown";
        } catch {
          // Continue with "Unknown"
        }
      }

      const lastUpdated = deal.last_updated
        ? new Date(deal.last_updated)
        : new Date();
      const daysSinceUpdate = Math.floor(
        (now - lastUpdated.getTime()) / (24 * 60 * 60 * 1000),
      );

      await slack.sendStalledDealAlert({
        dealId: deal.entry_id,
        customerName: deal.deal_name || "Unknown",
        agentName,
        stage: deal.stage || "Unknown",
        daysSinceUpdate,
      });

      stats.alerts14d++;
    } catch (err) {
      stats.errors.push(
        `14-day alert failed for deal ${deal.entry_id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ============================================================================
// Rule 4: 45-day auto-close
// ============================================================================

async function process45DayAutoClose(
  deals: Record<string, any>[],
  stats: CronStats,
): Promise<void> {
  const now = Date.now();
  const FORTY_FIVE_DAYS_MS = 45 * 24 * 60 * 60 * 1000;

  const staleDeals = deals.filter((d) => {
    // Don't auto-close deals already past "Under Contract"
    if (
      d.stage === "Under Contract" ||
      d.stage === "Transaction Closed" ||
      d.stage === "Paid Complete"
    ) {
      return false;
    }

    const lastStageChange = d.last_stage_change
      ? new Date(d.last_stage_change).getTime()
      : 0;
    return lastStageChange > 0 && now - lastStageChange >= FORTY_FIVE_DAYS_MS;
  });

  for (const deal of staleDeals) {
    try {
      await attio.updateListEntry(
        "customer_deals",
        deal.entry_id,
        {
          last_updated: new Date().toISOString(),
          last_stage_change: new Date().toISOString(),
        },
        "Closed Lost",
      );

      // Notify admin
      await slack.sendAlert("Deal Auto-Closed (45 days stale)", {
        "Deal ID": deal.entry_id,
        "Deal Name": deal.deal_name || "Unknown",
        "Previous Stage": deal.stage || "Unknown",
        Reason: "No stage change for 45+ days",
      });

      stats.autoClosed45d++;
    } catch (err) {
      stats.errors.push(
        `45-day auto-close failed for deal ${deal.entry_id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ============================================================================
// Route handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret (Vercel sets Authorization header automatically)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats: CronStats = {
    rerouted: 0,
    rerouteSkipped: 0,
    reminders7d: 0,
    alerts14d: 0,
    autoClosed45d: 0,
    errors: [],
  };

  try {
    // Rule 1: 12-hour re-route (fetches its own data since it only needs New Leads)
    await processStaleNewLeads(stats);

    // Fetch all open deals once for Rules 2-4
    const allOpenDeals = await fetchOpenDeals();

    // Rule 2: 7-day SMS reminders
    await process7DayReminders(allOpenDeals, stats);

    // Rule 3: 14-day Slack alerts
    await process14DayAlerts(allOpenDeals, stats);

    // Rule 4: 45-day auto-close
    await process45DayAutoClose(allOpenDeals, stats);

    console.log("[cron/stale-leads] Completed", stats);

    return NextResponse.json({
      success: true,
      stats: {
        rerouted: stats.rerouted,
        rerouteSkipped: stats.rerouteSkipped,
        reminders7d: stats.reminders7d,
        alerts14d: stats.alerts14d,
        autoClosed45d: stats.autoClosed45d,
        errorCount: stats.errors.length,
      },
      ...(stats.errors.length > 0 && { errors: stats.errors }),
    });
  } catch (error) {
    console.error("[cron/stale-leads] Fatal error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stats: {
          rerouted: stats.rerouted,
          rerouteSkipped: stats.rerouteSkipped,
          reminders7d: stats.reminders7d,
          alerts14d: stats.alerts14d,
          autoClosed45d: stats.autoClosed45d,
          errorCount: stats.errors.length,
        },
      },
      { status: 500 },
    );
  }
}
