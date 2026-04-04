// scripts/setup-inquiries-pipeline.ts
// Creates the Inquiries pipeline on the People object in Attio
//
// Run with: npx tsx scripts/setup-inquiries-pipeline.ts

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import {
  PIPELINES,
  PIPELINE_ATTRIBUTES,
  PIPELINE_STAGES,
  INQUIRY_SOURCE_OPTIONS,
} from "../lib/attio-schema";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupInquiriesPipeline() {
  console.log("=".repeat(60));
  console.log("VeteranPCS Inquiries Pipeline Setup");
  console.log("=".repeat(60));
  console.log();

  const { attio } = await import("../lib/attio");
  const errors: string[] = [];

  // ==========================================================================
  // PHASE 1: Create Inquiries Pipeline on People
  // ==========================================================================
  console.log("PHASE 1: Creating Inquiries Pipeline");
  console.log("-".repeat(40));

  const pipeline = PIPELINES.find((p) => p.api_slug === "inquiries");
  if (!pipeline) {
    console.error("Inquiries pipeline definition not found in schema");
    process.exit(1);
  }

  const existing = await attio.getList("inquiries");
  if (existing) {
    console.log("Pipeline already exists: inquiries");
  } else {
    try {
      await attio.createList(pipeline);
      console.log(`Created pipeline: inquiries (parent: ${pipeline.parent_object})`);
    } catch (error: any) {
      if (error.message.includes("409") || error.message.includes("slug_conflict")) {
        console.log("Pipeline already exists: inquiries");
      } else {
        console.error("Failed to create inquiries pipeline:", error.message);
        process.exit(1);
      }
    }
  }

  await sleep(200);
  console.log();

  // ==========================================================================
  // PHASE 2: Add Attributes
  // ==========================================================================
  console.log("PHASE 2: Adding Attributes");
  console.log("-".repeat(40));

  const attributes = PIPELINE_ATTRIBUTES["inquiries"];
  if (!attributes) {
    console.error("Inquiries pipeline attributes not found in schema");
    process.exit(1);
  }

  for (const attr of attributes) {
    try {
      await attio.createListAttribute("inquiries", attr);
      console.log(`  Created: ${attr.api_slug} (${attr.type})`);
      await sleep(100);
    } catch (error: any) {
      if (error.message.includes("409") || error.message.includes("already exists")) {
        console.log(`  Already exists: ${attr.api_slug}`);
      } else {
        console.error(`  Failed: ${attr.api_slug}: ${error.message}`);
        errors.push(`Attribute ${attr.api_slug}: ${error.message}`);
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 3: Create Select Options for Source
  // ==========================================================================
  console.log("PHASE 3: Creating Select Options for Source");
  console.log("-".repeat(40));

  for (const option of INQUIRY_SOURCE_OPTIONS) {
    try {
      await attio.createSelectOption("lists", "inquiries", "source", option.title);
      console.log(`  Created: ${option.title}`);
      await sleep(50);
    } catch (error: any) {
      if (error.message.includes("409") || error.message.includes("already exists") || error.message.includes("duplicate")) {
        console.log(`  Already exists: ${option.title}`);
      } else {
        console.error(`  Failed: ${option.title}: ${error.message}`);
        errors.push(`Select option source.${option.title}: ${error.message}`);
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 4: Add Stages
  // ==========================================================================
  console.log("PHASE 4: Adding Stages");
  console.log("-".repeat(40));

  const stages = PIPELINE_STAGES["inquiries"];
  if (!stages) {
    console.error("Inquiries pipeline stages not found in schema");
    process.exit(1);
  }

  for (const stage of stages) {
    try {
      await attio.createListStatus("inquiries", stage);
      console.log(`  Created: ${stage.title} (active: ${stage.is_active})`);
      await sleep(100);
    } catch (error: any) {
      if (error.message.includes("409") || error.message.includes("already exists")) {
        console.log(`  Already exists: ${stage.title}`);
      } else {
        console.error(`  Failed: ${stage.title}: ${error.message}`);
        errors.push(`Stage ${stage.title}: ${error.message}`);
      }
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log();
  console.log("=".repeat(60));
  if (errors.length > 0) {
    console.log("Completed with errors:");
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("All schema elements created successfully!");
  }
  console.log();
  console.log("Next steps:");
  console.log("1. Verify in Attio UI: Inquiries pipeline on People object");
  console.log("2. Create WF6 in Attio: New Inquiry → Slack to #leads-unassigned");
  console.log("3. Test general contact form submission");
  console.log("=".repeat(60));
}

setupInquiriesPipeline().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
