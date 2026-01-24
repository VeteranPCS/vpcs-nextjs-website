/**
 * Add form submission attributes to customer_deals list
 *
 * This script adds:
 * 1. current_location (text) - Customer's current base/city
 * 2. destination_city (text) - Customer's destination base/city
 * 3. how_did_you_hear (select) - Marketing attribution
 * 4. how_did_you_hear_other (text) - Free text for "Other" selection
 * 5. "Lender" option to deal_type select
 *
 * Run: npx tsx scripts/add-deal-form-attributes.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE importing attio
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const HOW_DID_YOU_HEAR_OPTIONS = [
  'Google',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'TikTok',
  'Base Event',
  'Transition Brief',
  'Agent Referral',
  'Friend Referral',
  'Skillbridge',
  'YouTube',
  'Other',
];

async function main() {
  // Dynamic import ensures env vars are loaded before AttioClient is instantiated
  const { attio } = await import('../lib/attio');

  console.log('Adding form attributes to customer_deals list...\n');

  // Step 1: Add text attributes
  const textAttributes = [
    {
      title: 'Current Location',
      api_slug: 'current_location',
      type: 'text' as const,
      description: "Customer's current base/city when contacting",
    },
    {
      title: 'Destination City',
      api_slug: 'destination_city',
      type: 'text' as const,
      description: "Customer's destination base/city for this deal",
    },
    {
      title: 'How Did You Hear Other',
      api_slug: 'how_did_you_hear_other',
      type: 'text' as const,
      description: "Free text explanation when 'Other' is selected",
    },
  ];

  console.log('=== Adding text attributes ===\n');
  for (const attr of textAttributes) {
    try {
      await attio.createListAttribute('customer_deals', attr);
      console.log(`✅ Created "${attr.api_slug}" attribute`);
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        console.log(`⏭️  "${attr.api_slug}" already exists`);
      } else {
        console.error(`❌ Error creating "${attr.api_slug}":`, error.message);
      }
    }
  }

  // Step 2: Add how_did_you_hear select attribute
  console.log('\n=== Adding how_did_you_hear select attribute ===\n');
  try {
    await attio.createListAttribute('customer_deals', {
      title: 'How Did You Hear',
      api_slug: 'how_did_you_hear',
      type: 'select',
      description: 'Marketing attribution - how customer found VeteranPCS',
      config: {
        select: {
          options: HOW_DID_YOU_HEAR_OPTIONS.map(title => ({ title })),
        },
      },
    });
    console.log('✅ Created "how_did_you_hear" attribute');
  } catch (error: any) {
    if (error.message?.includes('409') || error.message?.includes('already exists')) {
      console.log('⏭️  "how_did_you_hear" already exists');
    } else {
      console.error('❌ Error creating "how_did_you_hear":', error.message);
    }
  }

  // Step 3: Add select options for how_did_you_hear (in case attribute existed but was missing options)
  console.log('\n=== Adding how_did_you_hear select options ===\n');
  for (const option of HOW_DID_YOU_HEAR_OPTIONS) {
    try {
      await attio.createSelectOption('lists', 'customer_deals', 'how_did_you_hear', option);
      console.log(`✅ Added option "${option}"`);
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        console.log(`⏭️  Option "${option}" already exists`);
      } else {
        console.error(`❌ Error adding option "${option}":`, error.message);
      }
    }
  }

  // Step 4: Add "Lender" option to deal_type select
  console.log('\n=== Adding "Lender" option to deal_type ===\n');
  try {
    await attio.createSelectOption('lists', 'customer_deals', 'deal_type', 'Lender');
    console.log('✅ Added "Lender" option to deal_type');
  } catch (error: any) {
    if (error.message?.includes('409') || error.message?.includes('already exists')) {
      console.log('⏭️  "Lender" option already exists in deal_type');
    } else {
      console.error('❌ Error adding "Lender" option:', error.message);
    }
  }

  console.log('\n✅ Done! Form attributes added to customer_deals list.');
  console.log('\nNext steps:');
  console.log('1. Update salesForcePostFormsService.tsx to use these fields');
  console.log('2. Test contact form submissions on Vercel preview');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
