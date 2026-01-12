// scripts/migrate-customer-deals.ts
// Migrates customer deals from Salesforce Opportunity to Attio pipeline
//
// Key behaviors:
// 1. Filters to Customer Deal RecordType (0124x000000Z7G3AAK)
// 2. Maps Salesforce stages to Attio stages
// 3. Links to customer, agent, lender, and area
//
// Prerequisites:
// - Customers migrated (data/mappings/customers.json)
// - Agents migrated (data/mappings/agents.json)
// - Lenders migrated (data/mappings/lenders.json)
// - Areas migrated (data/mappings/areas.json)

import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Customer Deal RecordTypeId from Salesforce (15-char version as exported in CSV)
const CUSTOMER_DEAL_RECORD_TYPE_ID = '0124x000000Z7G3';

// Stage mapping: Salesforce → Attio
const STAGE_MAP: Record<string, string> = {
  'New': 'New Lead',
  'Actively Looking': 'Tracking <1mo',
  'Tracking <1mo': 'Tracking <1mo',
  'Tracking 1-2mo': 'Tracking 1-2mo',
  'Tracking 3-6mo': 'Tracking 3-6mo',
  'Tracking 6+mo': 'Tracking 6+mo',
  'Under Contract': 'Under Contract',
  'Transaction Closed': 'Transaction Closed',
  'Paid - Complete': 'Paid Complete',
  'Closed Won': 'Paid Complete',
  'Closed - Lost': 'Closed Lost',
  'Closed Lost': 'Closed Lost',
};

interface OpportunityRow {
  Id: string;
  IsDeleted: string;
  RecordTypeId: string;
  AccountId: string;  // Customer
  Agent__c: string;
  Lender__c: string;
  Area__c: string;
  StageName: string;
  Sale_Price__c: string;
  Closing_Commission__c: string;
  Payout_Amount__c: string;
  Property_Address__c: string;
  Buying_andor_Selling__c: string;
  Expected_Close_Date__c: string;
  Actual_Close_Date__c: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// Determine deal type from Salesforce field
function getDealType(buyingOrSelling: string | undefined): string {
  if (!buyingOrSelling) return 'Buying';
  const normalized = buyingOrSelling.toLowerCase();
  if (normalized.includes('both')) return 'Both';
  if (normalized.includes('sell')) return 'Selling';
  return 'Buying';
}

async function migrateCustomerDeals() {
  console.log('='.repeat(60));
  console.log('Migrate Customer Deals Pipeline');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const customersMapPath = path.join(mappingsDir, 'customers.json');
  const agentsMapPath = path.join(mappingsDir, 'agents.json');
  const lendersMapPath = path.join(mappingsDir, 'lenders.json');
  const areasMapPath = path.join(mappingsDir, 'areas.json');

  if (!fs.existsSync(customersMapPath)) {
    console.error('❌ Missing customers mapping file. Run migrate-customers.ts first.');
    process.exit(1);
  }

  // Load mapping files (Salesforce ID → Attio ID)
  const customersMap: Record<string, string> = JSON.parse(fs.readFileSync(customersMapPath, 'utf-8'));
  const agentsMap: Record<string, string> = fs.existsSync(agentsMapPath)
    ? JSON.parse(fs.readFileSync(agentsMapPath, 'utf-8'))
    : {};
  const lendersMap: Record<string, string> = fs.existsSync(lendersMapPath)
    ? JSON.parse(fs.readFileSync(lendersMapPath, 'utf-8'))
    : {};
  const areasMap: Record<string, string> = fs.existsSync(areasMapPath)
    ? JSON.parse(fs.readFileSync(areasMapPath, 'utf-8'))
    : {};

  console.log(`Loaded ${Object.keys(customersMap).length} customer mappings`);
  console.log(`Loaded ${Object.keys(agentsMap).length} agent mappings`);
  console.log(`Loaded ${Object.keys(lendersMap).length} lender mappings`);
  console.log(`Loaded ${Object.keys(areasMap).length} area mappings`);

  // Read Salesforce CSV
  const dataDir = path.join(process.cwd(), 'data/salesforce');
  const opportunitiesCsv = fs.readFileSync(path.join(dataDir, 'Opportunity.csv'), 'utf-8');
  const opportunities: OpportunityRow[] = parse(opportunitiesCsv, { columns: true });

  console.log(`Loaded ${opportunities.length} opportunities`);

  // Filter to customer deals only
  const customerDeals = opportunities.filter(o =>
    o.RecordTypeId === CUSTOMER_DEAL_RECORD_TYPE_ID && o.IsDeleted === '0'
  );
  console.log(`Found ${customerDeals.length} customer deals`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];

  for (const opp of customerDeals) {
    // Get Attio customer ID
    const attioCustomerId = customersMap[opp.AccountId];
    if (!attioCustomerId) {
      skipped.push(`${opp.Id}: Customer ${opp.AccountId} not in mapping`);
      continue;
    }

    // Map stage
    const attioStage = STAGE_MAP[opp.StageName] || 'New Lead';

    // Get optional references
    const attioAgentId = opp.Agent__c ? agentsMap[opp.Agent__c] : null;
    const attioLenderId = opp.Lender__c ? lendersMap[opp.Lender__c] : null;
    const attioAreaId = opp.Area__c ? areasMap[opp.Area__c] : null;

    try {
      // Create list entry (pipeline record)
      await attio.createListEntry('customer_deals', attioCustomerId, {
        salesforce_id: opp.Id,
        deal_type: getDealType(opp.Buying_andor_Selling__c),
        sale_price: opp.Sale_Price__c ? parseFloat(opp.Sale_Price__c) : null,
        agent_commission: opp.Closing_Commission__c ? parseFloat(opp.Closing_Commission__c) : null,
        payout_amount: opp.Payout_Amount__c ? parseFloat(opp.Payout_Amount__c) : null,
        property_address: opp.Property_Address__c || null,
        expected_close_date: opp.Expected_Close_Date__c || null,
        actual_close_date: opp.Actual_Close_Date__c || null,
        ...(attioAgentId && { agent: { target_record_id: attioAgentId } }),
        ...(attioLenderId && { lender: { target_record_id: attioLenderId } }),
        ...(attioAreaId && { area: { target_record_id: attioAreaId } }),
      }, attioStage);

      successCount++;
      console.log(`✓ Deal ${opp.Id} -> ${attioStage}`);
    } catch (error: any) {
      errorCount++;
      console.error(`❌ Deal ${opp.Id}: ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} deals`);
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
migrateCustomerDeals().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
