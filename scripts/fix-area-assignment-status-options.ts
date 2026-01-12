// scripts/fix-area-assignment-status-options.ts
// Adds missing select options to the area_assignments.status attribute
//
// Problem: The Attio API requires select options to be created via a separate
// endpoint, not inline during attribute creation. This script fixes the
// area_assignments.status attribute by adding the required options.

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const STATUS_OPTIONS = ['Active', 'Waitlist', 'Inactive'];

async function fixStatusOptions() {
  console.log('='.repeat(60));
  console.log('Fix Area Assignment Status Options');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Check current options
  console.log('Checking current options...');
  const existingOptions = await attio.getSelectOptions('objects', 'area_assignments', 'status');
  const existingTitles = existingOptions.map((opt: any) => opt.title);
  console.log(`Found ${existingOptions.length} existing options:`, existingTitles);
  console.log();

  // Add missing options
  let addedCount = 0;
  let skippedCount = 0;

  for (const option of STATUS_OPTIONS) {
    if (existingTitles.includes(option)) {
      console.log(`⏭️  Skipping "${option}" - already exists`);
      skippedCount++;
      continue;
    }

    try {
      await attio.createSelectOption('objects', 'area_assignments', 'status', option);
      console.log(`✓ Created option: "${option}"`);
      addedCount++;
    } catch (error: any) {
      console.error(`❌ Failed to create "${option}":`, error.message);
    }
  }

  // Verify
  console.log();
  console.log('Verifying options...');
  const finalOptions = await attio.getSelectOptions('objects', 'area_assignments', 'status');
  const finalTitles = finalOptions.map((opt: any) => opt.title);
  console.log(`Final options:`, finalTitles);

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Added: ${addedCount} options`);
  console.log(`⏭️  Skipped: ${skippedCount} options (already existed)`);
  console.log(`📊 Total options: ${finalOptions.length}`);

  // Check if all required options exist
  const missingOptions = STATUS_OPTIONS.filter(opt => !finalTitles.includes(opt));
  if (missingOptions.length > 0) {
    console.log();
    console.log(`⚠️  Missing options: ${missingOptions.join(', ')}`);
    process.exit(1);
  } else {
    console.log();
    console.log('✅ All required options are now configured!');
    console.log('   You can now re-run: npx tsx scripts/migrate-area-assignments.ts');
  }
}

// Run the fix
fixStatusOptions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
