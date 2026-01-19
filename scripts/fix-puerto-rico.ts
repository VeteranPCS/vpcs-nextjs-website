// scripts/fix-puerto-rico.ts
// Creates an area for Puerto Rico and assigns the active agent
//
// Issue: Puerto Rico only had a "state-level placeholder" area in Salesforce
// (where area.Name = state.Name), which was filtered out during migration.
// This script creates a proper "San Juan" area and assigns the active agent.

import dotenv from "dotenv";
import path from "path";
import { parse } from "csv-parse/sync";
import fs from "fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function fixPuertoRico() {
  console.log("=".repeat(60));
  console.log("Fix Puerto Rico - Create Area and Assignment");
  console.log("=".repeat(60));
  console.log();

  const { attio } = await import("../lib/attio");

  // 1. Get Puerto Rico state record
  console.log("1. Finding Puerto Rico state record...");
  const states = await attio.queryRecords("states", {
    filter: { state_code: { $eq: "PR" } },
    limit: 1,
  });

  if (!states.length) {
    console.error("❌ Puerto Rico state not found in Attio!");
    return;
  }

  const prState = states[0];
  console.log(`   Found: ${prState.name} (${prState.id})`);

  // 2. Check if area already exists
  console.log("\n2. Checking for existing areas in Puerto Rico...");
  const existingAreas = await attio.queryRecords("areas", {
    filter: { state: { target_record_id: { $eq: prState.id } } },
    limit: 10,
  });

  if (existingAreas.length > 0) {
    console.log(`   Found ${existingAreas.length} existing areas:`);
    for (const area of existingAreas) {
      console.log(`   - ${area.name}`);
    }
  } else {
    console.log("   No areas found, will create one.");
  }

  // 3. Create San Juan area if needed
  let sanJuanArea;
  const existingSanJuan = existingAreas.find(
    (a: any) => a.name === "San Juan" || a.name === "Puerto Rico - San Juan"
  );

  if (existingSanJuan) {
    console.log("\n3. San Juan area already exists, skipping creation.");
    sanJuanArea = existingSanJuan;
  } else {
    console.log("\n3. Creating San Juan area...");
    try {
      sanJuanArea = await attio.createRecord("areas", {
        name: "San Juan",
        state: { target_object: "states", target_record_id: prState.id },
        coverage_target: 3, // Default target
        coverage_active: 0,
      });
      console.log(`   ✓ Created area: San Juan (${sanJuanArea.id})`);
    } catch (error: any) {
      console.error("   ❌ Failed to create area:", error.message);
      return;
    }
  }

  // 4. Find the Puerto Rico agent in Salesforce data
  console.log("\n4. Finding Puerto Rico agent from Salesforce data...");

  const accountCsv = fs.readFileSync(
    path.join(process.cwd(), "data/salesforce/Account.csv"),
    "utf-8"
  );
  const contactCsv = fs.readFileSync(
    path.join(process.cwd(), "data/salesforce/Contact.csv"),
    "utf-8"
  );

  const accounts: any[] = parse(accountCsv, { columns: true });
  const contacts: any[] = parse(contactCsv, { columns: true });

  const contactMap = new Map(contacts.map((c) => [c.Id, c]));

  const AGENT_TYPE = "0124x000000YzFs";
  const prAgents = accounts.filter(
    (a) =>
      a.RecordTypeId?.substring(0, 15) === AGENT_TYPE &&
      (a.BillingStateCode === "PR" || a.BillingState === "Puerto Rico")
  );

  console.log(`   Found ${prAgents.length} agent(s) in Puerto Rico:`);

  for (const agent of prAgents) {
    const contact = contactMap.get(agent.PersonContactId);
    const isActive = contact?.Active_on_Website__c === "1";
    console.log(
      `   - ${agent.FirstName} ${agent.LastName} (Active: ${isActive})`
    );
  }

  // 5. Find active agents and look them up in Attio
  console.log("\n5. Looking up agents in Attio and creating assignments...");

  for (const sfAgent of prAgents) {
    const contact = contactMap.get(sfAgent.PersonContactId);
    const isActive = contact?.Active_on_Website__c === "1";

    if (!isActive) {
      console.log(
        `   ⏭️  Skipping ${sfAgent.FirstName} ${sfAgent.LastName} (not active on website)`
      );
      continue;
    }

    // Find agent in Attio by salesforce_id
    const attioAgents = await attio.queryRecords("agents", {
      filter: { salesforce_id: { $eq: sfAgent.Id } },
      limit: 1,
    });

    if (!attioAgents.length) {
      // Try with 18-char ID
      const attioAgents18 = await attio.queryRecords("agents", {
        filter: { salesforce_id: { $eq: sfAgent.Id.substring(0, 18) } },
        limit: 1,
      });

      if (!attioAgents18.length) {
        console.log(
          `   ⚠️  Agent ${sfAgent.FirstName} ${sfAgent.LastName} not found in Attio (SF ID: ${sfAgent.Id})`
        );
        continue;
      }
    }

    const attioAgent = attioAgents[0];
    console.log(
      `   Found: ${attioAgent.name || attioAgent.first_name} (${attioAgent.id})`
    );

    // Check if assignment already exists
    const existingAssignments = await attio.queryRecords("area_assignments", {
      filter: {
        $and: [
          { agent: { target_record_id: { $eq: attioAgent.id } } },
          { area: { target_record_id: { $eq: sanJuanArea.id } } },
        ],
      },
      limit: 1,
    });

    if (existingAssignments.length > 0) {
      console.log(`   ⏭️  Assignment already exists for ${attioAgent.name}`);
      continue;
    }

    // Create area assignment
    try {
      const assignment = await attio.createRecord("area_assignments", {
        agent: { target_object: "agents", target_record_id: attioAgent.id },
        area: { target_object: "areas", target_record_id: sanJuanArea.id },
        status: "Active",
        aa_score: 100, // Default score
      });
      console.log(`   ✓ Created assignment: ${assignment.id}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to create assignment:`, error.message);
    }
  }

  // 6. Verify
  console.log("\n6. Verifying Puerto Rico setup...");

  const finalAreas = await attio.queryRecords("areas", {
    filter: { state: { target_record_id: { $eq: prState.id } } },
    limit: 10,
  });
  console.log(`   Areas in PR: ${finalAreas.length}`);

  if (finalAreas.length > 0) {
    const areaIds = finalAreas.map((a: any) => a.id);
    const assignments = await attio.queryRecords("area_assignments", {
      filter: {
        $and: [
          { area: { target_record_id: { $in: areaIds } } },
          { status: { $eq: "Active" } },
        ],
      },
      limit: 100,
    });
    console.log(`   Active assignments in PR: ${assignments.length}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE");
  console.log("=".repeat(60));
}

fixPuertoRico().catch(console.error);
