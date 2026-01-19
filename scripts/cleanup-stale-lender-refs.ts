// scripts/cleanup-stale-lender-refs.ts
// Removes stale lender references from State.lenders that point to non-existent records

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function cleanupStaleLenderRefs() {
  console.log("=".repeat(60));
  console.log("Cleanup Stale Lender References");
  console.log("=".repeat(60));
  console.log();

  const { attio } = await import("../lib/attio");

  // Get all lenders and build a set of valid IDs
  console.log("Fetching all lenders from Attio...");
  const allLenders = await attio.queryRecords("lenders", { limit: 500 });
  const validLenderIds = new Set(allLenders.map((l: any) => l.id));
  console.log(`Found ${validLenderIds.size} valid lender records\n`);

  // Get all states
  console.log("Fetching all states from Attio...");
  const states = await attio.queryRecords("states", { limit: 100 });
  console.log(`Found ${states.length} states\n`);

  let cleanedCount = 0;
  let alreadyCleanCount = 0;
  let errorCount = 0;

  for (const state of states) {
    const rawLenderIds = state.lenders;
    const currentIds = Array.isArray(rawLenderIds)
      ? rawLenderIds
      : rawLenderIds
        ? [rawLenderIds]
        : [];

    // Filter to only valid lender IDs
    const validIds = currentIds.filter((id: string) => validLenderIds.has(id));
    const staleIds = currentIds.filter(
      (id: string) => !validLenderIds.has(id),
    );

    if (staleIds.length === 0) {
      alreadyCleanCount++;
      continue;
    }

    console.log(
      `${state.state_code}: ${currentIds.length} refs → ${validIds.length} valid (removing ${staleIds.length} stale)`,
    );

    try {
      // To replace the multi-ref field, we need to clear it first then set new values
      // Attio API: setting to empty array clears the field
      await attio.updateRecord("states", state.id, {
        lenders: [], // Clear first
      });

      // Now set the valid IDs
      if (validIds.length > 0) {
        await attio.updateRecord("states", state.id, {
          lenders: validIds.map((id: string) => ({
            target_object: "lenders",
            target_record_id: id,
          })),
        });
      }

      console.log(`  ✓ Updated ${state.state_code}`);
      cleanedCount++;
    } catch (error) {
      console.error(
        `  ❌ Error updating ${state.state_code}:`,
        error instanceof Error ? error.message : error,
      );
      errorCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("CLEANUP COMPLETE");
  console.log("=".repeat(60));
  console.log(`✓ States cleaned: ${cleanedCount}`);
  console.log(`⏭️  Already clean: ${alreadyCleanCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

cleanupStaleLenderRefs().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
