// scripts/v2/migrate-agent-onboarding-v2.ts
// Migrates agent onboarding records from cleaned relationships CSV to Attio pipeline
//
// Key insight: For Agent Opportunity records, the "CustomerContactId" field
// actually contains the AGENT's Contact.Id (the person being onboarded)
//
// Prerequisites:
// - Agents migrated (data/mappings/agents-by-contact.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface RelationshipRow {
  OpportunityId: string;
  OpportunityName: string;
  OpportunityType: string;
  Stage: string;
  IsClosed: string;
  IsWon: string;
  CustomerContactId: string;  // Actually the agent's Contact.Id
  CustomerName: string;       // Agent name
  CustomerEmail: string;      // Agent email
  AgentAccountId: string;
  AgentName: string;
  AgentEmail: string;
  LenderAccountId: string;
  LenderName: string;
  LenderEmail: string;
  SalePrice: string;
  Commission: string;
  PayoutAmount: string;
  PropertyAddress: string;
  DestinationCity: string;
  DestinationState: string;
  TransactionType: string;
  CloseDate: string;
  IsDeleted: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// Stage mapping for agent onboarding pipeline
// The available stages in Attio are limited - map unknown stages to New
const STAGE_MAP: Record<string, string> = {
  'New': 'New',
  'Interviewing': 'Interviewing',
  'Interview': 'Interviewing',
  'Interested': 'New',  // Stage doesn't exist, map to New
  'Closed Won': 'New',  // Stage doesn't exist, map to New
  'Closed - Lost': 'Closed Lost',
  'Closed Lost': 'Closed Lost',
  'Internship': 'Internship',
  'Waitlist': 'Waitlist',
};

async function migrateAgentOnboardingV2() {
  console.log('='.repeat(60));
  console.log('Migrate Agent Onboarding V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const agentsByContactPath = path.join(mappingsDir, 'agents-by-contact.json');

  if (!fs.existsSync(agentsByContactPath)) {
    console.error('❌ Missing agents-by-contact.json. Run migrate-agents-v2.ts first.');
    process.exit(1);
  }

  // Load mapping file (Contact.Id → Attio ID)
  const agentsByContact: Record<string, string> = JSON.parse(fs.readFileSync(agentsByContactPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(agentsByContact).length} agent-by-contact mappings`);
  console.log();

  // Read cleaned relationships CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-relationships.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const relationships: RelationshipRow[] = parse(csvData, { columns: true });

  // Filter to Agent Opportunities only
  const agentOnboarding = relationships.filter(r =>
    r.OpportunityType === 'Agent Opportunity' && r.IsDeleted === '0'
  );
  console.log(`Found ${agentOnboarding.length} agent onboarding records`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const opp of agentOnboarding) {
    // Look up agent by their ContactId (stored in CustomerContactId for onboarding)
    const attioAgentId = agentsByContact[opp.CustomerContactId];
    if (!attioAgentId) {
      skipped.push(`${opp.OpportunityName} (${opp.OpportunityId}): Agent ${opp.CustomerContactId} not in mapping`);
      continue;
    }

    // Map stage - only set if it's a valid stage (skip setting stage for unknown ones)
    const mappedStage = STAGE_MAP[opp.Stage];
    const attioStage = mappedStage === 'New' ? undefined : mappedStage;

    try {
      // Create list entry with agent as parent
      await attio.createListEntry('agent_onboarding', 'agents', attioAgentId, {
        salesforce_id: opp.OpportunityId,
      }, attioStage);

      successCount++;

      if (successCount % 100 === 0) {
        console.log(`   Processed ${successCount} records...`);
      }
    } catch (error: any) {
      errorCount++;
      errors.push(`${opp.OpportunityName} (${opp.OpportunityId}): ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} agent onboarding records`);
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
}

migrateAgentOnboardingV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
