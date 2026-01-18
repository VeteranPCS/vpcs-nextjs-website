// scripts/v2/migrate-customer-deals-v2.ts
// Migrates customer deals from cleaned relationships CSV to Attio pipeline
//
// Key differences from v1:
// - Reads from data/cleaned/data-cleaned-relationships.csv
// - Filters to OpportunityType = "Customer Opportunity"
// - Uses CustomerContactId (Contact.Id) to look up customer
// - Uses AgentAccountId/LenderAccountId (Account.Id) for agent/lender
//
// Prerequisites:
// - Customers migrated (data/mappings/customers-by-contact.json)
// - Agents migrated (data/mappings/agents.json)
// - Lenders migrated (data/mappings/lenders.json)

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
  CustomerContactId: string;
  CustomerName: string;
  CustomerEmail: string;
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

// Stage mapping: Salesforce → Attio
const STAGE_MAP: Record<string, string> = {
  'New': 'New Lead',
  'Actively Looking': 'Tracking <1mo',
  'Tracking': 'Tracking <1mo',
  'Tracking <1': 'Tracking <1mo',
  'Tracking 1-2': 'Tracking 1-2mo',
  'Tracking 3-6': 'Tracking 3-6mo',
  'Tracking 6+': 'Tracking 6+mo',
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
  'Interviewing': 'New Lead',
  'Waitlist': 'New Lead',
  'Finalizing': 'Under Contract',
};

function getDealType(transactionType: string | undefined): string {
  if (!transactionType) return 'Buying';
  const normalized = transactionType.toLowerCase();
  if (normalized.includes('both')) return 'Both';
  if (normalized.includes('sell')) return 'Selling';
  return 'Buying';
}

async function migrateCustomerDealsV2() {
  console.log('='.repeat(60));
  console.log('Migrate Customer Deals V2 (from cleaned data)');
  console.log('='.repeat(60));
  console.log();

  const { attio } = await import('../lib/attio');

  // Check for required mapping files
  const mappingsDir = path.join(process.cwd(), 'data/mappings');
  const customersByContactPath = path.join(mappingsDir, 'customers-by-contact.json');
  const agentsMapPath = path.join(mappingsDir, 'agents.json');
  const lendersMapPath = path.join(mappingsDir, 'lenders.json');

  if (!fs.existsSync(customersByContactPath)) {
    console.error('❌ Missing customers-by-contact.json. Run migrate-customers-v2.ts first.');
    process.exit(1);
  }

  // Load mapping files
  const customersByContact: Record<string, string> = JSON.parse(fs.readFileSync(customersByContactPath, 'utf-8'));
  const agentsMap: Record<string, string> = fs.existsSync(agentsMapPath)
    ? JSON.parse(fs.readFileSync(agentsMapPath, 'utf-8'))
    : {};
  const lendersMap: Record<string, string> = fs.existsSync(lendersMapPath)
    ? JSON.parse(fs.readFileSync(lendersMapPath, 'utf-8'))
    : {};

  console.log(`Loaded ${Object.keys(customersByContact).length} customer-by-contact mappings`);
  console.log(`Loaded ${Object.keys(agentsMap).length} agent mappings`);
  console.log(`Loaded ${Object.keys(lendersMap).length} lender mappings`);
  console.log();

  // Read cleaned relationships CSV
  const csvPath = path.join(process.cwd(), 'data/cleaned/data-cleaned-relationships.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const relationships: RelationshipRow[] = parse(csvData, { columns: true });

  // Filter to Customer Opportunities only
  const customerDeals = relationships.filter(r =>
    r.OpportunityType === 'Customer Opportunity' && r.IsDeleted === '0'
  );
  console.log(`Found ${customerDeals.length} customer deals`);
  console.log();

  let successCount = 0;
  let errorCount = 0;
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const deal of customerDeals) {
    // Look up customer by ContactId
    const attioCustomerId = customersByContact[deal.CustomerContactId];
    if (!attioCustomerId) {
      skipped.push(`${deal.OpportunityName} (${deal.OpportunityId}): Customer ${deal.CustomerContactId} not in mapping`);
      continue;
    }

    // Map stage
    const attioStage = STAGE_MAP[deal.Stage] || 'New Lead';

    // Get optional references
    const attioAgentId = deal.AgentAccountId ? agentsMap[deal.AgentAccountId] : null;
    const attioLenderId = deal.LenderAccountId ? lendersMap[deal.LenderAccountId] : null;

    try {
      await attio.createListEntry('customer_deals', 'customers', attioCustomerId, {
        salesforce_id: deal.OpportunityId,
        deal_name: deal.OpportunityName || null,
        deal_type: getDealType(deal.TransactionType),
        destination_state: deal.DestinationState || null,
        sale_price: deal.SalePrice ? parseFloat(deal.SalePrice) : null,
        commission_percent: deal.Commission ? parseFloat(deal.Commission) : null,
        payout_amount: deal.PayoutAmount ? parseFloat(deal.PayoutAmount) : null,
        move_in_bonus: deal.PayoutAmount ? parseFloat(deal.PayoutAmount) : null,
        property_address: deal.PropertyAddress || null,
        actual_close_date: deal.CloseDate || null,
        ...(attioAgentId && { agent: { target_object: 'agents', target_record_id: attioAgentId } }),
        ...(attioLenderId && { lender: { target_object: 'lenders', target_record_id: attioLenderId } }),
      }, attioStage);

      successCount++;

      if (successCount % 100 === 0) {
        console.log(`   Processed ${successCount} deals...`);
      }
    } catch (error: any) {
      errorCount++;
      errors.push(`${deal.OpportunityName} (${deal.OpportunityId}): ${error.message}`);
    }
  }

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Successfully created: ${successCount} customer deals`);
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

migrateCustomerDealsV2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
