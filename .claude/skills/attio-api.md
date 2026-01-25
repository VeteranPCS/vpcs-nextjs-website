# Attio API Development Skill

Use this skill when working with the Attio CRM API in this codebase. It covers common patterns, gotchas, and best practices learned from implementing the VeteranPCS migration.

## When to Use

- Writing Attio API queries
- Creating or updating records
- Creating objects, attributes, or pipelines
- Building webhook handlers
- Writing migration scripts
- Debugging Attio API errors

## Quick Reference

### Query Syntax (MongoDB-style)

```typescript
// Simple equality
await attio.queryRecords('agents', {
  filter: { email: { $eq: 'test@example.com' } }
});

// Multiple conditions
await attio.queryRecords('area_assignments', {
  filter: {
    $and: [
      { status: { $eq: 'Active' } },
      { agent: { target_record_id: { $eq: agentId } } }  // Record-ref syntax!
    ]
  }
});

// Array membership
await attio.queryRecords('agents', {
  filter: { state: { $in: ['TX', 'CA', 'FL'] } }
});
```

**Supported operators:** `$eq`, `$ne`, `$gt`, `$lt`, `$in`, `$nin`, `$and`, `$or`

### Critical Gotchas

#### 1. Record-Reference Fields Need Nested Syntax
```typescript
// WRONG
filter: { agent: agentId }

// CORRECT
filter: { agent: { target_record_id: { $eq: agentId } } }
```

#### 2. No `$contains` for Record-References
```typescript
// WRONG - $contains doesn't work on record-refs
filter: { lenders: { target_record_id: { $contains: lenderId } } }

// CORRECT - Use bidirectional references (Lender.states)
const lender = await attio.getRecord('lenders', lenderId);
const assignedStates = lender.states;
```

#### 3. Cannot Filter by Internal `id` Field
```typescript
// WRONG - id is not queryable
filter: { id: { $in: recordIds } }

// CORRECT - Use parallel getRecord calls
const records = await Promise.all(
  recordIds.map(id => attio.getRecord('objects', id).catch(() => null))
);
```

#### 4. PATCH Appends to Multi-Ref, PUT Replaces
```typescript
// WRONG - PATCH only appends, never removes
await attio.updateRecord('states', stateId, { lenders: [] }); // Does nothing!

// CORRECT - Use assertRecord (PUT) to replace
await attio.assertRecord('states', 'state_code', {
  state_code: 'TX',
  lenders: newLenderIds.map(id => ({ target_object: 'lenders', target_record_id: id }))
});
```

#### 5. Reference Values Need `target_object`
```typescript
// WRONG
{ target_record_id: 'uuid' }

// CORRECT
{ target_object: 'agents', target_record_id: 'uuid' }
```

#### 6. Select Options Must Be Created Separately
```typescript
// Creating a select attribute does NOT create its options inline
// You must create each option with a separate API call:

await attio.createSelectOption('objects', 'interns', 'military_service', 'Air Force');
await attio.createSelectOption('objects', 'interns', 'military_service', 'Army');
await attio.createSelectOption('objects', 'interns', 'military_service', 'Navy');

// Helper methods in lib/attio.ts:
// - createSelectOption(target, objectSlug, attrSlug, title)
// - getSelectOptions(target, objectSlug, attrSlug)
```

#### 7. Pipeline/List Entry Stage Syntax
```typescript
// WRONG - status_title is silently ignored
body.data.status_title = 'New Application';

// WRONG - 'title' key not recognized
entry_values.stage = { title: 'New Application' };

// CORRECT - use 'status' key with stage title as string
const entryValues = {
  notes: 'Initial application',
  stage: { status: 'New Application' }  // <-- This is the key!
};

await attio.createListEntry('intern_placements', 'interns', internId, entryValues, 'New Application');
```

#### 8. List Entry Requires `parent_object`
```typescript
// WRONG - missing parent_object
await attio.createListEntry('customer_deals', customerId, dealData);

// CORRECT - include parent_object
await attio.createListEntry('customer_deals', 'customers', customerId, dealData);
```

#### 9. Custom Objects Need `name` Attribute for Display
```typescript
// Without a 'name' attribute, records display as UUIDs in Attio UI:
// "d6b6f9a3-3b49-458e-9c12-abc123..."

// Always include a 'name' attribute and populate it:
const internData = {
  name: `${firstName} ${lastName}`,  // <-- Required for readable display
  first_name: firstName,
  last_name: lastName,
  // ...
};
```

#### 10. Cannot DELETE Attributes - Only Archive
```typescript
// WRONG - returns 404
await fetch(`/objects/${obj}/attributes/${attr}`, { method: 'DELETE' });

// CORRECT - archive instead
await fetch(`/objects/${obj}/attributes/${attr}`, {
  method: 'PATCH',
  body: JSON.stringify({ data: { is_archived: true } })
});

// WARNING: Archived attributes still occupy their slug!
// To "replace" an attribute with a different type:
// 1. Archive old attribute (e.g., 'agent_commission')
// 2. Create new attribute with NEW slug (e.g., 'commission_percent')
// 3. Update all code to use new slug
```

### Webhook Implementation

```typescript
// Correct signature header (lowercase!)
const signature = request.headers.get('attio-signature');

// Timing-safe comparison
const expectedSig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));

// Payload structure (events are wrapped!)
interface AttioWebhookPayload {
  webhook_id: string;
  events: Array<{
    event_type: 'record.created' | 'record.updated' | 'record.deleted';
    id: {
      workspace_id: string;
      object_id: string;   // UUID, not slug!
      record_id: string;
    };
  }>;
}

// Get object slug from UUID
const objectInfo = await attio.getObject(event.id.object_id);
const slug = objectInfo.api_slug;
```

### Script Environment Setup

```typescript
// WRONG - static imports are hoisted before dotenv runs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { attio } from '../lib/attio';  // API key undefined!

// CORRECT - dynamic import after dotenv
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const { attio } = await import('../lib/attio');
  // Now API key is loaded
}
```

### Schema Creation Sequence

When creating a new object with attributes and a pipeline:

```typescript
// 1. Create the object
await attio.createObject({
  api_slug: 'interns',
  singular_noun: 'Intern',
  plural_noun: 'Interns'
});

// 2. Create attributes (one at a time)
for (const attr of attributes) {
  await attio.createAttribute('interns', attr);
}

// 3. Create select options (separate call per option!)
for (const option of militaryServiceOptions) {
  await attio.createSelectOption('objects', 'interns', 'military_service', option);
}

// 4. Create the pipeline (list)
await attio.createList({
  api_slug: 'intern_placements',
  name: 'Intern Placements',
  parent_object: 'interns',
  workspace_access: 'full-access'
});

// 5. Create pipeline attributes
for (const attr of pipelineAttributes) {
  await attio.createListAttribute('intern_placements', attr);
}

// 6. Create pipeline stages (statuses)
for (const stage of stages) {
  await attio.createListStatus('intern_placements', stage);
}
```

### Bidirectional References

For efficient reverse lookups, maintain references in both directions:

| Forward | Reverse | Purpose |
|---------|---------|---------|
| `State.lenders` | `Lender.states` | Lenders per state |
| `Area.state` | `State.areas` | Areas in state |
| `AreaAssignment.area` | `Area.area_assignments` | Assignments per area |

**Sync scripts:**
- `scripts/backfill-lender-states.ts` - Syncs Lender.states from State.lenders

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown attribute slug: id` | Filtering by `id` field | Use `getRecord` with Promise.all |
| `Invalid operator "$contains"` | Using $contains on record-ref | Use bidirectional reference |
| `missing_sort_field` | Wrong filter syntax for record-ref | Use `{ field: { target_record_id: { $eq: id } } }` |
| `API Key invalid...wrong length` | dotenv not loaded before import | Use dynamic import |
| `Cannot find select option with title "X"` | Select option not created | Call `createSelectOption()` first |
| `Cannot find attribute with slug/ID "X"` | Attribute doesn't exist | Check schema, may need to create |

## Related Files

- `lib/attio.ts` - Attio client with all methods
- `lib/attio-schema.ts` - Schema type definitions  
- `app/api/webhooks/attio/route.ts` - Webhook handler
- `scripts/setup-attio-schema.ts` - Main schema creation script
- `scripts/setup-intern-schema.ts` - Example of creating new object + pipeline
- `CLAUDE.md` - Full API documentation (learnings #1-24)
