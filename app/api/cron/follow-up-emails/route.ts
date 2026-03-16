// app/api/cron/follow-up-emails/route.ts
// Onboarding follow-up drip emails for pipelines that are still in
// "New Application" stage. Runs daily at 2pm UTC via Vercel cron.
//
// For each pipeline (agent_onboarding, lender_onboarding, intern_placements):
//   - Check entries in "New Application" stage
//   - If created 7-8, 14-15, 21-22, or 28-29 days ago (24h window),
//     send a follow-up email (A3, L3, or I2)
//   - The 24h window ensures each follow-up fires exactly once since
//     the cron runs daily

import { NextRequest, NextResponse } from "next/server";
import { attio } from "@/lib/attio";
import { sendEmail } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

// Follow-up intervals in days. Each fires once within a 24h window.
const FOLLOW_UP_DAYS = [7, 14, 21, 28];

// Maximum age for follow-ups (stop after 28 days)
const MAX_FOLLOW_UP_DAYS = 29;

interface PipelineConfig {
  listSlug: string;
  parentObject: string;
  templateImport: () => Promise<any>;
  emailLabel: string;
  subjectFn: (firstName: string) => string;
  templatePropsFn: (record: Record<string, any>) => Record<string, any>;
}

interface CronStats {
  agent_onboarding: number;
  lender_onboarding: number;
  intern_placements: number;
  skipped: number;
  errors: string[];
}

/**
 * Parse a list entry returned by queryListEntries into a flat object.
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
 * Check whether a given entry was created within a follow-up window.
 * Returns the follow-up number (1-4) or null if not in a window.
 */
function getFollowUpNumber(createdAt: string): number | null {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const ageDays = (now - created) / (24 * 60 * 60 * 1000);

  // Too old for follow-ups
  if (ageDays > MAX_FOLLOW_UP_DAYS) return null;

  for (let i = 0; i < FOLLOW_UP_DAYS.length; i++) {
    const targetDay = FOLLOW_UP_DAYS[i];
    // Within a 24h window around the target day
    if (ageDays >= targetDay && ageDays < targetDay + 1) {
      return i + 1;
    }
  }

  return null;
}

/**
 * Process follow-ups for a single pipeline.
 */
async function processPipeline(
  config: PipelineConfig,
  stats: CronStats,
  pipelineKey: keyof Pick<CronStats, "agent_onboarding" | "lender_onboarding" | "intern_placements">,
): Promise<void> {
  // Fetch entries from this pipeline
  const rawEntries = await attio.queryListEntries(config.listSlug, {
    limit: 500,
  });

  const entries = rawEntries.map(parseListEntry);

  // Filter to "New Application" stage within follow-up window
  const eligibleEntries = entries.filter((e: any) => {
    if (e.stage !== "New Application") return false;
    if (!e.created_at) return false;
    return getFollowUpNumber(e.created_at) !== null;
  });

  // Dynamically import the email template once for this pipeline
  let TemplateComponent: any = null;
  try {
    const mod = await config.templateImport();
    TemplateComponent = mod.default;
  } catch (importErr) {
    stats.errors.push(
      `Template import failed for ${config.listSlug}: ${importErr}`,
    );
    return;
  }

  for (const entry of eligibleEntries) {
    try {
      const followUpNum = getFollowUpNumber(entry.created_at);
      if (!followUpNum) continue;

      // Fetch parent record (agent/lender/intern) for email details
      const record = await attio.getRecord(
        config.parentObject,
        entry.parent_record_id,
      );
      if (!record?.email) {
        stats.skipped++;
        continue;
      }

      const firstName = record.first_name || record.name || "there";
      const subject = config.subjectFn(firstName);
      const templateProps = config.templatePropsFn(record);

      await sendEmail({
        to: record.email,
        subject,
        react: TemplateComponent(templateProps),
        attioNote: {
          objectSlug: config.parentObject,
          recordId: record.id,
          emailLabel: `${config.emailLabel} (Follow-up #${followUpNum})`,
        },
      });

      stats[pipelineKey]++;
    } catch (err) {
      stats.errors.push(
        `Follow-up failed for ${config.listSlug} entry ${entry.entry_id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ============================================================================
// Pipeline configurations
// ============================================================================

const PIPELINE_CONFIGS: Array<{
  config: PipelineConfig;
  key: keyof Pick<CronStats, "agent_onboarding" | "lender_onboarding" | "intern_placements">;
}> = [
  {
    config: {
      listSlug: "agent_onboarding",
      parentObject: "agents",
      templateImport: () =>
        import("@/emails/templates/agent/OnboardingFollowUp"),
      emailLabel: "A3: Agent Onboarding Follow-Up",
      subjectFn: (firstName) =>
        `Checking In - VeteranPCS Application Update, ${firstName}`,
      templatePropsFn: (record) => ({
        firstName: record.first_name || record.name || "",
      }),
    },
    key: "agent_onboarding",
  },
  {
    config: {
      listSlug: "lender_onboarding",
      parentObject: "lenders",
      templateImport: () =>
        import("@/emails/templates/lender/OnboardingFollowUp"),
      emailLabel: "L3: Lender Onboarding Follow-Up",
      subjectFn: (firstName) =>
        `Checking In - VeteranPCS Application Update, ${firstName}`,
      templatePropsFn: (record) => ({
        firstName: record.first_name || record.name || "",
      }),
    },
    key: "lender_onboarding",
  },
  {
    config: {
      listSlug: "intern_placements",
      parentObject: "interns",
      templateImport: () =>
        import("@/emails/templates/intern/OnboardingFollowUp"),
      emailLabel: "I2: Intern Onboarding Follow-Up",
      subjectFn: (firstName) =>
        `VeteranPCS Internship - Application Update, ${firstName}`,
      templatePropsFn: (record) => ({
        firstName: record.first_name || record.name || "",
        internshipType: record.internship_type || "",
      }),
    },
    key: "intern_placements",
  },
];

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
    agent_onboarding: 0,
    lender_onboarding: 0,
    intern_placements: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Process all three pipelines sequentially to avoid rate limits
    for (const { config, key } of PIPELINE_CONFIGS) {
      try {
        await processPipeline(config, stats, key);
      } catch (err) {
        stats.errors.push(
          `Pipeline ${config.listSlug} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    console.log("[cron/follow-up-emails] Completed", stats);

    return NextResponse.json({
      success: true,
      stats: {
        emailsSent: {
          agent_onboarding: stats.agent_onboarding,
          lender_onboarding: stats.lender_onboarding,
          intern_placements: stats.intern_placements,
        },
        skipped: stats.skipped,
        errorCount: stats.errors.length,
      },
      ...(stats.errors.length > 0 && { errors: stats.errors }),
    });
  } catch (error) {
    console.error("[cron/follow-up-emails] Fatal error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stats: {
          emailsSent: {
            agent_onboarding: stats.agent_onboarding,
            lender_onboarding: stats.lender_onboarding,
            intern_placements: stats.intern_placements,
          },
          skipped: stats.skipped,
          errorCount: stats.errors.length,
        },
      },
      { status: 500 },
    );
  }
}
