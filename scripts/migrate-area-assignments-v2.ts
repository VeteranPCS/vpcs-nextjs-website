// scripts/v2/migrate-area-assignments-v2.ts
// Migrates area assignments from cleaned CSV to Attio
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-area_assignments.csv
// - Only contains agent assignments (lenders are assigned via State.lenders)
// - Uses v2 mapping files
//
// Prerequisites:
// - Agents must be migrated (data/mappings/agents.json)
// - Areas must be migrated (data/mappings/areas.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface CleanedAreaAssignmentRow {
  AssignmentId: string;
  AgentId: string;
  AgentName: string;
  AgentEmail: string;
  AreaId: string;
  AreaName: string;
  AreaState: string;
  Status: string;
  Score: string;
}

// Map status values
const STATUS_MAP: Record<string, string> = {
  'Active': 'Active',
  'Waitlist': 'Waitlist',
  'Inactive': 'Inactive',
};

async function migrateAreaAssignmentsV2() {
  console.log('='.repeat(60));
  console.log('Migrate Area Assignments V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const agentsMapPath = path.join(mappingsDir, 'agents.json');
  const areasMapPath = path.join(mappingsDir, 'areas.json');

  if (!fs.existsSync(agentsMapPath)) {
    console.error('❌ Missing agents mapping file. Run migrate-agents-v2.ts first.');
    process.exit(1);
  }
  if (!fs.existsSync(areasMapPath)) {
    console.error('❌ Missing areas mapping file. Run migrate-areas-v2.ts first.');
    process.exit(1);
  }

  // Load mapping files
  const agentsMap: Record<string, string> = JSON.parse(fs.readFileSync(agentsMapPath, 'utf-8'));
  const areasMap: Record<string, string> = JSON.parse(fs.readFileSync(areasMapPath, 'utf-8'));

  console.log(`Loaded ${Object.keys(agentsMap).length} agent mappings`);
  console.log(`Loaded ${Object.keys(areasMap).length} area mappings`);
  console.log();

  // Read cleaned CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-area_assignments.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const assignments: CleanedAreaAssignmentRow[] = parse(csvData, { columns: true });

  console.log(`Loaded ${assignments.length} area assignments from cleaned CSV`);
  console.log();

  // Track which areas have assignments for bidirectional update
  const areaAssignments: Record<string, string[]> = {};  // Area Attio ID → Assignment Attio IDs

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];
  const mapping: Record<string, string> = {};  // AssignmentId → Attio ID

  for (const assignment of assignments) {
    // Look up agent in mapping
    const attioAgentId = agentsMap[assignment.AgentId];
    if (!attioAgentId) {
      skipped.push(`${assignment.AgentName} → ${assignment.AreaName}: Agent not in mapping`);
      continue;
    }

    // Look up area in mapping
    const attioAreaId = areasMap[assignment.AreaId];
    if (!attioAreaId) {
      skipped.push(`${assignment.AgentName} → ${assignment.AreaName}: Area not in mapping`);
      continue;
    }

    const status = STATUS_MAP[assignment.Status] || 'Active';
    const score = assignment.Score ? parseFloat(assignment.Score) : null;

    try {
      const record = await attio.createRecord('area_assignments', {
        salesforce_id: assignment.AssignmentId,
        agent: { target_object: 'agents', target_record_id: attioAgentId },
        area: { target_object: 'areas', target_record_id: attioAreaId },
        status: status,
        aa_score: score,
      });

      const attioId = record.data.id.record_id;
      mapping[assignment.AssignmentId] = attioId;

      // Track for bidirectional update
      if (!areaAssignments[attioAreaId]) {
        areaAssignments[attioAreaId] = [];
      }
      areaAssignments[attioAreaId].push(attioId);

      successCount++;

      if (successCount % 50 === 0) {
        console.log(`   Processed ${successCount} assignments...`);
      }
    } catch (error: any) {
      errorCount++;
      errors.push(`${assignment.AgentName} → ${assignment.AreaName}: ${error.message}`);
    }
  }

  // Update Areas with bidirectional agent_assignments references
  console.log();
  console.log('Updating Area.agent_assignments references...');
  console.log('-'.repeat(40));

  let areaUpdateCount = 0;
  let areaErrorCount = 0;

  for (const [areaAttioId, assignmentIds] of Object.entries(areaAssignments)) {
    try {
      await attio.updateRecord('areas', areaAttioId, {
        agent_assignments: assignmentIds.map(id => ({
          target_object: 'area_assignments',
          target_record_id: id
        }))
      });
      areaUpdateCount++;
    } catch (error: any) {
      areaErrorCount++;
      errors.push(`Area ${areaAttioId}: ${error.message}`);
    }
  }

  console.log(`✓ Updated ${areaUpdateCount} areas with agent_assignments`);
  if (areaErrorCount > 0) {
    console.log(`❌ ${areaErrorCount} area update errors`);
  }

  // Save mapping
  const mappingPath = path.join(mappingsDir, 'area_assignments.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} area assignments`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 5).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 5) console.log(`   ... and ${skipped.length - 5} more`);
  }
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => console.log(`   ❌ ${e}`));
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }
  console.log();
  console.log(`📁 Mapping saved to: ${mappingPath}`);
}

migrateAreaAssignmentsV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
