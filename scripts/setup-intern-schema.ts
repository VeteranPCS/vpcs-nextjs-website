// scripts/setup-intern-schema.ts
// Creates the Intern object and Intern Placements pipeline in Attio
//
// Run with: npx tsx scripts/setup-intern-schema.ts

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import {
  OBJECTS,
  OBJECT_ATTRIBUTES,
  PIPELINES,
  PIPELINE_ATTRIBUTES,
  PIPELINE_STAGES,
  MILITARY_SERVICE_OPTIONS,
  MILITARY_STATUS_OPTIONS,
  DISCHARGE_STATUS_OPTIONS,
  INTERNSHIP_TYPE_OPTIONS,
  LICENSED_STATUS_OPTIONS,
  INTERN_HOW_DID_YOU_HEAR_OPTIONS,
} from "../lib/attio-schema";

// Select attributes that need options created
const INTERN_SELECT_ATTRIBUTES = [
  { slug: "military_service", options: MILITARY_SERVICE_OPTIONS },
  { slug: "military_status", options: MILITARY_STATUS_OPTIONS },
  { slug: "discharge_status", options: DISCHARGE_STATUS_OPTIONS },
  { slug: "internship_type", options: INTERNSHIP_TYPE_OPTIONS },
  { slug: "licensed", options: LICENSED_STATUS_OPTIONS },
  { slug: "how_did_you_hear", options: INTERN_HOW_DID_YOU_HEAR_OPTIONS },
];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupInternSchema() {
  console.log("=".repeat(60));
  console.log("VeteranPCS Intern Schema Setup");
  console.log("=".repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import("../lib/attio");

  const errors: string[] = [];

  // ==========================================================================
  // PHASE 1: Create Interns Object
  // ==========================================================================
  console.log("PHASE 1: Creating Interns Object");
  console.log("-".repeat(40));

  const internObject = OBJECTS.find((o) => o.api_slug === "interns");
  if (!internObject) {
    console.error("❌ Intern object definition not found in schema");
    process.exit(1);
  }

  // Check if object already exists
  const existingObject = await attio.getObject("interns");
  if (existingObject) {
    console.log("⏭️  Object already exists: interns");
  } else {
    // Object doesn't exist, create it
    try {
      const result = await attio.createObject(internObject);
      console.log(
        `✓ Created object: interns (${result.id?.object_id || "ID not returned"})`,
      );
    } catch (createError: any) {
      if (
        createError.message.includes("409") ||
        createError.message.includes("slug_conflict")
      ) {
        console.log("⏭️  Object already exists: interns");
      } else {
        console.error(
          "❌ Failed to create interns object:",
          createError.message,
        );
        errors.push(`Failed to create interns object: ${createError.message}`);
        // Cannot proceed without the object
        console.error(
          "\n⛔ Cannot proceed without interns object. Please check Attio API key and permissions.",
        );
        process.exit(1);
      }
    }
  }

  await sleep(200);
  console.log();

  // ==========================================================================
  // PHASE 2: Add Attributes to Interns Object
  // ==========================================================================
  console.log("PHASE 2: Adding Attributes to Interns Object");
  console.log("-".repeat(40));

  const internAttributes = OBJECT_ATTRIBUTES["interns"];
  if (!internAttributes) {
    console.error("❌ Intern attributes not found in schema");
    process.exit(1);
  }

  console.log(`📦 interns (${internAttributes.length} attributes):`);

  for (const attr of internAttributes) {
    try {
      await attio.createAttribute("interns", attr);
      console.log(`  ✓ ${attr.api_slug} (${attr.type})`);
      await sleep(100);
    } catch (error: any) {
      if (
        error.message.includes("409") ||
        error.message.includes("already exists")
      ) {
        console.log(`  ⏭️  ${attr.api_slug} (already exists)`);
      } else {
        console.error(`  ❌ ${attr.api_slug}: ${error.message}`);
        errors.push(`Attribute interns.${attr.api_slug}: ${error.message}`);
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 2B: Create Select Options for Intern Attributes
  // ==========================================================================
  console.log("PHASE 2B: Creating Select Options");
  console.log("-".repeat(40));

  for (const selectAttr of INTERN_SELECT_ATTRIBUTES) {
    console.log(`\n  📋 ${selectAttr.slug}:`);
    for (const option of selectAttr.options) {
      try {
        await attio.createSelectOption(
          "objects",
          "interns",
          selectAttr.slug,
          option.title,
        );
        console.log(`    ✓ ${option.title}`);
        await sleep(50);
      } catch (error: any) {
        if (
          error.message.includes("409") ||
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          console.log(`    ⏭️  ${option.title} (already exists)`);
        } else {
          console.error(`    ❌ ${option.title}: ${error.message}`);
          errors.push(
            `Select option interns.${selectAttr.slug}.${option.title}: ${error.message}`,
          );
        }
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 3: Create Intern Placements Pipeline
  // ==========================================================================
  console.log("PHASE 3: Creating Intern Placements Pipeline");
  console.log("-".repeat(40));

  const internPipeline = PIPELINES.find(
    (p) => p.api_slug === "intern_placements",
  );
  if (!internPipeline) {
    console.error(
      "❌ Intern placements pipeline definition not found in schema",
    );
    process.exit(1);
  }

  // Check if pipeline already exists
  const existingPipeline = await attio.getList("intern_placements");
  if (existingPipeline) {
    console.log("⏭️  Pipeline already exists: intern_placements");
  } else {
    // Pipeline doesn't exist, create it
    try {
      const result = await attio.createList(internPipeline);
      console.log(
        `✓ Created pipeline: intern_placements (parent: ${internPipeline.parent_object})`,
      );
    } catch (createError: any) {
      if (
        createError.message.includes("409") ||
        createError.message.includes("slug_conflict")
      ) {
        console.log("⏭️  Pipeline already exists: intern_placements");
      } else {
        console.error(
          "❌ Failed to create intern_placements pipeline:",
          createError.message,
        );
        errors.push(
          `Failed to create intern_placements pipeline: ${createError.message}`,
        );
        console.error(
          "\n⛔ Cannot proceed without pipeline. Please check Attio API permissions.",
        );
        process.exit(1);
      }
    }
  }

  await sleep(200);
  console.log();

  // ==========================================================================
  // PHASE 4: Add Attributes to Pipeline
  // ==========================================================================
  console.log("PHASE 4: Adding Attributes to Intern Placements Pipeline");
  console.log("-".repeat(40));

  const pipelineAttributes = PIPELINE_ATTRIBUTES["intern_placements"];
  if (!pipelineAttributes) {
    console.error(
      "❌ Intern placements pipeline attributes not found in schema",
    );
    process.exit(1);
  }

  console.log(
    `📋 intern_placements (${pipelineAttributes.length} attributes):`,
  );

  for (const attr of pipelineAttributes) {
    try {
      await attio.createListAttribute("intern_placements", attr);
      console.log(`  ✓ ${attr.api_slug} (${attr.type})`);
      await sleep(100);
    } catch (error: any) {
      if (
        error.message.includes("409") ||
        error.message.includes("already exists")
      ) {
        console.log(`  ⏭️  ${attr.api_slug} (already exists)`);
      } else {
        console.error(`  ❌ ${attr.api_slug}: ${error.message}`);
        errors.push(
          `Pipeline attribute intern_placements.${attr.api_slug}: ${error.message}`,
        );
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 5: Add Stages to Pipeline
  // ==========================================================================
  console.log("PHASE 5: Adding Stages to Intern Placements Pipeline");
  console.log("-".repeat(40));

  const pipelineStages = PIPELINE_STAGES["intern_placements"];
  if (!pipelineStages) {
    console.error("❌ Intern placements pipeline stages not found in schema");
    process.exit(1);
  }

  console.log(`🎯 intern_placements (${pipelineStages.length} stages):`);

  for (const stage of pipelineStages) {
    try {
      await attio.createListStatus("intern_placements", stage);
      console.log(`  ✓ ${stage.title} (active: ${stage.is_active})`);
      await sleep(100);
    } catch (error: any) {
      if (
        error.message.includes("409") ||
        error.message.includes("already exists")
      ) {
        console.log(`  ⏭️  ${stage.title} (already exists)`);
      } else {
        console.error(`  ❌ ${stage.title}: ${error.message}`);
        errors.push(
          `Pipeline stage intern_placements.${stage.title}: ${error.message}`,
        );
      }
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log();
  console.log("=".repeat(60));
  console.log("SETUP COMPLETE");
  console.log("=".repeat(60));
  console.log();

  if (errors.length > 0) {
    console.log("⚠️  Errors encountered:");
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("✓ All schema elements created successfully!");
  }

  console.log();
  console.log("Created:");
  console.log(`  - Object: interns (${internAttributes.length} attributes)`);
  console.log(
    `  - Pipeline: intern_placements (${pipelineAttributes.length} attributes, ${pipelineStages.length} stages)`,
  );

  console.log();
  console.log("Next steps:");
  console.log("1. Verify in Attio UI: https://app.attio.com");
  console.log("2. Test internship form submission");
  console.log("3. Verify all 17 form fields are persisted to intern record");
}

// Run setup
setupInternSchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
