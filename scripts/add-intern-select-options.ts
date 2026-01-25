// scripts/add-intern-select-options.ts
// Creates select options for intern object attributes
//
// Run with: npx tsx scripts/add-intern-select-options.ts

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import {
  MILITARY_SERVICE_OPTIONS,
  MILITARY_STATUS_OPTIONS,
  DISCHARGE_STATUS_OPTIONS,
  INTERNSHIP_TYPE_OPTIONS,
  LICENSED_STATUS_OPTIONS,
  INTERN_HOW_DID_YOU_HEAR_OPTIONS,
} from "../lib/attio-schema";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addSelectOptions() {
  console.log("=".repeat(60));
  console.log("Adding Select Options to Interns Object");
  console.log("=".repeat(60));
  console.log();

  const { attio } = await import("../lib/attio");

  // Define which attributes need options and their values
  const selectAttributes = [
    { slug: "military_service", options: MILITARY_SERVICE_OPTIONS },
    { slug: "military_status", options: MILITARY_STATUS_OPTIONS },
    { slug: "discharge_status", options: DISCHARGE_STATUS_OPTIONS },
    { slug: "internship_type", options: INTERNSHIP_TYPE_OPTIONS },
    { slug: "licensed", options: LICENSED_STATUS_OPTIONS },
    { slug: "how_did_you_hear", options: INTERN_HOW_DID_YOU_HEAR_OPTIONS },
  ];

  for (const attr of selectAttributes) {
    console.log(`\n📋 ${attr.slug}:`);

    for (const option of attr.options) {
      try {
        await attio.createSelectOption("objects", "interns", attr.slug, option.title);
        console.log(`  ✓ ${option.title}`);
        await sleep(100);
      } catch (error: any) {
        if (
          error.message.includes("409") ||
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          console.log(`  ⏭️  ${option.title} (already exists)`);
        } else {
          console.error(`  ❌ ${option.title}: ${error.message}`);
        }
      }
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("SELECT OPTIONS COMPLETE");
  console.log("=".repeat(60));
}

addSelectOptions().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
