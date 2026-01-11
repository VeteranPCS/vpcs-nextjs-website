// scripts/migrate-agent-onboarding.ts
// Migrates agent onboarding records from Salesforce Opportunity to Attio pipeline
//
// Key behaviors:
// 1. Filters to Agent Onboarding RecordType (0124x000000Z7FyAAK)
// 2. Maps Salesforce stages to Attio stages (includes Internship)
// 3. Links to agent record
//
// Prerequisites:
// - Agents migrated (data/mappings/agents.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Agent Onboarding RecordTypeId from Salesforce
const AGENT_ONBOARDING_RECORD_TYPE_ID = '0124x000000Z7FyAAK';

// Stage mapping: Salesforce → Attio
const STAGE_MAP: Record<string, string> = {
  'New Application': 'New Application',
  'New': 'New Application',
  'Interviewing': 'Interviewing',
  'Phone Interview Complete': 'Interviewing',
  'Internship': 'Internship',
  'Waitlist': 'Waitlist',
  'Contract Sent': 'Contract Sent',
  'Contract Signed': 'Contract Signed',
  'Live on Website': 'Live on Website',
  'Added to Website': 'Live on Website',
  'Closed Won': 'Live on Website',
  'Closed - Lost': 'Closed Lost',
  'Closed Lost': 'Closed Lost',
};

interface OpportunityRow {
  Id: string;
  IsDeleted: string;
  RecordTypeId: string;
  AccountId: string;  // Agent account
  StageName: string;
  Application_Sent_Date__c: string;
  Application_Received_Date__c: string;
  Phone_Interview_Complete__c: string;
  Contract_Sent_At__c: string;
  Contract_Received_At__c: string;
  Headshot_Received_Date__c: string;
  Bio_Received__c: string;
  Added_to_Website_Date__c: string;
  Internship_Start_Date__c: string;
  Internship_End_Date__c: string;
  Internship_Location__c: string;
  Internship_Approved__c: string;
  Description: string;  // Notes
  CreatedDate: string;
}

async function migrateAgentOnboarding() {
  console.log('='.repeat(60));
  console.log('Migrate Agent Onboarding Pipeline');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const agentsMapPath = path.join(mappingsDir, 'agents.json');

  if (!fs.existsSync(agentsMapPath)) {
    console.error('❌ Missing agents mapping file. Run migrate-agents.ts first.');
    process.exit(1);
  }

  // Load mapping files (Salesforce ID → Attio ID)
  const agentsMap: Record<string, string> = JSON.parse(fs.readFileSync(agentsMapPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(agentsMap).length} agent mappings`);

  // Read Salesforce CSV
  const dataDir = path.join(process.cwd(), 'data/salesforce');
  const opportunitiesCsv = fs.readFileSync(path.join(dataDir, 'Opportunity.csv'), 'utf-8');
  const opportunities: OpportunityRow[] = parse(opportunitiesCsv, { columns: true });

  console.log(`Loaded ${opportunities.length} opportunities`);

  // Filter to agent onboarding only
  const agentOnboarding = opportunities.filter(o =>
    o.RecordTypeId === AGENT_ONBOARDING_RECORD_TYPE_ID && o.IsDeleted === '0'
  );
  console.log(`Found ${agentOnboarding.length} agent onboarding records`);

  // Count internships
  const internships = agentOnboarding.filter(o =>
    o.StageName === 'Internship' || o.Internship_Start_Date__c
  );
  console.log(`Including ${internships.length} internship records`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const opp of agentOnboarding) {
    // Get Attio agent ID
    const attioAgentId = agentsMap[opp.AccountId];
    if (!attioAgentId) {
      skipped.push(`${opp.Id}: Agent ${opp.AccountId} not in mapping`);
      continue;
    }

    // Map stage
    const attioStage = STAGE_MAP[opp.StageName] || 'New Application';

    try {
      // Create list entry (pipeline record)
      await attio.createListEntry('agent_onboarding', attioAgentId, {
        salesforce_id: opp.Id,
        application_sent_date: opp.Application_Sent_Date__c || null,
        application_received_date: opp.Application_Received_Date__c || null,
        phone_interview_complete: opp.Phone_Interview_Complete__c === '1' || opp.Phone_Interview_Complete__c === 'true',
        contract_sent_at: opp.Contract_Sent_At__c || null,
        contract_received_at: opp.Contract_Received_At__c || null,
        headshot_received_date: opp.Headshot_Received_Date__c || null,
        bio_received: opp.Bio_Received__c === '1' || opp.Bio_Received__c === 'true',
        added_to_website_date: opp.Added_to_Website_Date__c || null,
        internship_start_date: opp.Internship_Start_Date__c || null,
        internship_end_date: opp.Internship_End_Date__c || null,
        internship_location: opp.Internship_Location__c || null,
        internship_approved: opp.Internship_Approved__c === '1' || opp.Internship_Approved__c === 'true',
        notes: opp.Description || null,
      }, attioStage);

      successCount++;
      const isInternship = opp.StageName === 'Internship' ? ' [Internship]' : '';
      console.log(`✓ ${opp.Id} -> ${attioStage}${isInternship}`);
    } catch (error: any) {
      errorCount++;
      console.error(`❌ ${opp.Id}: ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} onboarding records`);
  console.log(`❌ Errors: ${errorCount}`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped: ${skipped.length}`);
    skipped.slice(0, 10).forEach(s => console.log(`   - ${s}`));
    if (skipped.length > 10) {
      console.log(`   ... and ${skipped.length - 10} more`);
    }
  }
}

// Run migration
migrateAgentOnboarding().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
