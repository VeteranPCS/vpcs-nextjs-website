/**
 * Backfill lender.states reverse references from State.lenders
 *
 * This script:
 * 1. Fetches all states with their lender assignments
 * 2. Builds a map of lender_id → [state_ids]
 * 3. Updates each lender with their assigned states
 *
 * Uses assertRecord (PUT) to completely replace the states field,
 * ensuring clean data even if run multiple times.
 *
 * Run: npx tsx scripts/backfill-lender-states.ts
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local BEFORE importing attio
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

interface State {
  id: string;
  name: string;
  state_code: string;
  lenders: string | string[] | null;
}

interface Lender {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

async function main() {
  // Dynamic import ensures env vars are loaded before AttioClient is instantiated
  const { attio } = await import("../lib/attio");

  console.log("Backfilling lender.states reverse references...\n");

  // Step 1: Fetch all states with their lender assignments
  console.log("Step 1: Fetching all states...");
  const states = (await attio.queryRecords("states", {
    limit: 100,
  })) as State[];
  console.log(`   Found ${states.length} states\n`);

  // Step 2: Build lender → states mapping
  console.log("Step 2: Building lender → states mapping...");
  const lenderToStates = new Map<string, string[]>();

  for (const state of states) {
    if (!state.lenders) continue;

    // lenders can be a single ID or array of IDs
    const lenderIds = Array.isArray(state.lenders)
      ? state.lenders
      : [state.lenders];

    for (const lenderId of lenderIds) {
      if (!lenderToStates.has(lenderId)) {
        lenderToStates.set(lenderId, []);
      }
      lenderToStates.get(lenderId)!.push(state.id);
    }
  }

  console.log(
    `   Found ${lenderToStates.size} lenders with state assignments\n`,
  );

  // Step 3: Fetch all lenders to get their emails (needed for assertRecord)
  console.log("Step 3: Fetching all lenders...");
  const lenders = (await attio.queryRecords("lenders", {
    limit: 500,
  })) as Lender[];
  console.log(`   Found ${lenders.length} lenders\n`);

  // Build lender ID → email map
  const lenderEmails = new Map<string, string>();
  for (const lender of lenders) {
    if (lender.email) {
      lenderEmails.set(lender.id, lender.email);
    }
  }

  // Step 4: Update each lender with their states
  console.log("Step 4: Updating lenders with state assignments...");
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [lenderId, stateIds] of lenderToStates) {
    const email = lenderEmails.get(lenderId);
    if (!email) {
      console.log(`   ⚠️  Skipping lender ${lenderId} - no email found`);
      skipped++;
      continue;
    }

    try {
      // Use assertRecord with email as matching attribute to ensure clean replacement
      await attio.assertRecord("lenders", "email", {
        email: email,
        states: stateIds.map((stateId) => ({
          target_object: "states",
          target_record_id: stateId,
        })),
      });

      updated++;
      const stateNames = states
        .filter((s) => stateIds.includes(s.id))
        .map((s) => s.state_code)
        .join(", ");
      console.log(
        `   ✅ Updated lender ${email}: ${stateIds.length} states (${stateNames})`,
      );
    } catch (error: any) {
      console.log(`   ❌ Error updating lender ${email}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total lenders with assignments: ${lenderToStates.size}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Skipped (no email): ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (errors === 0 && skipped === 0) {
    console.log("\n✅ All lender state assignments backfilled successfully!");
    console.log("\nNext step: Update the webhook handler to use lender.states");
  } else {
    console.log(
      "\n⚠️  Some lenders were not updated. Review the output above.",
    );
  }
}

main().catch(console.error);
