// scripts/migrate-lender-onboarding.ts
// Migrates lender onboarding records from Salesforce Opportunity to Attio pipeline
//
// Key behaviors:
// 1. Filters to Lender Onboarding RecordType (0124x000000ZGHrAAO)
// 2. Maps Salesforce stages to Attio stages (includes Internship)
// 3. Links to lender record
//
// Prerequisites:
// - Lenders migrated (data/mappings/lenders.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Lender Onboarding RecordTypeId from Salesforce (15-char version as exported in CSV)
const LENDER_ONBOARDING_RECORD_TYPE_ID = '0124x000000ZGHr';

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
  AccountId: string;  // Lender account
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

async function migrateLenderOnboarding() {
  console.log('='.repeat(60));
  console.log('Migrate Lender Onboarding Pipeline');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const lendersMapPath = path.join(mappingsDir, 'lenders.json');

  if (!fs.existsSync(lendersMapPath)) {
    console.error('❌ Missing lenders mapping file. Run migrate-lenders.ts first.');
    process.exit(1);
  }

  // Load mapping files (Salesforce ID → Attio ID)
  const lendersMap: Record<string, string> = JSON.parse(fs.readFileSync(lendersMapPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(lendersMap).length} lender mappings`);

  // Read Salesforce CSV
  const dataDir = path.join(process.cwd(), 'data/salesforce');
  const opportunitiesCsv = fs.readFileSync(path.join(dataDir, 'Opportunity.csv'), 'utf-8');
  const opportunities: OpportunityRow[] = parse(opportunitiesCsv, { columns: true });

  console.log(`Loaded ${opportunities.length} opportunities`);

  // Filter to lender onboarding only
  const lenderOnboarding = opportunities.filter(o =>
    o.RecordTypeId === LENDER_ONBOARDING_RECORD_TYPE_ID && o.IsDeleted === '0'
  );
  console.log(`Found ${lenderOnboarding.length} lender onboarding records`);

  // Count internships
  const internships = lenderOnboarding.filter(o =>
    o.StageName === 'Internship' || o.Internship_Start_Date__c
  );
  console.log(`Including ${internships.length} internship records`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const opp of lenderOnboarding) {
    // Get Attio lender ID
    const attioLenderId = lendersMap[opp.AccountId];
    if (!attioLenderId) {
      skipped.push(`${opp.Id}: Lender ${opp.AccountId} not in mapping`);
      continue;
    }

    // Map stage
    const attioStage = STAGE_MAP[opp.StageName] || 'New Application';

    try {
      // Create list entry (pipeline record)
      // Note: Attio requires parent_object in addition to parent_record_id
      await attio.createListEntry('lender_onboarding', 'lenders', attioLenderId, {
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
migrateLenderOnboarding().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
