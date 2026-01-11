// scripts/setup-attio-schema.ts
// Creates all Attio objects, attributes, pipelines, and stages programmatically

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  OBJECTS,
  OBJECT_ATTRIBUTES,
  PIPELINES,
  PIPELINE_ATTRIBUTES,
  PIPELINE_STAGES,
  type ObjectDefinition,
  type AttributeDefinition,
} from '../lib/attio-schema';

// Order matters for objects with record-reference dependencies
// 1. Create objects that have no dependencies first
// 2. Then create objects that reference other objects
const OBJECT_CREATION_ORDER = [
  'agents',      // No dependencies
  'lenders',     // No dependencies
  'customers',   // No dependencies (agent/lender refs added as attributes)
  'states',      // No dependencies (lender ref added as attribute)
  'areas',       // Depends on states
  'area_assignments', // Depends on agents, areas
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupSchema() {
  console.log('='.repeat(60));
  console.log('VeteranPCS Attio Schema Setup');
  console.log('='.repeat(60));
  console.log();

  // Dynamically import attio after env vars are loaded
  const { attio } = await import('../lib/attio');

  // Track created objects for verification
  const createdObjects: string[] = [];
  const createdLists: string[] = [];
  const errors: string[] = [];

  // ==========================================================================
  // PHASE 1: Create Objects
  // ==========================================================================
  console.log('PHASE 1: Creating Objects');
  console.log('-'.repeat(40));

  for (const slug of OBJECT_CREATION_ORDER) {
    const definition = OBJECTS.find(o => o.api_slug === slug);
    if (!definition) {
      console.error(`❌ Object definition not found: ${slug}`);
      errors.push(`Object definition not found: ${slug}`);
      continue;
    }

    try {
      // Check if object already exists
      const existing = await attio.getObject(slug);
      if (existing) {
        console.log(`⏭️  Object already exists: ${slug}`);
        createdObjects.push(slug);
        continue;
      }

      // Create the object
      const result = await attio.createObject(definition);
      console.log(`✓ Created object: ${slug} (${result.id.object_id})`);
      createdObjects.push(slug);

      // Small delay to avoid rate limiting
      await sleep(200);
    } catch (error: any) {
      if (error.message.includes('409') || error.message.includes('slug_conflict')) {
        console.log(`⏭️  Object already exists: ${slug}`);
        createdObjects.push(slug);
      } else {
        console.error(`❌ Failed to create object ${slug}:`, error.message);
        errors.push(`Failed to create object ${slug}: ${error.message}`);
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 2: Add Attributes to Objects
  // ==========================================================================
  console.log('PHASE 2: Adding Attributes to Objects');
  console.log('-'.repeat(40));

  for (const slug of createdObjects) {
    const attributes = OBJECT_ATTRIBUTES[slug];
    if (!attributes) {
      console.log(`⏭️  No attributes defined for: ${slug}`);
      continue;
    }

    console.log(`\n📦 ${slug} (${attributes.length} attributes):`);

    for (const attr of attributes) {
      try {
        await attio.createAttribute(slug, attr);
        console.log(`  ✓ ${attr.api_slug} (${attr.type})`);
        await sleep(100);
      } catch (error: any) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          console.log(`  ⏭️  ${attr.api_slug} (already exists)`);
        } else {
          console.error(`  ❌ ${attr.api_slug}: ${error.message}`);
          errors.push(`Attribute ${slug}.${attr.api_slug}: ${error.message}`);
        }
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 3: Create Pipelines (Lists)
  // ==========================================================================
  console.log('PHASE 3: Creating Pipelines');
  console.log('-'.repeat(40));

  for (const pipeline of PIPELINES) {
    try {
      // Check if pipeline already exists
      const existing = await attio.getList(pipeline.api_slug);
      if (existing) {
        console.log(`⏭️  Pipeline already exists: ${pipeline.api_slug}`);
        createdLists.push(pipeline.api_slug);
        continue;
      }

      // Create the pipeline
      const result = await attio.createList(pipeline);
      console.log(`✓ Created pipeline: ${pipeline.api_slug} (parent: ${pipeline.parent_object})`);
      createdLists.push(pipeline.api_slug);
      await sleep(200);
    } catch (error: any) {
      if (error.message.includes('409') || error.message.includes('slug_conflict')) {
        console.log(`⏭️  Pipeline already exists: ${pipeline.api_slug}`);
        createdLists.push(pipeline.api_slug);
      } else {
        console.error(`❌ Failed to create pipeline ${pipeline.api_slug}:`, error.message);
        errors.push(`Failed to create pipeline ${pipeline.api_slug}: ${error.message}`);
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 4: Add Attributes to Pipelines
  // ==========================================================================
  console.log('PHASE 4: Adding Attributes to Pipelines');
  console.log('-'.repeat(40));

  for (const slug of createdLists) {
    const attributes = PIPELINE_ATTRIBUTES[slug];
    if (!attributes) {
      console.log(`⏭️  No attributes defined for pipeline: ${slug}`);
      continue;
    }

    console.log(`\n📋 ${slug} (${attributes.length} attributes):`);

    for (const attr of attributes) {
      try {
        await attio.createListAttribute(slug, attr);
        console.log(`  ✓ ${attr.api_slug} (${attr.type})`);
        await sleep(100);
      } catch (error: any) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          console.log(`  ⏭️  ${attr.api_slug} (already exists)`);
        } else {
          console.error(`  ❌ ${attr.api_slug}: ${error.message}`);
          errors.push(`Pipeline attribute ${slug}.${attr.api_slug}: ${error.message}`);
        }
      }
    }
  }

  console.log();

  // ==========================================================================
  // PHASE 5: Add Stages to Pipelines
  // ==========================================================================
  console.log('PHASE 5: Adding Stages to Pipelines');
  console.log('-'.repeat(40));

  for (const slug of createdLists) {
    const stages = PIPELINE_STAGES[slug];
    if (!stages) {
      console.log(`⏭️  No stages defined for pipeline: ${slug}`);
      continue;
    }

    console.log(`\n🎯 ${slug} (${stages.length} stages):`);

    for (const stage of stages) {
      try {
        await attio.createListStatus(slug, stage);
        console.log(`  ✓ ${stage.title} (active: ${stage.is_active})`);
        await sleep(100);
      } catch (error: any) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          console.log(`  ⏭️  ${stage.title} (already exists)`);
        } else {
          console.error(`  ❌ ${stage.title}: ${error.message}`);
          errors.push(`Pipeline stage ${slug}.${stage.title}: ${error.message}`);
        }
      }
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log();
  console.log('='.repeat(60));
  console.log('SETUP COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log(`Objects created/verified: ${createdObjects.length}/${OBJECT_CREATION_ORDER.length}`);
  console.log(`Pipelines created/verified: ${createdLists.length}/${PIPELINES.length}`);

  if (errors.length > 0) {
    console.log();
    console.log('⚠️  Errors encountered:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log();
  console.log('Created objects:', createdObjects.join(', '));
  console.log('Created pipelines:', createdLists.join(', '));

  // Verification hints
  console.log();
  console.log('Next steps:');
  console.log('1. Verify in Attio UI: https://app.attio.com');
  console.log('2. Run migration scripts in order:');
  console.log('   - scripts/migrate-states.ts');
  console.log('   - scripts/migrate-areas.ts');
  console.log('   - scripts/migrate-agents.ts');
  console.log('   - scripts/migrate-lenders.ts');
  console.log('   - scripts/migrate-state-lenders.ts');
  console.log('   - scripts/migrate-area-assignments.ts');
  console.log('   - scripts/migrate-customers.ts');
  console.log('   - scripts/migrate-customer-deals.ts');
  console.log('   - scripts/migrate-agent-onboarding.ts');
  console.log('   - scripts/migrate-lender-onboarding.ts');
}

// Run setup
setupSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
