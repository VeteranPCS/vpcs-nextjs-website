/**
 * Add 'states' reverse reference attribute to lenders object
 *
 * This creates a bidirectional relationship:
 * - State.lenders (existing) → multi-ref to lenders assigned to state
 * - Lender.states (new) → multi-ref to states where lender is assigned
 *
 * Run: npx tsx scripts/add-lender-states-attribute.ts
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local BEFORE importing attio
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  // Dynamic import ensures env vars are loaded before AttioClient is instantiated
  const { attio } = await import("../lib/attio");

  console.log("Adding states attribute to lenders object...\n");

  try {
    // Check if attribute already exists
    const lenderObject = await attio.getObject("lenders");
    if (!lenderObject) {
      throw new Error("Lenders object not found");
    }

    // Try to create the attribute
    const attribute = await attio.createAttribute("lenders", {
      title: "States",
      api_slug: "states",
      type: "record-reference",
      is_multiselect: true,
      description:
        "States where this lender is assigned (reverse reference from State.lenders)",
      config: {
        record_reference: {
          allowed_objects: ["states"],
        },
      },
    });

    console.log('✅ Successfully created "states" attribute on lenders object');
    console.log("   Attribute ID:", attribute.id?.attribute_id);
    console.log(
      "\nNext step: Run the backfill script to populate existing lender assignments",
    );
    console.log("   npx tsx scripts/backfill-lender-states.ts");
  } catch (error: any) {
    if (
      error.message?.includes("409") ||
      error.message?.includes("already exists")
    ) {
      console.log('ℹ️  "states" attribute already exists on lenders object');
      console.log("\nYou can proceed to run the backfill script:");
      console.log("   npx tsx scripts/backfill-lender-states.ts");
    } else {
      console.error("❌ Error creating attribute:", error.message);
      process.exit(1);
    }
  }
}

main();
