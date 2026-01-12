// scripts/migrate-area-assignments.ts
// Migrates area assignments from Salesforce to Attio
//
// Key behaviors:
// 1. Filters to ONLY agent assignments (lenders are handled separately via State.lenders)
// 2. Creates Area Assignment records with agent and area references
// 3. Updates Area.area_assignments bidirectionally for efficient state page queries
//
// Prerequisites:
// - Agents must be migrated first (data/mappings/agents.json)
// - Areas must be migrated first (data/mappings/areas.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// RecordTypeIds from Salesforce (15-char version as exported in CSV)
const AGENT_RECORD_TYPE_ID = '0124x000000YzFs';
const LENDER_RECORD_TYPE_ID = '0124x000000ZGGZ';

interface AccountRow {
  Id: string;
  RecordTypeId: string;
  FirstName: string;
  LastName: string;
}

interface AreaRow {
  Id: string;
  Name: string;
  State__c: string;
}

interface AreaAssignmentRow {
  Id: string;
  IsDeleted: string;
  Agent__c: string;  // Account ID (can be Agent or Lender)
  Area__c: string;
  AA_Score__c: string;
  Status__c: string;
}

async function migrateAreaAssignments() {
  console.log('='.repeat(60));
  console.log('Migrate Area Assignments');
  console.log('Agents only - Lenders handled via State.lenders');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const agentsMapPath = path.join(mappingsDir, 'agents.json');
  const areasMapPath = path.join(mappingsDir, 'areas.json');

  if (!fs.existsSync(agentsMapPath)) {
    console.error('❌ Missing agents mapping file. Run migrate-agents.ts first.');
    process.exit(1);
  }
  if (!fs.existsSync(areasMapPath)) {
    console.error('❌ Missing areas mapping file. Run migrate-areas.ts first.');
    process.exit(1);
  }

  // Load mapping files (Salesforce ID → Attio ID)
  const agentsMap: Record<string, string> = JSON.parse(fs.readFileSync(agentsMapPath, 'utf-8'));
  const areasMap: Record<string, string> = JSON.parse(fs.readFileSync(areasMapPath, 'utf-8'));

  console.log(`Loaded ${Object.keys(agentsMap).length} agent mappings`);
  console.log(`Loaded ${Object.keys(areasMap).length} area mappings`);

  // Read Salesforce CSVs
  const dataDir = path.join(process.cwd(), 'data/salesforce');

  const accountsCsv = fs.readFileSync(path.join(dataDir, 'Account.csv'), 'utf-8');
  const accounts: AccountRow[] = parse(accountsCsv, { columns: true });

  const areasCsv = fs.readFileSync(path.join(dataDir, 'Area__c.csv'), 'utf-8');
  const areas: AreaRow[] = parse(areasCsv, { columns: true });

  const assignmentsCsv = fs.readFileSync(path.join(dataDir, 'Area_Assignment__c.csv'), 'utf-8');
  const assignments: AreaAssignmentRow[] = parse(assignmentsCsv, { columns: true });

  console.log(`Loaded ${accounts.length} accounts`);
  console.log(`Loaded ${areas.length} areas`);
  console.log(`Loaded ${assignments.length} area assignments`);
  console.log();

  // Build lookup maps
  // Agent Account IDs (we only want agents, not lenders)
  const agentAccountIds = new Set(
    accounts
      .filter(a => a.RecordTypeId === AGENT_RECORD_TYPE_ID)
      .map(a => a.Id)
  );
  console.log(`Found ${agentAccountIds.size} agent accounts`);

  // Lender Account IDs (for verification)
  const lenderAccountIds = new Set(
    accounts
      .filter(a => a.RecordTypeId === LENDER_RECORD_TYPE_ID)
      .map(a => a.Id)
  );
  console.log(`Found ${lenderAccountIds.size} lender accounts (will be skipped)`);

  // Area ID to name (for logging and state-level filtering)
  const areaIdToName: Record<string, string> = {};
  const areaIdToState: Record<string, string> = {};
  for (const area of areas) {
    areaIdToName[area.Id] = area.Name;
    areaIdToState[area.Id] = area.State__c;
  }

  // Filter to agent assignments only (exclude lenders and deleted)
  // Also exclude assignments to state-level areas (those were lender areas)
  const agentAssignments = assignments.filter(a => {
    if (a.IsDeleted === '1') return false;
    if (!agentAccountIds.has(a.Agent__c)) return false;

    // Check if this is a state-level area (name = state name)
    const areaName = areaIdToName[a.Area__c];
    const areaState = areaIdToState[a.Area__c];
    if (areaName === areaState) return false;  // Skip state-level area assignments

    return true;
  });

  const lenderAssignmentCount = assignments.filter(a =>
    a.IsDeleted === '0' && lenderAccountIds.has(a.Agent__c)
  ).length;

  console.log(`Found ${agentAssignments.length} agent area assignments`);
  console.log(`Skipping ${lenderAssignmentCount} lender assignments (handled via State.lenders)`);
  console.log();

  const mapping: Record<string, string> = {};
  // Track assignments by area for bidirectional update
  const assignmentsByArea: Record<string, string[]> = {};
  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const row of agentAssignments) {
    const areaName = areaIdToName[row.Area__c];

    // Get Attio IDs
    const attioAgentId = agentsMap[row.Agent__c];
    const attioAreaId = areasMap[row.Area__c];

    if (!attioAgentId) {
      skipped.push(`Assignment ${row.Id}: Agent ${row.Agent__c} not in Attio mapping`);
      continue;
    }
    if (!attioAreaId) {
      skipped.push(`Assignment ${row.Id}: Area ${row.Area__c} (${areaName}) not in Attio mapping`);
      continue;
    }

    try {
      // Create Area Assignment in Attio
      // Attio requires both target_object and target_record_id for record references
      const record = await attio.createRecord('area_assignments', {
        salesforce_id: row.Id,
        agent: { target_object: 'agents', target_record_id: attioAgentId },
        area: { target_object: 'areas', target_record_id: attioAreaId },
        aa_score: parseFloat(row.AA_Score__c) || 0,
        status: row.Status__c || 'Active',
      });

      const attioId = record.data.id.record_id;
      mapping[row.Id] = attioId;
      successCount++;

      // Track for bidirectional update
      if (!assignmentsByArea[row.Area__c]) {
        assignmentsByArea[row.Area__c] = [];
      }
      assignmentsByArea[row.Area__c].push(attioId);

      console.log(`✓ Created: ${areaName} assignment -> ${attioId}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error creating ${row.Id}:`, error instanceof Error ? error.message : error);
    }
  }

  // Save mapping file
  const mappingPath = path.join(mappingsDir, 'area_assignments.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  console.log();
  console.log(`✓ Successfully created: ${successCount} area assignments`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 5).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 5) {
      console.log(`   ... and ${skipped.length - 5} more`);
    }
  }
  console.log(`📁 Mapping saved to: ${mappingPath}`);

  // Phase 2: Update Area.area_assignments bidirectionally
  console.log();
  console.log('Updating Area.area_assignments (bidirectional references)...');
  console.log('-'.repeat(40));

  let areaUpdateSuccess = 0;
  let areaUpdateError = 0;

  for (const [sfAreaId, assignmentIds] of Object.entries(assignmentsByArea)) {
    const attioAreaId = areasMap[sfAreaId];
    const areaName = areaIdToName[sfAreaId];

    if (!attioAreaId) {
      console.error(`❌ Area ${sfAreaId} (${areaName}) not found in mapping`);
      areaUpdateError++;
      continue;
    }

    try {
      // Attio requires both target_object and target_record_id for record references
      await attio.updateRecord('areas', attioAreaId, {
        area_assignments: assignmentIds.map(id => ({ target_object: 'area_assignments', target_record_id: id }))
      });
      console.log(`✓ ${areaName}: Updated with ${assignmentIds.length} assignments`);
      areaUpdateSuccess++;
    } catch (error) {
      console.error(`❌ ${areaName}: ${error instanceof Error ? error.message : error}`);
      areaUpdateError++;
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Area Assignments created: ${successCount}`);
  console.log(`Area Assignments errored: ${errorCount}`);
  console.log(`Areas updated: ${areaUpdateSuccess}`);
  console.log(`Areas errored: ${areaUpdateError}`);
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

// Run migration
migrateAreaAssignments().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
