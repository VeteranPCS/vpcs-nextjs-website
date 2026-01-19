// scripts/audit-migration.ts
// Comprehensive audit of Attio migration data
// Checks all objects, relationships, and compares with stateService output

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

interface AuditResult {
  object: string;
  total: number;
  issues: string[];
}

async function auditMigration() {
  console.log("=".repeat(70));
  console.log("COMPREHENSIVE MIGRATION AUDIT");
  console.log("=".repeat(70));
  console.log();

  const { attio } = await import("../lib/attio");

  // ============================================================
  // PART 1: Raw Record Counts
  // ============================================================
  console.log("PART 1: RAW RECORD COUNTS");
  console.log("-".repeat(70));

  const states = await attio.queryRecords("states", { limit: 100 });
  console.log(`States: ${states.length}`);

  const agents = await attio.queryRecords("agents", { limit: 2000 });
  console.log(`Agents (total): ${agents.length}`);

  const activeAgents = agents.filter((a: any) => a.active_on_website === true);
  console.log(`Agents (active_on_website=true): ${activeAgents.length}`);

  const lenders = await attio.queryRecords("lenders", { limit: 500 });
  console.log(`Lenders (total): ${lenders.length}`);

  const activeLenders = lenders.filter((a: any) => a.active_on_website === true);
  console.log(`Lenders (active_on_website=true): ${activeLenders.length}`);

  const areas = await attio.queryRecords("areas", { limit: 500 });
  console.log(`Areas: ${areas.length}`);

  const areaAssignments = await attio.queryRecords("area_assignments", { limit: 2000 });
  console.log(`Area Assignments (total): ${areaAssignments.length}`);

  const activeAssignments = areaAssignments.filter((a: any) => a.status === "Active");
  console.log(`Area Assignments (status=Active): ${activeAssignments.length}`);

  console.log();

  // ============================================================
  // PART 2: State-Level Audit
  // ============================================================
  console.log("PART 2: STATE-BY-STATE ANALYSIS");
  console.log("-".repeat(70));
  console.log(
    "State".padEnd(5) +
      "Areas".padStart(7) +
      "Assgn".padStart(7) +
      "Agents".padStart(8) +
      "Lenders".padStart(9) +
      "  Issues"
  );
  console.log("-".repeat(70));

  // Build lookup maps
  const agentIdSet = new Set(agents.map((a: any) => a.id));
  const activeAgentIdSet = new Set(activeAgents.map((a: any) => a.id));
  const lenderIdSet = new Set(lenders.map((l: any) => l.id));
  const activeLenderIdSet = new Set(activeLenders.map((l: any) => l.id));
  const areaIdSet = new Set(areas.map((a: any) => a.id));

  let totalIssues: string[] = [];
  let statesWithNoAreas = 0;
  let statesWithNoAssignments = 0;
  let statesWithNoLenders = 0;

  for (const state of states.sort((a: any, b: any) => a.name.localeCompare(b.name))) {
    const stateCode = state.state_code || "??";
    const issues: string[] = [];

    // Get areas for this state
    const stateAreas = areas.filter(
      (a: any) => a.state === state.id || a.state?.target_record_id === state.id
    );

    // Get lenders for this state
    const rawLenderIds = state.lenders;
    const stateLenderIds = Array.isArray(rawLenderIds)
      ? rawLenderIds
      : rawLenderIds
        ? [rawLenderIds]
        : [];
    const validLenderIds = stateLenderIds.filter((id: string) => lenderIdSet.has(id));
    const activeLenderCount = validLenderIds.filter((id: string) =>
      activeLenderIdSet.has(id)
    ).length;
    const staleLenderCount = stateLenderIds.length - validLenderIds.length;

    // Get area assignments for this state's areas
    const areaIds = stateAreas.map((a: any) => a.id);
    const stateAssignments = areaAssignments.filter((aa: any) => {
      const areaId = aa.area?.target_record_id || aa.area;
      return areaIds.includes(areaId);
    });
    const activeStateAssignments = stateAssignments.filter(
      (aa: any) => aa.status === "Active"
    );

    // Count unique active agents from assignments
    const assignedAgentIds = new Set(
      activeStateAssignments
        .map((aa: any) => aa.agent?.target_record_id || aa.agent)
        .filter((id: string) => activeAgentIdSet.has(id))
    );

    // Identify issues
    if (stateAreas.length === 0) {
      issues.push("NO_AREAS");
      statesWithNoAreas++;
    }
    if (activeStateAssignments.length === 0 && stateAreas.length > 0) {
      issues.push("NO_ACTIVE_ASSIGNMENTS");
      statesWithNoAssignments++;
    }
    if (staleLenderCount > 0) {
      issues.push(`${staleLenderCount}_STALE_LENDER_REFS`);
    }
    if (activeLenderCount === 0) {
      issues.push("NO_ACTIVE_LENDERS");
      statesWithNoLenders++;
    }

    console.log(
      stateCode.padEnd(5) +
        String(stateAreas.length).padStart(7) +
        String(activeStateAssignments.length).padStart(7) +
        String(assignedAgentIds.size).padStart(8) +
        String(activeLenderCount).padStart(9) +
        (issues.length > 0 ? "  ⚠️ " + issues.join(", ") : "  ✓")
    );

    if (issues.length > 0) {
      totalIssues.push(`${stateCode}: ${issues.join(", ")}`);
    }
  }

  console.log("-".repeat(70));
  console.log();

  // ============================================================
  // PART 3: Relationship Integrity Check
  // ============================================================
  console.log("PART 3: RELATIONSHIP INTEGRITY");
  console.log("-".repeat(70));

  // Check area → state references
  const areasWithInvalidState = areas.filter((a: any) => {
    const stateId = a.state?.target_record_id || a.state;
    return !states.some((s: any) => s.id === stateId);
  });
  console.log(
    `Areas with invalid state reference: ${areasWithInvalidState.length}`
  );

  // Check area_assignment → area references
  const assignmentsWithInvalidArea = areaAssignments.filter((aa: any) => {
    const areaId = aa.area?.target_record_id || aa.area;
    return !areaIdSet.has(areaId);
  });
  console.log(
    `Area assignments with invalid area reference: ${assignmentsWithInvalidArea.length}`
  );

  // Check area_assignment → agent references
  const assignmentsWithInvalidAgent = areaAssignments.filter((aa: any) => {
    const agentId = aa.agent?.target_record_id || aa.agent;
    return agentId && !agentIdSet.has(agentId);
  });
  console.log(
    `Area assignments with invalid agent reference: ${assignmentsWithInvalidAgent.length}`
  );

  // Check state → lender references (stale UUIDs)
  let totalStaleLenderRefs = 0;
  for (const state of states) {
    const rawLenderIds = state.lenders;
    const lenderIds = Array.isArray(rawLenderIds)
      ? rawLenderIds
      : rawLenderIds
        ? [rawLenderIds]
        : [];
    const staleCount = lenderIds.filter(
      (id: string) => !lenderIdSet.has(id)
    ).length;
    totalStaleLenderRefs += staleCount;
  }
  console.log(`Total stale lender references in State.lenders: ${totalStaleLenderRefs}`);

  console.log();

  // ============================================================
  // PART 4: Compare with stateService Expected Output
  // ============================================================
  console.log("PART 4: stateService EXPECTED vs ATTIO DATA");
  console.log("-".repeat(70));

  // Import stateService and test a few states
  const stateService = (await import("../services/stateService")).default;

  const testStates = ["texas", "colorado", "california", "florida", "georgia", "new-york", "washington", "maine", "puerto-rico"];

  console.log("State".padEnd(15) + "svcAgents".padStart(10) + "svcLenders".padStart(11) + "  Notes");
  console.log("-".repeat(50));

  for (const stateSlug of testStates) {
    try {
      const agentsResult = await stateService.fetchAgentsListByState(stateSlug);
      const lendersResult = await stateService.fetchLendersListByState(stateSlug);
      console.log(
        stateSlug.padEnd(15) +
          String(agentsResult.totalSize).padStart(10) +
          String(lendersResult.totalSize).padStart(11)
      );
    } catch (e: any) {
      console.log(stateSlug.padEnd(15) + "ERROR".padStart(10) + "ERROR".padStart(11) + "  " + e.message.substring(0, 30));
    }
  }

  console.log();

  // ============================================================
  // PART 5: Summary
  // ============================================================
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total states: ${states.length}`);
  console.log(`States with no areas: ${statesWithNoAreas}`);
  console.log(`States with no active assignments: ${statesWithNoAssignments}`);
  console.log(`States with no active lenders: ${statesWithNoLenders}`);
  console.log(`Total stale lender references: ${totalStaleLenderRefs}`);
  console.log(`Total issues found: ${totalIssues.length}`);

  if (totalIssues.length > 0) {
    console.log("\nAll issues:");
    for (const issue of totalIssues) {
      console.log(`  - ${issue}`);
    }
  }
}

auditMigration().catch(console.error);
