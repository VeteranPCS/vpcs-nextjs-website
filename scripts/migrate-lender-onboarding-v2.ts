// scripts/v2/migrate-lender-onboarding-v2.ts
// Migrates lender onboarding records from cleaned relationships CSV to Attio pipeline
//
// Key insight: For Lender Opportunity records, the "CustomerContactId" field
// actually contains the LENDER's Contact.Id (the person being onboarded)
//
// Prerequisites:
// - Lenders migrated (data/mappings/lenders-by-contact.json)

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
  CustomerContactId: string;  // Actually the lender's Contact.Id
  CustomerName: string;       // Lender name
  CustomerEmail: string;      // Lender email
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

// Stage mapping for lender onboarding pipeline
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

async function migrateLenderOnboardingV2() {
  console.log('='.repeat(60));
  console.log('Migrate Lender Onboarding V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const lendersByContactPath = path.join(mappingsDir, 'lenders-by-contact.json');

  if (!fs.existsSync(lendersByContactPath)) {
    console.error('❌ Missing lenders-by-contact.json. Run migrate-lenders-v2.ts first.');
    process.exit(1);
  }

  // Load mapping file (Contact.Id → Attio ID)
  const lendersByContact: Record<string, string> = JSON.parse(fs.readFileSync(lendersByContactPath, 'utf-8'));
  console.log(`Loaded ${Object.keys(lendersByContact).length} lender-by-contact mappings`);
  console.log();

  // Read cleaned relationships CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-relationships.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const relationships: RelationshipRow[] = parse(csvData, { columns: true });

  // Filter to Lender Opportunities only
  const lenderOnboarding = relationships.filter(r =>
    r.OpportunityType === 'Lender Opportunity' && r.IsDeleted === '0'
  );
  console.log(`Found ${lenderOnboarding.length} lender onboarding records`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const opp of lenderOnboarding) {
    // Look up lender by their ContactId (stored in CustomerContactId for onboarding)
    const attioLenderId = lendersByContact[opp.CustomerContactId];
    if (!attioLenderId) {
      skipped.push(`${opp.OpportunityName} (${opp.OpportunityId}): Lender ${opp.CustomerContactId} not in mapping`);
      continue;
    }

    // Map stage - only set if it's a valid stage (skip setting stage for unknown ones)
    const mappedStage = STAGE_MAP[opp.Stage];
    const attioStage = mappedStage === 'New' ? undefined : mappedStage;

    try {
      // Create list entry with lender as parent
      await attio.createListEntry('lender_onboarding', 'lenders', attioLenderId, {
        salesforce_id: opp.OpportunityId,
      }, attioStage);

      successCount++;

      if (successCount % 50 === 0) {
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
  console.log(`✓ Successfully created: ${successCount} lender onboarding records`);
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

migrateLenderOnboardingV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
