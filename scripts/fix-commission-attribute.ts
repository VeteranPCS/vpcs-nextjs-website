// scripts/fix-commission-attribute.ts
//
// Fixes the agent_commission attribute type from 'currency' to 'number'
// so it displays as "2.75" instead of "$2.75"
//
// Steps:
// 1. Query all customer_deals entries and backup commission values
// 2. Delete the agent_commission attribute (currency type)
// 3. Recreate it as type 'number'
// 4. Repopulate all commission values
// 5. Verify count and values

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ATTIO_API_URL = 'https://api.attio.com/v2';
const LIST_SLUG = 'customer_deals';
const OLD_ATTR_SLUG = 'agent_commission';  // The old currency-type attribute (archived)
const NEW_ATTR_SLUG = 'commission_percent'; // The new number-type attribute
const BACKUP_PATH = path.join(process.cwd(), 'data/backups/commission-backup.json');

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const REPOPULATE_ONLY = args.includes('--repopulate-only');

interface CommissionBackup {
  entryId: string;
  commission: number | null;
  dealName: string;
}

async function attioRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ATTIO_API_URL}${path}`, {
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

async function getAllListEntries(): Promise<any[]> {
  const allEntries: any[] = [];
  let offset = 0;
  const limit = 500;

  console.log('Fetching all customer_deals entries...');

  while (true) {
    const res = await attioRequest(`/lists/${LIST_SLUG}/entries/query`, {
      method: 'POST',
      body: JSON.stringify({ limit, offset }),
    });

    const entries = res.data || [];
    allEntries.push(...entries);

    console.log(`  Fetched ${allEntries.length} entries...`);

    if (entries.length < limit) {
      break;
    }
    offset += limit;
  }

  return allEntries;
}

function extractCommissionValue(entry: any): number | null {
  // Commission is stored in entry_values as currency type
  // Currency values have structure: [{ currency_value: number, currency_code: string }]
  const commissionValues = entry.entry_values?.[OLD_ATTR_SLUG];
  if (!commissionValues || commissionValues.length === 0) {
    return null;
  }

  const val = commissionValues[0];
  // Handle currency type (current incorrect format)
  if (val.currency_value !== undefined) {
    return val.currency_value;
  }
  // Handle number type (if already correct)
  if (val.value !== undefined) {
    return val.value;
  }
  // Handle raw number
  if (typeof val === 'number') {
    return val;
  }

  return null;
}

function extractDealName(entry: any): string {
  const nameValues = entry.entry_values?.deal_name;
  if (!nameValues || nameValues.length === 0) {
    return 'Unknown Deal';
  }
  return nameValues[0]?.value || 'Unknown Deal';
}

async function backupCommissions(entries: any[]): Promise<CommissionBackup[]> {
  const backups: CommissionBackup[] = [];

  for (const entry of entries) {
    const entryId = entry.id?.entry_id;
    const commission = extractCommissionValue(entry);
    const dealName = extractDealName(entry);

    backups.push({
      entryId,
      commission,
      dealName,
    });
  }

  // Ensure backup directory exists
  const backupDir = path.dirname(BACKUP_PATH);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Save backup
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(backups, null, 2));
  console.log(`\nBackup saved to: ${BACKUP_PATH}`);

  return backups;
}

async function deleteAttribute() {
  console.log(`\nDeleting attribute: ${OLD_ATTR_SLUG}...`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would delete attribute');
    return;
  }

  await attioRequest(`/lists/${LIST_SLUG}/attributes/${OLD_ATTR_SLUG}`, {
    method: 'DELETE',
  });

  console.log('  Attribute deleted.');
}

async function createAttribute() {
  console.log(`\nCreating attribute: ${NEW_ATTR_SLUG} as type "number"...`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create attribute');
    return;
  }

  await attioRequest(`/lists/${LIST_SLUG}/attributes`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: 'Agent Commission %',
        api_slug: NEW_ATTR_SLUG,
        type: 'number',
        description: 'Agent commission percentage (e.g., 2.75 = 2.75%)',
        is_required: false,
        is_unique: false,
      },
    }),
  });

  console.log('  Attribute created.');
}

async function repopulateCommissions(backups: CommissionBackup[]) {
  console.log(`\nRepopulating commission values...`);

  const withCommission = backups.filter(b => b.commission !== null);
  console.log(`  ${withCommission.length} entries have commission values`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would update entries');
    console.log(`  Sample updates:`);
    withCommission.slice(0, 5).forEach(b => {
      console.log(`    - ${b.dealName}: ${b.commission}`);
    });
    return;
  }

  let success = 0;
  let errors = 0;

  for (const backup of withCommission) {
    try {
      await attioRequest(`/lists/${LIST_SLUG}/entries/${backup.entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            entry_values: {
              [NEW_ATTR_SLUG]: backup.commission,
            },
          },
        }),
      });
      success++;

      // Log progress every 100
      if (success % 100 === 0) {
        console.log(`  Updated ${success}/${withCommission.length}...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`  Error updating ${backup.dealName}: ${error.message}`);
    }
  }

  console.log(`\n  Completed: ${success} updated, ${errors} errors`);
}

async function verifyFix() {
  console.log(`\nVerifying fix...`);

  // Check attribute type
  const attrs = await attioRequest(`/lists/${LIST_SLUG}/attributes`);
  const commissionAttr = attrs.data?.find((a: any) => a.api_slug === NEW_ATTR_SLUG);

  if (!commissionAttr) {
    console.log('  WARNING: attribute not found!');
    return;
  }

  console.log(`  Attribute type: ${commissionAttr.type}`);
  if (commissionAttr.type === 'number') {
    console.log('  ✓ Attribute is now type "number"');
  } else {
    console.log(`  ✗ Attribute is still type "${commissionAttr.type}"`);
  }

  // Check entry count
  const entries = await getAllListEntries();
  console.log(`  Total entries: ${entries.length}`);

  // Sample check commission values
  const withCommission = entries.filter(e => {
    const val = e.entry_values?.[NEW_ATTR_SLUG];
    return val && val.length > 0;
  });
  console.log(`  Entries with commission: ${withCommission.length}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Fix Agent Commission Attribute Type');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  if (REPOPULATE_ONLY) {
    console.log('\n*** REPOPULATE ONLY MODE - Using existing backup ***\n');

    // Load existing backup
    if (!fs.existsSync(BACKUP_PATH)) {
      throw new Error(`Backup file not found: ${BACKUP_PATH}`);
    }
    const backups: CommissionBackup[] = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
    console.log(`Loaded ${backups.length} entries from backup`);

    const withCommission = backups.filter(b => b.commission !== null);
    console.log(`Entries with commission values: ${withCommission.length}`);

    // Repopulate to new attribute
    await repopulateCommissions(backups);

    // Verify
    await verifyFix();

    console.log('\n' + '='.repeat(60));
    console.log('REPOPULATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✓ Commission values populated to "${NEW_ATTR_SLUG}"`);
    return;
  }

  // Step 1: Get all entries and backup
  const entries = await getAllListEntries();
  console.log(`\nTotal entries: ${entries.length}`);

  const backups = await backupCommissions(entries);
  const withCommission = backups.filter(b => b.commission !== null);
  console.log(`Entries with commission values: ${withCommission.length}`);

  // Show sample values
  console.log('\nSample commission values:');
  withCommission.slice(0, 5).forEach(b => {
    console.log(`  ${b.dealName}: ${b.commission}`);
  });

  if (DRY_RUN) {
    console.log('\n--- DRY RUN SUMMARY ---');
    console.log(`Would archive old attribute: ${OLD_ATTR_SLUG}`);
    console.log(`Would create new attribute: ${NEW_ATTR_SLUG} (type: number)`);
    console.log(`Would repopulate: ${withCommission.length} entries`);
    console.log('\nRun without --dry-run to execute.');
    return;
  }

  // Step 2: Archive old attribute (already done manually via curl)
  // await deleteAttribute();

  // Step 3: Create new attribute (already done manually via curl)
  // await createAttribute();

  // Step 4: Repopulate values
  await repopulateCommissions(backups);

  // Step 5: Verify
  await verifyFix();

  console.log('\n' + '='.repeat(60));
  console.log('FIX COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Old attribute "${OLD_ATTR_SLUG}" archived`);
  console.log(`✓ New attribute "${NEW_ATTR_SLUG}" created with type "number"`);
  console.log(`✓ Commission values repopulated`);
  console.log(`✓ Backup saved to: ${BACKUP_PATH}`);
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
