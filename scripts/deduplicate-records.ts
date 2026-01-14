// scripts/deduplicate-records.ts
//
// Removes duplicate customers and customer_deals that were created
// from running migration scripts multiple times.
//
// For each duplicate salesforce_id:
// - Keeps the NEWEST record (most recent created_at)
// - Deletes the older duplicates
//
// Usage:
//   npx tsx scripts/deduplicate-records.ts --dry-run    # Preview without deleting
//   npx tsx scripts/deduplicate-records.ts              # Actually delete duplicates

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const DRY_RUN = process.argv.includes('--dry-run');

async function attioRequest(urlPath: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${urlPath}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Attio API error: ${res.status} ${error}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) {
    return null;
  }

  return res.json();
}

// =============================================================================
// FETCH ALL RECORDS
// =============================================================================

interface RecordInfo {
  id: string;
  salesforce_id: string | null;
  created_at: string;
  name: string | null;
}

async function getAllRecords(objectSlug: string): Promise<RecordInfo[]> {
  const all: RecordInfo[] = [];
  let offset = 0;
  const limit = 500;

  console.log(`  Fetching ${objectSlug} records...`);

  while (true) {
    const res = await attioRequest(`/objects/${objectSlug}/records/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const records = res.data || [];
    for (const r of records) {
      all.push({
        id: r.id?.record_id,
        salesforce_id: r.values?.salesforce_id?.[0]?.value || null,
        created_at: r.values?.created_at?.[0]?.value || r.created_at || '',
        name: r.values?.name?.[0]?.value || null,
      });
    }

    if (records.length < limit) break;
    offset += limit;
    console.log(`    Fetched ${all.length}...`);
  }

  console.log(`    Total: ${all.length} records`);
  return all;
}

interface EntryInfo {
  id: string;
  salesforce_id: string | null;
  created_at: string;
  deal_name: string | null;
}

async function getAllListEntries(listSlug: string): Promise<EntryInfo[]> {
  const all: EntryInfo[] = [];
  let offset = 0;
  const limit = 500;

  console.log(`  Fetching ${listSlug} entries...`);

  while (true) {
    const res = await attioRequest(`/lists/${listSlug}/entries/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const entries = res.data || [];
    for (const e of entries) {
      all.push({
        id: e.id?.entry_id,
        salesforce_id: e.entry_values?.salesforce_id?.[0]?.value || null,
        created_at: e.created_at || '',
        deal_name: e.entry_values?.deal_name?.[0]?.value || null,
      });
    }

    if (entries.length < limit) break;
    offset += limit;
    console.log(`    Fetched ${all.length}...`);
  }

  console.log(`    Total: ${all.length} entries`);
  return all;
}

// =============================================================================
// FIND DUPLICATES
// =============================================================================

function findDuplicates<T extends { salesforce_id: string | null; created_at: string }>(
  records: T[]
): { keep: T; delete: T[] }[] {
  // Group by salesforce_id
  const groups: Record<string, T[]> = {};

  for (const record of records) {
    if (!record.salesforce_id) continue;
    if (!groups[record.salesforce_id]) {
      groups[record.salesforce_id] = [];
    }
    groups[record.salesforce_id].push(record);
  }

  // Find groups with duplicates
  const duplicates: { keep: T; delete: T[] }[] = [];

  for (const [sfId, group] of Object.entries(groups)) {
    if (group.length <= 1) continue;

    // Sort by created_at descending (newest first)
    group.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Newest first
    });

    // Keep the newest, delete the rest
    const [keep, ...toDelete] = group;
    duplicates.push({ keep, delete: toDelete });
  }

  return duplicates;
}

// =============================================================================
// DELETE RECORDS
// =============================================================================

async function deleteRecord(objectSlug: string, recordId: string): Promise<boolean> {
  try {
    await attioRequest(`/objects/${objectSlug}/records/${recordId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error: any) {
    console.error(`    Error deleting ${recordId}: ${error.message}`);
    return false;
  }
}

async function deleteListEntry(listSlug: string, entryId: string): Promise<boolean> {
  try {
    await attioRequest(`/lists/${listSlug}/entries/${entryId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error: any) {
    console.error(`    Error deleting ${entryId}: ${error.message}`);
    return false;
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function deduplicateCustomers() {
  console.log('\n' + '='.repeat(60));
  console.log('DEDUPLICATING CUSTOMERS');
  console.log('='.repeat(60));

  const records = await getAllRecords('customers');
  const duplicates = findDuplicates(records);

  console.log(`\n  Found ${duplicates.length} salesforce_ids with duplicates`);

  const totalToDelete = duplicates.reduce((sum, d) => sum + d.delete.length, 0);
  console.log(`  Total records to delete: ${totalToDelete}`);

  if (duplicates.length === 0) {
    console.log('  ✓ No duplicates to remove');
    return { deleted: 0, errors: 0 };
  }

  // Show sample
  console.log('\n  Sample duplicates:');
  for (const dup of duplicates.slice(0, 3)) {
    console.log(`    SF ID: ${dup.keep.salesforce_id}`);
    console.log(`      KEEP: ${dup.keep.name} (created: ${dup.keep.created_at.slice(0, 10)})`);
    for (const d of dup.delete) {
      console.log(`      DELETE: ${d.name} (created: ${d.created_at.slice(0, 10)})`);
    }
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would delete these records. Run without --dry-run to execute.');
    return { deleted: 0, errors: 0 };
  }

  // Delete duplicates
  console.log('\n  Deleting duplicates...');
  let deleted = 0;
  let errors = 0;

  for (const dup of duplicates) {
    for (const record of dup.delete) {
      const success = await deleteRecord('customers', record.id);
      if (success) {
        deleted++;
        if (deleted % 100 === 0) {
          console.log(`    Deleted ${deleted}/${totalToDelete}...`);
        }
      } else {
        errors++;
      }
    }
  }

  console.log(`\n  ✓ Deleted: ${deleted}`);
  if (errors > 0) console.log(`  ✗ Errors: ${errors}`);

  return { deleted, errors };
}

async function deduplicateDeals() {
  console.log('\n' + '='.repeat(60));
  console.log('DEDUPLICATING CUSTOMER DEALS');
  console.log('='.repeat(60));

  const entries = await getAllListEntries('customer_deals');
  const duplicates = findDuplicates(entries);

  console.log(`\n  Found ${duplicates.length} salesforce_ids with duplicates`);

  const totalToDelete = duplicates.reduce((sum, d) => sum + d.delete.length, 0);
  console.log(`  Total entries to delete: ${totalToDelete}`);

  if (duplicates.length === 0) {
    console.log('  ✓ No duplicates to remove');
    return { deleted: 0, errors: 0 };
  }

  // Show sample
  console.log('\n  Sample duplicates:');
  for (const dup of duplicates.slice(0, 3)) {
    console.log(`    SF ID: ${dup.keep.salesforce_id}`);
    console.log(`      KEEP: ${dup.keep.deal_name} (created: ${dup.keep.created_at.slice(0, 10)})`);
    for (const d of dup.delete) {
      console.log(`      DELETE: ${d.deal_name} (created: ${d.created_at.slice(0, 10)})`);
    }
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would delete these entries. Run without --dry-run to execute.');
    return { deleted: 0, errors: 0 };
  }

  // Delete duplicates
  console.log('\n  Deleting duplicates...');
  let deleted = 0;
  let errors = 0;

  for (const dup of duplicates) {
    for (const entry of dup.delete) {
      const success = await deleteListEntry('customer_deals', entry.id);
      if (success) {
        deleted++;
        if (deleted % 100 === 0) {
          console.log(`    Deleted ${deleted}/${totalToDelete}...`);
        }
      } else {
        errors++;
      }
    }
  }

  console.log(`\n  ✓ Deleted: ${deleted}`);
  if (errors > 0) console.log(`  ✗ Errors: ${errors}`);

  return { deleted, errors };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Deduplicate Migration Records');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***');
  }

  const customerResult = await deduplicateCustomers();
  const dealResult = await deduplicateDeals();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No records were deleted.');
    console.log('Run without --dry-run to execute deletions.');
  } else {
    console.log(`\nCustomers: ${customerResult.deleted} deleted, ${customerResult.errors} errors`);
    console.log(`Deals: ${dealResult.deleted} deleted, ${dealResult.errors} errors`);

    if (customerResult.errors === 0 && dealResult.errors === 0) {
      console.log('\n✅ Deduplication complete!');
    } else {
      console.log('\n⚠️  Deduplication completed with some errors');
    }
  }
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
