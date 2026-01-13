// scripts/delete-customer-deals.ts
// Deletes all existing customer deal entries from Attio
// Used to clean up before re-running migration with fixed data
//
// Usage: npx tsx scripts/delete-customer-deals.ts

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function deleteCustomerDeals() {
  console.log('='.repeat(60));
  console.log('Delete Customer Deals from Attio');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Query entries (get up to 100 at a time)
    const entries = await attio.queryListEntries('customer_deals', { limit: 100 });

    if (entries.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Found ${entries.length} entries to delete...`);

    for (const entry of entries) {
      const entryId = entry.id?.entry_id;
      if (!entryId) {
        console.warn(`⚠️ Entry missing ID, skipping`);
        continue;
      }

      try {
        await attio.deleteListEntry('customer_deals', entryId);
        totalDeleted++;

        // Log progress every 50 deletions
        if (totalDeleted % 50 === 0) {
          console.log(`Deleted ${totalDeleted} entries...`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to delete ${entryId}: ${error.message}`);
      }
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('DELETION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Total deleted: ${totalDeleted} entries`);
}

// Run deletion
deleteCustomerDeals().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
