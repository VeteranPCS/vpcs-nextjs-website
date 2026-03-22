# Attio API Reference

Critical learnings from the VeteranPCS Attio integration. Every rule here was discovered through a real bug.

---

## Query Syntax (MongoDB-style)

**Supported operators:** `$eq`, `$ne`, `$gt`, `$lt`, `$in`, `$nin`, `$and`, `$or`

```typescript
// Simple equality
await attio.queryRecords('agents', {
  filter: { email: { $eq: 'test@example.com' } }
});

// Multiple conditions
await attio.queryRecords('area_assignments', {
  filter: {
    $and: [
      { area: { $eq: areaId } },
      { status: { $eq: 'Active' } }
    ]
  }
});
```

---

## Critical Anti-Patterns (These WILL cause bugs)

### 1. Record References require `target_object`
```typescript
// WRONG - will fail
{ target_record_id: 'uuid' }

// CORRECT
{ target_object: 'agents', target_record_id: 'uuid' }
```

### 2. Record-reference queries require nested syntax
```typescript
// WRONG - flat structure
await attio.queryRecords('area_assignments', { filter: { agent: agentId } });

// CORRECT - nested with target_record_id
await attio.queryRecords('area_assignments', {
  filter: { agent: { target_record_id: { $eq: agentId } } }
});
```

### 3. `$contains` is NOT supported for record-reference fields
Only `$eq` and `$in` work on `target_record_id`. Use bidirectional references instead.

### 4. Cannot query by internal `id` field
```typescript
// WRONG - id is not a queryable field
await attio.queryRecords('areas', { filter: { id: { $in: areaIds } } });

// CORRECT - use parallel getRecord calls
const areas = await Promise.all(
  areaIds.map(id => attio.getRecord('areas', id).catch(() => null))
);
```

### 5. Multi-ref fields: PATCH appends, PUT replaces
```typescript
// WRONG - PATCH only APPENDS, never removes
await attio.updateRecord('states', stateId, { lenders: [] }); // Ignored!

// CORRECT - PUT (assertRecord) completely replaces
await attio.assertRecord('states', 'state_code', {
  state_code: 'TX',
  lenders: validIds.map(id => ({ target_object: 'lenders', target_record_id: id }))
});
```

### 6. List entry status/stage MUST use `status` key inside `entry_values`
```typescript
// WRONG - silently ignored
body.data.status_title = 'Paid Complete';

// ALSO WRONG - 'title' key not recognized
entry_values.stage = { title: 'Paid Complete' };

// CORRECT
entry_values.stage = { status: 'Paid Complete' };
```

### 7. List entry creation requires `parent_object`
```typescript
// WRONG
{ parent_record_id: 'uuid', entry_values: {...} }

// CORRECT
{ parent_object: 'customers', parent_record_id: 'uuid', entry_values: {...} }
```

### 8. Multi-select attributes require array values
```typescript
// WRONG - single string rejected for multi-select
await attio.updateRecord("people", id, { person_type: "Agent" });

// CORRECT - wrap in array
await attio.updateRecord("people", id, { person_type: ["Agent"] });

// PATCH appends to multi-select (existing values preserved)
// PUT replaces entire multi-select (existing values lost)
```

---

## Other Important Rules

### Select options must be created separately
When creating a `select` attribute, options are NOT created inline.
Use: `POST /objects/{obj}/attributes/{attr}/options` with `{ "data": { "title": "Option Name" } }`

### Phone numbers require E.164 format
Attio rejects phones not in E.164 format. Use `lib/normalize-phone.ts` to convert.

### Custom objects need a `name` attribute for display
Without it, records display as auto-generated UUIDs in Attio UI.

### Cannot DELETE attributes via API - only archive
Use PATCH: `{ "data": { "is_archived": true } }`. Archived attributes still occupy their slug.

### POST requests bypass Next.js fetch cache
Attio's query API uses POST. Use `unstable_cache` wrapper:
```typescript
const getCachedData = unstable_cache(
  async () => fetchAllData(),
  ['attio-all-data'],
  { revalidate: 3600, tags: ['attio-data'] }
);
```
**CRITICAL:** `unstable_cache` serializes to JSON — `Map` objects become plain objects. Use `Record<string, T>`.

### Scripts must use dynamic imports for env vars
```typescript
// WRONG - attio instantiated before dotenv runs
import { attio } from '../lib/attio';  // API key is undefined!

// CORRECT - dynamic import after dotenv.config()
const { attio } = await import('../lib/attio');
```

### Verify API Capabilities Against Documentation
Always verify Attio API capabilities against actual docs before assuming features exist. Do not assume workflow or sequence capabilities without citing docs. Use context7 MCP or fetch from https://docs.attio.com/rest-api/overview.

---

## Webhook Implementation

```typescript
// Signature header is lowercase: 'attio-signature'
const signature = request.headers.get('attio-signature');
const expectedSig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));

// Payload: events are wrapped, object_id is UUID not slug
interface AttioWebhookPayload {
  webhook_id: string;
  events: Array<{
    event_type: 'record.created' | 'record.updated' | 'record.deleted';
    id: { workspace_id: string; object_id: string; record_id: string; };
  }>;
}
const objectInfo = await attio.getObject(event.id.object_id);
const slug = objectInfo.api_slug;
```

---

## People Records

```typescript
import { findOrCreatePerson } from "@/lib/attio-people";

// Upserts by email — same email = same People record across object types
const personId = await findOrCreatePerson({
  firstName: "John", lastName: "Doe",
  email: "john@example.com", phone: "+15551234567",
});

// Link to custom object
const data = { person: { target_object: "people", target_record_id: personId } };

// People built-in object uses DIFFERENT field formats:
// - name: [{ first_name, last_name, full_name }]  (personal-name type)
// - email_addresses: [{ email_address: "x@y.com" }]
// - phone_numbers: [{ original_phone_number: "+1..." }]
// Do NOT use separate first_name/last_name fields — they don't exist on People!
```

---

## Data Model

### Bidirectional References
Attio doesn't support reverse queries on multi-ref fields. Maintain references in both directions:

| Forward | Reverse | Purpose |
|---------|---------|---------|
| `State.lenders` | `Lender.states` | Lenders per state |
| `State.areas` | `Area.state` | Areas in state |
| `Area.area_assignments` | `AreaAssignment.area` | Assignments per area |

### People Record Linkage
Every custom object has a `person` field → People record (deduped by email).
`person_type` multi-select: Agent, Lender, Customer, Intern (set by `findOrCreatePerson()`).

### Key Entities

| Entity | Description |
|--------|-------------|
| State | US State with `state_slug` for URLs + `lenders` multi-ref |
| Area | City or military base within a State |
| Agent | Real estate agents, ranked by AA_Score per Area |
| Lender | Mortgage lenders with `states` reverse-ref |
| Area Assignment | Links **Agents only** to Areas with AA_Score |
| Customer | Veterans seeking to buy/sell/get mortgage |
| Intern | Transitioning service members seeking placement |

**Design decisions:** Lenders at State level (not Area Assignments). Area Assignments are agent-only. Interns are separate from Agents/Lenders.

### Pipelines

| Pipeline | Parent Object | Key Stages |
|----------|--------------|------------|
| Customer Deals | Customer | New Lead → Contacted → Under Contract → Closed Won/Lost |
| Agent Onboarding | Agent | New Application → Contract Signed → Active |
| Lender Onboarding | Lender | New Application → Contract Signed → Active |
| Intern Placements | Intern | New Application → Matching → Placed / Unable to Place |

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown attribute slug: id` | Filtering by `id` field | Use `getRecord` with Promise.all |
| `Invalid operator "$contains"` | $contains on record-ref | Use bidirectional reference |
| `missing_sort_field` | Wrong filter syntax for record-ref | Use `{ field: { target_record_id: { $eq: id } } }` |
| `API Key invalid...wrong length` | dotenv not loaded before import | Use dynamic import |
| `Cannot find select option with title "X"` | Option not created | Call `createSelectOption()` first |
| `Multi-select attribute expects an array` | Single string for multi-select | Wrap in array: `['Agent']` |
