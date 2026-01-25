# VeteranPCS CRM Migration

This project migrates VeteranPCS from Salesforce to Attio CRM.

---

## 🔄 Session Management (READ THIS FIRST!)

**IMPORTANT:** When starting a new Claude Code session, you MUST follow these steps:

### 1. On Session Start - Always Execute

```bash
# Step 1: Read RESUME.md for quick context
cat RESUME.md

# Step 2: Check SESSION-NOTES.md for last session summary
cat SESSION-NOTES.md | tail -n 50

# Step 3: Ask user about blockers
```

After reading RESUME.md and SESSION-NOTES.md, **immediately ask the user:**

```
"I've read RESUME.md and SESSION-NOTES.md.

Current status: [summarize current phase from notes]
Last session: [date and what was completed]
Blocked on: [any blockers from notes]

Before we continue, please confirm:
1. Have you completed the Attio UI setup from docs/migration/ATTIO-SETUP-GUIDE.md?
2. Are there any updates or changes since the last session?
3. What would you like to focus on today?"
```

### 2. During Session - Task Management

- Use the TodoWrite tool to track progress on current tasks
- Update tasks as you complete them
- Mark blockers clearly

### 3. On Session End - Always Update

**Before ending a session, you MUST:**

1. **Update SESSION-NOTES.md** - Add a new section for this session:
   ```markdown
   ## YYYY-MM-DD - [Session Title]
   **Status:** ✅ Complete
   **Completed:** [List what was done]
   **Files Modified:** [List files]
   **Next Session Tasks:** [What's next]
   ```

2. **Update RESUME.md** - Change the "Last Updated" date (line 3)

3. **Ask user to commit:**
   ```
   "Session complete! Please run these commands to save our work:

   git add .
   git commit -m 'Session checkpoint: [summary]'
   git push origin attio-migration
   ```

### Current Migration Status

**Last Updated:** 2026-01-25
**Current Phase:** INTERN SCHEMA COMPLETE ✅
**Branch:** attio-migration

**✅ Completed:**
- Phase 1: Plan Mode & Data Exploration
- Phase 2: Documentation Updates (all 4 docs updated)
- Phase 3a: Attio Schema Automation (6/6 objects, 3/3 pipelines created via API)
- Phase 3b: All 10 migration scripts implemented
- Phase 4a: Core data migration (states, agents, lenders, areas, area assignments)
- Phase 4b: Customer and deals migration (customers, customer deals)
- Phase 4c: Onboarding pipelines (agent onboarding, lender onboarding)
- Phase 5A: Utility libraries (magic-link, slack, openphone)
- Phase 5B: Website data layer (stateService, areas API refactored for Attio)
- Phase 5C: Contact forms + magic-link API routes
- Phase 5D: Webhook handler (cron jobs removed - use Attio native workflows instead)
- V2 Re-Migration: All data re-uploaded from cleaned CSVs
- Cutover Prep: vercel.json created, docs/CUTOVER-PLAN.md written
- **Contact Form Fix Phase 1:** Removed `lead_source`, added deal tracking fields
- **Contact Form Fix Phase 2:** Fixed agent/lender reference lookup (15 vs 18 char Salesforce ID issue)
- **Intern Schema:** New `interns` object (21 attributes) + `intern_placements` pipeline (8 stages)
- **Intern Form Handler:** Updated to create intern records (not agents), persists all 17 form fields

**📋 Next Steps (ENHANCEMENT PHASE):**
1. [ ] **Phase 3 Enhancement:** Multi-step contact form with Buying/Selling/Both selection
2. [ ] Design new form flow and component architecture
3. [ ] Implement form state management
4. [ ] Add area-based agent routing for unselected agents
5. [ ] Handle "Both" → creates 2 separate deals

**📋 Cutover Checklist (Completed):**
1. [x] ~~Add `CRON_SECRET` to Vercel Production env vars~~ (removed - using Attio workflows)
2. [x] Add `ATTIO_WEBHOOK_SECRET` to Vercel Production env vars
3. [x] Configure Attio webhook (see `docs/CUTOVER-PLAN.md` for details)
4. [x] Export fresh Salesforce CSVs (day of cutover)
5. [x] Run data cleaning + V2 migrations (final sync)
6. [x] Merge `attio-migration` → `main`
7. [x] Monitor for 24-48 hours post-cutover
8. [ ] **Configure Attio Workflows** for stale lead/deal automation (see below)

**📋 Phase 5 Key Decisions:**
| Decision | Choice |
|----------|--------|
| Contact Forms | Minimal first, enhance multi-step UX later |
| Image Lookup | Continue using salesforce_id for Sanity lookups |
| Cutover Strategy | Hard cutover with final Salesforce sync before merge |
| Form Architecture | Refactor service files directly (no new /api/leads route) |
| SignWell | Deferred to future phase |

**📝 Cutover Checklist (Before Merge to Main):**
1. [ ] Pull latest Salesforce CSVs
2. [ ] Run delta migration scripts for new/updated records
3. [ ] Run validation scripts to verify data completeness
4. [ ] Merge to main during low-traffic period
5. [ ] Monitor for 24-48 hours post-cutover

**🔧 Schema Fixes Applied:**
- `agent_commission` attribute archived (was incorrectly type `currency`)
- `commission_percent` attribute created (type `number`, displays "2.75" not "$2.75")
- `State.lenders` stale references cleaned (V2 migration created new lender UUIDs, old refs needed cleanup)

**📋 Migration Progress:**
| Script | Status | Records | Notes |
|--------|--------|---------|-------|
| migrate-states.ts | ✅ Done | 52/52 | All US states + DC + PR |
| migrate-agents.ts | ✅ Done | 1,026/1,039 | 6 errors (phone), 7 skipped (dupe email) |
| migrate-lenders.ts | ✅ Done | 139/141 | 2 errors (phone format) |
| migrate-state-lenders.ts | ✅ Done | 152/152 | 51 states updated |
| migrate-areas.ts | ✅ Done | 271/271 | 51 state-level areas filtered |
| migrate-area-assignments.ts | ✅ Done | 503/509 | 6 skipped (missing agents), 243 areas updated with bidirectional refs |
| migrate-customers.ts | ✅ Done | 953/983 | 12 phone errors, 18 no email |
| migrate-customer-deals.ts | ✅ Done | 975/1,021 | 1 error (500), 45 skipped (no customer) |
| migrate-agent-onboarding.ts | ✅ Done | 913/947 | 1 error (502), 33 skipped (missing agents) |
| migrate-lender-onboarding.ts | ✅ Done | 158/160 | 2 skipped (missing lenders) |

**📝 Post-Migration Review:**
See `docs/post-migration-review/` for records that need manual attention:
- agents-review.md - 13 records (6 phone errors + 7 duplicate emails)
- lenders-review.md - 2 records (phone format errors)
- area-assignments-review.md - 6 records (missing agent mappings)
- customers-review.md - 30 records (12 phone errors + 18 no email)
- customer-deals-review.md - 46 records (1 API error + 45 missing customer mappings)

---

### Attio API Notes

**Key Learnings:**

1. **Record References require `target_object`:**
   ```typescript
   // WRONG - will fail
   { target_record_id: 'uuid' }

   // CORRECT
   { target_object: 'agents', target_record_id: 'uuid' }
   ```

2. **Select options must be created separately:**
   - When creating a `select` attribute, options are NOT created inline
   - Use dedicated endpoint: `POST /objects/{obj}/attributes/{attr}/options`
   - Body: `{ "data": { "title": "Option Name" } }`

3. **RecordTypeIds in Salesforce CSV exports are 15-char:**
   - CLAUDE.md documents 18-char IDs, but CSV exports use 15-char
   - Migration scripts must use 15-char versions for filtering

4. **Phone numbers require E.164 format:**
   - Attio rejects phones not in E.164 format
   - Use `lib/normalize-phone.ts` to convert

5. **Useful lib/attio.ts methods added:**
   - `createSelectOption(target, objectSlug, attrSlug, title)` - Add select option
   - `getSelectOptions(target, objectSlug, attrSlug)` - List select options

6. **List entry status/stage MUST be set inside `entry_values`:**
   - Status is NOT a top-level parameter like `status_title`
   - Must be included in `entry_values` using the attribute slug
   ```typescript
   // WRONG - will be silently ignored
   body.data.status_title = 'Paid Complete';

   // ALSO WRONG - 'title' key not recognized
   entry_values.stage = { title: 'Paid Complete' };

   // CORRECT - use 'status' key with status title as string
   entry_values.stage = { status: 'Paid Complete' };
   ```

7. **List entry creation requires `parent_object`:**
   - When creating list entries, you must specify `parent_object` alongside `parent_record_id`
   ```typescript
   // WRONG - missing parent_object
   { parent_record_id: 'uuid', entry_values: {...} }

   // CORRECT
   { parent_object: 'customers', parent_record_id: 'uuid', entry_values: {...} }
   ```

8. **Stage names must match exactly:**
   - Salesforce uses "Tracking 6+" but Attio was configured with "Tracking 6+mo"
   - Always verify actual field values in source data before creating stage mappings
   - Use proper CSV parsing (not awk) to handle commas in quoted fields

9. **Custom objects need a `name` attribute for display:**
   - Attio UI shows record display names based on a `name` attribute
   - Without it, records display as auto-generated UUIDs (e.g., "d6b6f9a3-3b49-458e...")
   - Add `name` as a text attribute and populate with human-readable values
   - For Person records: `name: "${firstName} ${lastName}"`
   - Migration scripts should include `name` field in createRecord calls

10. **Contact.csv has the populated fields, Account.csv fields are EMPTY:**
    - This applies to ALL Person Account data, not just military/bio fields:

    | Field | Account.csv | Contact.csv |
    |-------|-------------|-------------|
    | Military Service | 0% (xMilitary_Service__c) | **56%** (Military_Service__c) |
    | Military Status | 0% (xMilitary_Status__c) | **57%** (Military_Status__c) |
    | Agent Bio | 0% (xAgent_Bio__c) | **24%** (Agent_Bio__c) |
    | Brokerage Name | 12.6% (Website) | **81.4%** (Brokerage_Name__c) |
    | Active on Website | 49.6% (Added_to_Website_Date__c) | **98.5%** (Active_on_Website__c) |
    | Managing Broker Name | 0% | **41.3%** (Managing_Broker_Name__c) |
    | Managing Broker Email | 0% | **40.2%** (Managing_Broker_Email__c) |
    | Managing Broker Phone | 0% | **35.4%** (Managing_Broker_Phone__c) |
    | License Number | N/A | **79%** (License_Number__c) |

    - Always use Contact fields as primary source with Account as fallback:
    ```typescript
    brokerage_name: contact?.Brokerage_Name__c || account.Website || null,
    active_on_website: contact?.Active_on_Website__c === '1',
    license_number: contact?.License_Number__c || null,
    ```

11. **Cannot DELETE attributes via API - only archive:**
    - Attio API returns 404 for `DELETE /lists/{slug}/attributes/{attr}`
    - Use PATCH to archive instead: `{ "data": { "is_archived": true } }`
    - **Archived attributes still occupy their slug** - cannot reuse slug for new attribute
    - To "replace" an attribute type, must create new attribute with different slug

12. **Commission stored as `commission_percent` (not `agent_commission`):**
    - Original `agent_commission` was mistakenly created as `currency` type (displayed "$2.75")
    - Archived and replaced with `commission_percent` as `number` type (displays "2.75")
    - Values are whole percentages (e.g., 2.75 = 2.75%, not 0.0275)

13. **Attio Query API uses MongoDB-style operators:**
    ```typescript
    // CORRECT - MongoDB-style operators
    await attio.queryRecords('agents', {
      filter: { email: { $eq: 'test@example.com' } }
    });

    // CORRECT - Multiple conditions with $and
    await attio.queryRecords('area_assignments', {
      filter: {
        $and: [
          { area: { $eq: areaId } },
          { status: { $eq: 'Active' } }
        ]
      }
    });

    // CORRECT - Array membership with $in
    await attio.queryRecords('agents', {
      filter: { id: { $in: agentIds } }
    });

    // WRONG - will not work
    await attio.queryRecords('agents', {
      filter: { field: 'email', equals: 'test@example.com' }
    });
    ```

    **Supported operators:** `$eq`, `$ne`, `$gt`, `$lt`, `$in`, `$nin`, `$and`, `$or`

    **⚠️ CRITICAL: `$contains` is NOT supported for record-reference fields!**
    - Only `$eq` and `$in` work on `target_record_id`
    - See learning #17 below for workarounds

14. **Multi-ref fields require PUT (assert) to overwrite, PATCH only appends:**
    - When re-running migrations (V2), records get **new UUIDs**
    - Multi-ref fields (like `State.lenders`) may contain **old UUIDs** from V1
    - **CRITICAL:** PATCH (`updateRecord`) only APPENDS to multi-ref fields - it never removes
    - **CRITICAL:** Setting an empty array `[]` via PATCH does NOTHING - values are preserved
    - Use `assertRecord` (PUT endpoint) to REPLACE multi-ref field values completely
    ```typescript
    // WRONG - PATCH appends, does not replace
    await attio.updateRecord('states', stateId, { lenders: [] }); // Ignored!
    await attio.updateRecord('states', stateId, { lenders: [...] }); // Only appends!

    // CORRECT - PUT (assert) completely replaces multi-ref values
    await attio.assertRecord('states', 'state_code', {
      state_code: 'TX',  // Matching attribute value
      lenders: validIds.map(id => ({ target_object: 'lenders', target_record_id: id }))
    });
    ```
    - **Symptom:** stateService returns 0 lenders (IDs exist but records don't)
    - **Fix:** Run `cleanup-stale-lender-refs.ts` (uses `assertRecord`)
    - **Prevention:** Always re-run `migrate-state-lenders-v2.ts` after re-migrating lenders

15. **assertRecord method (PUT) for multi-ref field replacement:**
    - Added `attio.assertRecord(objectSlug, matchingAttribute, data)` method
    - Uses PUT to `/objects/{object}/records?matching_attribute={attr}`
    - Finds existing record by matching attribute, then OVERWRITES all values
    - Unlike PATCH, this completely replaces multi-ref/multiselect field values

16. **POST requests bypass Next.js fetch cache - use unstable_cache:**
    - Attio's query API uses POST (to accept complex filter/sort in JSON body)
    - **Problem:** Next.js only caches GET requests - POST requests are NEVER cached
    - **Symptom:** 52 state pages × 5 API calls = 260 uncached requests during build
    - **Solution:** Use `unstable_cache` wrapper from `next/cache`:
    ```typescript
    import { unstable_cache } from 'next/cache';

    const getCachedData = unstable_cache(
      async () => fetchAllData(),
      ['attio-all-data'],
      { revalidate: 3600, tags: ['attio-data'] }
    );
    ```
    - **CRITICAL:** `unstable_cache` serializes data to JSON
    - Map objects become plain objects (lose `.get()` method)
    - Use `Record<string, T>` instead of `Map<string, T>` for cached data
    ```typescript
    // WRONG - Map.get() won't work after cache serialization
    const states: Map<string, State> = new Map();
    states.get('TX'); // Error: states.get is not a function

    // CORRECT - Use plain objects with bracket notation
    const states: Record<string, State> = {};
    states['TX']; // Works correctly
    ```
    - **Testing scripts:** `unstable_cache` only works during Next.js rendering
    - Add try/catch fallback for standalone script execution:
    ```typescript
    try {
      data = await getCachedData();
    } catch {
      // unstable_cache unavailable - fetch directly
      data = await fetchAllData();
    }
    ```

17. **Cannot query "which records contain this ID in a multi-ref field":**
    - Attio doesn't support reverse lookups on multi-ref fields
    - `$contains` operator does NOT work on record-reference fields
    - Error: `Invalid operator "$contains" for field "target_record_id", must be one of ("$eq", "$in")`
    
    **Problem Example:** Finding states where a lender is assigned
    ```typescript
    // WRONG - $contains not supported
    await attio.queryRecords('states', {
      filter: { lenders: { $contains: lenderId } }
    });
    
    // WRONG - nested syntax also fails
    await attio.queryRecords('states', {
      filter: { lenders: { target_record_id: { $contains: lenderId } } }
    });
    ```
    
    **Solution: Create bidirectional references**
    - Add a reverse reference field (e.g., `Lender.states` → multi-ref to states)
    - Query the reverse field directly: `lender.states` returns assigned state IDs
    - Use parallel `getRecord` calls to fetch state details
    
    ```typescript
    // CORRECT - query the reverse reference
    const lender = await attio.getRecord('lenders', lenderId);
    const stateIds = Array.isArray(lender.states) ? lender.states : [lender.states];
    
    // Parallel fetch state details
    const states = await Promise.all(
      stateIds.map(id => attio.getRecord('states', id).catch(() => null))
    );
    ```
    
    **Scripts for adding reverse references:**
    - `scripts/add-lender-states-attribute.ts` - Create the attribute
    - `scripts/backfill-lender-states.ts` - Populate existing assignments

18. **Cannot query by internal `id` field:**
    - Attio's query API doesn't support filtering by the record's internal `id`
    - Error: `Unknown attribute slug: id`
    
    ```typescript
    // WRONG - id is not a queryable field
    await attio.queryRecords('areas', {
      filter: { id: { $in: areaIds } }
    });
    
    // CORRECT - use parallel getRecord calls instead
    const areas = await Promise.all(
      areaIds.map(id => attio.getRecord('areas', id).catch(() => null))
    );
    ```

19. **Record-reference queries require nested `target_record_id` syntax:**
    - When filtering by a record-reference field, use nested structure
    
    ```typescript
    // WRONG - flat structure
    await attio.queryRecords('area_assignments', {
      filter: { agent: agentId }
    });
    
    // CORRECT - nested with target_record_id
    await attio.queryRecords('area_assignments', {
      filter: { agent: { target_record_id: { $eq: agentId } } }
    });
    ```

20. **Attio webhook signature header is `attio-signature` (lowercase):**
    - NOT `x-attio-signature` or `Attio-Signature`
    - Use timing-safe comparison with `crypto.timingSafeEqual()`
    
    ```typescript
    const signature = request.headers.get('attio-signature');
    const expectedSig = crypto
      .createHmac('sha256', ATTIO_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('hex');
    
    // Timing-safe comparison
    const bufA = Buffer.from(signature, 'hex');
    const bufB = Buffer.from(expectedSig, 'hex');
    const isValid = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
    ```

21. **Attio webhook payload structure:**
    - Events are wrapped in an array, not flat
    - Object type is a UUID (`object_id`), not a slug
    
    ```typescript
    interface AttioWebhookPayload {
      webhook_id: string;
      events: Array<{
        event_type: 'record.created' | 'record.updated' | 'record.deleted';
        id: {
          workspace_id: string;
          object_id: string;      // UUID, not slug!
          record_id: string;
          attribute_id?: string;  // Which attribute changed (for updates)
        };
      }>;
    }
    
    // Get object slug from UUID
    const objectInfo = await attio.getObject(event.id.object_id);
    const objectSlug = objectInfo.api_slug; // 'agents', 'lenders', etc.
    ```

22. **Scripts must use dynamic imports for env vars:**
    - Static imports are hoisted before `dotenv.config()` runs
    - The `attio` singleton is instantiated at import time with empty env vars
    
    ```typescript
    // WRONG - attio instantiated before dotenv runs
    import dotenv from 'dotenv';
    dotenv.config({ path: '.env.local' });
    import { attio } from '../lib/attio';  // API key is undefined!
    
    // CORRECT - dynamic import after dotenv
    import dotenv from 'dotenv';
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
    
    async function main() {
      const { attio } = await import('../lib/attio');  // API key loaded!
      // ...
    }
    ```

23. **Salesforce IDs: 15-char vs 18-char mismatch in URL params:**
    - Salesforce stores 18-char case-insensitive IDs internally
    - UI/API often returns 15-char case-sensitive IDs
    - **Problem:** `stateService` returns 15-char IDs, Attio stores 18-char
    - Query by `salesforce_id` fails: `"0014x00001HWTqI"` ≠ `"0014x00001HWTqIAAX"`
    
    **Solution: Use Attio UUIDs instead of Salesforce IDs in URL params**
    ```typescript
    // BEFORE (broken) - 15-char Salesforce ID in URL
    href={`/contact-agent?id=${agent.AccountId_15__c}`}
    // Form service: queryRecords("agents", { salesforce_id: { $eq: id } })
    // Result: No match, agent reference missing from deal
    
    // AFTER (working) - Attio UUID in URL
    href={`/contact-agent?id=${agent.attio_id}`}
    // Form service: attio.getRecord("agents", id)
    // Result: Direct O(1) lookup, agent reference linked correctly
    ```
    
    **Files changed:**
    - `services/stateService.tsx` - Added `attio_id` to agent/lender interfaces
    - `components/StatePage/StatePageCityAgents.tsx` - Uses `attio_id` in links
    - `components/StatePage/StatePageVaLoan.tsx` - Uses `attio_id` in links
    - `services/salesForcePostFormsService.tsx` - Uses `getRecord()` not `queryRecords()`

24. **Customer Deals pipeline attributes for form tracking:**
    - Added 4 new deal-level attributes for marketing/location tracking:
    
    | Attribute | Type | Purpose |
    |-----------|------|---------|
    | `current_location` | text | Customer's current base/city when contacting |
    | `destination_city` | text | Customer's destination for this deal |
    | `how_did_you_hear` | select | Marketing attribution (Referral, Social Media, etc.) |
    | `how_did_you_hear_other` | text | Free text for "Other" selection |
    
    - Added "Lender" to `deal_type` options (Buying, Selling, Lender)
    - Script: `scripts/add-deal-form-attributes.ts` creates these in Attio

---

## Attio Data Model: Bidirectional References

**Critical Design Pattern:** When you need to query relationships from both directions, create bidirectional references.

### Current Bidirectional References

| Object A | Field on A | Object B | Field on B | Notes |
|----------|-----------|----------|-----------|-------|
| State | `lenders` | Lender | `states` | Which lenders serve which states |
| State | `areas` | Area | `state` | Parent-child relationship |
| Area | `area_assignments` | Area Assignment | `area` | Agent assignments per area |
| Agent | (via area_assignments) | Area Assignment | `agent` | Agent's area coverage |

### Why Bidirectional?

Attio doesn't support reverse queries on multi-ref fields. Without bidirectional references:

```typescript
// ❌ IMPOSSIBLE: "Find all states where lender X is assigned"
// Attio has no $contains operator for record-reference fields

// ✅ WITH BIDIRECTIONAL: Read lender.states directly
const lender = await attio.getRecord('lenders', lenderId);
const assignedStateIds = lender.states;  // Direct lookup!
```

### Maintaining Bidirectional Consistency

When updating one side, update both:
1. Add lender to `State.lenders` → also add state to `Lender.states`
2. Remove lender from `State.lenders` → also remove state from `Lender.states`

Or run sync scripts periodically:
- `scripts/backfill-lender-states.ts` - Syncs `Lender.states` from `State.lenders`

---

## Intern Object & Placement Pipeline

**Purpose:** Track transitioning service members seeking placement with network agents/lenders for mentorship. Interns are NOT becoming VeteranPCS agents - they're being connected with independent agents/lenders in the network.

### Intern Object Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | text | Full name (computed: first + last) |
| `first_name` | text | Required |
| `last_name` | text | Required |
| `email` | text | Required, unique |
| `phone` | phone-number | E.164 format |
| `military_service` | select | Army, Navy, Air Force, Marines, Coast Guard, Space Force |
| `military_status` | select | Active Duty, Veteran, Retired, Reserves, National Guard, Spouse |
| `discharge_status` | select | Honorable Discharge, Retired, Medical Retirement, Currently Serving |
| `current_state` | text | 2-letter state code |
| `current_city` | text | Current city |
| `current_base` | text | Military base (optional) |
| `internship_type` | select | Real Estate Agent, Mortgage Lender |
| `desired_state` | text | 2-letter code where they want to work |
| `desired_city` | text | City where they want to work |
| `preferred_start_date` | date | When they can begin |
| `licensed` | select | Yes, No, In Progress |
| `how_did_you_hear` | select | Marketing attribution |
| `how_did_you_hear_other` | text | Free text for "Other" |
| `mentor_agent` | record-reference | Network agent mentoring this intern |
| `mentor_lender` | record-reference | Network lender mentoring this intern |
| `application_date` | date | When application was submitted |

### Intern Placements Pipeline Stages

| Stage | Status | Description |
|-------|--------|-------------|
| New Application | Active | Just submitted, awaiting review |
| Under Review | Active | Admin reviewing application details |
| Contacted | Active | Admin confirmed details with applicant |
| Matching | Active | Looking for suitable mentor |
| Matched | Active | Mentor identified, introduction pending |
| Placement Complete | Closed (won) | Intern successfully placed with mentor |
| Withdrawn | Closed | Applicant withdrew |
| Unable to Place | Closed | Could not find suitable mentor |

### Form Field Mapping

The internship form uses Salesforce field IDs. Here's the mapping:

| Form Field ID | Attio Attribute |
|---------------|-----------------|
| `first_name` | `first_name` |
| `last_name` | `last_name` |
| `email` | `email` |
| `mobile` | `phone` |
| `00N4x00000LsnOx` | `military_service` |
| `00N4x00000LsnP2` | `military_status` |
| `00N4x00000QQ0Vz` | `discharge_status` |
| `state_code` | `current_state` |
| `city` | `current_city` |
| `base` | `current_base` |
| `00N4x00000QPK7L` | `internship_type` |
| `00N4x00000LspV2` | `desired_state` |
| `00N4x00000LspUi` | `desired_city` |
| `00N4x00000QPLQY` | `preferred_start_date` |
| `00N4x00000QPLQd` | `licensed` |
| `00N4x00000QPksj` | `how_did_you_hear` |
| `00N4x00000QPS7V` | `how_did_you_hear_other` |

### Setup Script

Run `npx tsx scripts/setup-intern-schema.ts` to create the intern object and pipeline in Attio.

---

## Phase 5 Architecture: Website Data Layer

**Critical:** The website currently reads from Salesforce. Phase 5B refactors to read from Attio.

### Current Architecture (Salesforce)
```
app/(site)/[state]/page.tsx
  → services/stateService.fetchAgentsListByState()
    → Salesforce SOQL query
  → services/stateService.fetchLendersListByState()
    → Salesforce SOQL query
  → Components render data
```

### Implemented Architecture (Attio with Data Loader)
```
lib/attio-data-loader.ts
  → Fetches ALL Attio data once (5 API calls total)
  → Uses unstable_cache with 1-hour revalidation
  → Builds in-memory lookup maps (Record<>, not Map<>)
  → Exports: getAttioData(), getAgentsForState(), getLendersForState()

app/(site)/[state]/page.tsx
  → services/stateService.fetchAgentsListByState()
    → getAttioData() (cached, returns in-memory data)
    → Filter agents by state from cached data
    → Fetch photos from Sanity (per agent)
  → services/stateService.fetchLendersListByState()
    → getAttioData() (cached, returns same data)
    → Filter lenders by State.lenders from cached data
  → Components render data (unchanged)
```

**Why Data Loader?**
- Individual API calls: 52 pages × 5 calls = 260 uncached POST requests
- Data loader: 5 API calls total, cached, filter in memory
- Build time reduced, consistent data across all pages

### Files Modified in Phase 5

**Phase 5A - Libraries:**
- `lib/magic-link.ts` (NEW) - JWT token generation/validation
- `lib/slack.ts` (NEW) - Slack webhook notifications
- `lib/openphone.ts` (NEW) - SMS via OpenPhone API

**Phase 5B - Website Data Layer:**
- `lib/attio-data-loader.ts` (NEW) - Pre-fetches ALL Attio data, caches with unstable_cache
- `services/stateService.tsx` (REFACTOR) - Uses data loader instead of individual API calls
- `app/api/v1/areas/route.ts` (REFACTOR) - Query areas from Attio

**Phase 5C - Contact Forms:**
- `services/salesForcePostFormsService.tsx` (REFACTOR) - Submit to Attio instead of Salesforce
- `app/api/magic-link/validate/route.ts` (NEW)
- `app/api/magic-link/update/route.ts` (NEW)

**Phase 5D - Automations:**
- `app/api/webhooks/attio/route.ts` (NEW) - Cache revalidation on record changes
- `app/api/cron/check-stale-leads/route.ts` (NEW) - Re-route uncontacted leads
- `app/api/cron/check-stale-deals/route.ts` (NEW) - Send reminders, auto-close

### Key Implementation Pattern: Preserve Salesforce Interface

When refactoring `stateService.tsx`, return the **same interface** as the Salesforce version:

```typescript
// The components expect this interface - don't change it
return {
  records: agents.map(agent => ({
    Name: agent.name,
    AccountId_15__c: agent.salesforce_id,  // Keep for Sanity image lookup
    FirstName: agent.first_name,
    Agent_Bio__pc: agent.bio,
    // ... map Attio fields to Salesforce field names
    Area_Assignments__r: { records: [...] }
  }))
};
```

### Image Lookup Strategy

Sanity images are linked by `salesforce_id`. We preserved this field in Attio during migration:

```typescript
// In Attio, agents have: { salesforce_id: '0014x00001...' }
// Sanity queries: *[_type == "agent" && salesforceID == $salesforceID]
// No changes needed to Sanity or image lookup
```

### Lender Field Mapping Note

**⚠️ Lenders use `brokerage_name` field, NOT `company_name`:**

Lenders have both `company_name` and `brokerage_name` attributes in Attio, but only `brokerage_name` is populated from the Salesforce migration. When mapping lender data in stateService:

```typescript
// CORRECT - brokerage_name is populated
Brokerage_Name__pc: lender.brokerage_name || lender.company_name || ""

// WRONG - company_name is empty
Brokerage_Name__pc: lender.company_name || ""
```

---

## Documentation

All migration documentation is in `docs/migration/`:

- **PRD.md** - Business requirements, user stories, success metrics
- **HLD.md** - Architecture, data model, integration patterns
- **LLD.md** - Implementation details, API payloads, code examples

**Always reference these docs when implementing features.**

## Salesforce Data

Full Salesforce exports are in `data/salesforce/`. These contain production data with PII.

### Files & Row Counts

| File | Rows | Description |
|------|------|-------------|
| Account.csv | ~2,661 | Agents, Lenders, and Customers (Person Accounts) |
| Contact.csv | ~2,995 | Contact records linked to Accounts |
| Area__c.csv | ~322 | Geographic areas (cities/bases) |
| Area_Assignment__c.csv | ~663 | Agent-to-Area assignments with AA_Score |
| Opportunity.csv | ~2,128 | Deals (customers) and Agent onboarding records |
| Lead.csv | ~5,020 | Unconverted leads (may skip for migration) |
| OpportunityHistory.csv | ~9,309 | Stage change history (optional) |

### Correct RecordTypeIds (from RecordType.csv)

**⚠️ CRITICAL: These are the FULL 18-character IDs - do NOT use truncated 15-character versions!**

#### Person Accounts (Account.RecordTypeId)

| RecordTypeId | Type | Count | Notes |
|--------------|------|-------|-------|
| `0124x000000YzFsAAK` | Person Account Agent | 1,039 | Real estate agents (active + inactive) |
| `0124x000000ZGGZAA4` | Person Account Lender | 141 | Mortgage lenders |
| `0124x000000Z83FAAS` | Person Account Customer | 983 | Veteran clients (from converted Leads) |
| `0124x000000ZGL0AAO` | Person Account Intern | 0 | INACTIVE - skip migration |

#### Opportunities (Opportunity.RecordTypeId)

| RecordTypeId | Type | Count | Migration Action |
|--------------|------|-------|------------------|
| `0124x000000Z7G3AAK` | Customer Deal | 1,021 | **MIGRATE** - Veteran home buying/selling transactions |
| `0124x000000Z7FyAAK` | Agent Onboarding | 947 | **MIGRATE** - Agent recruitment pipeline |
| `0124x000000ZGHrAAO` | Lender Onboarding | 160 | **MIGRATE** - Lender recruitment pipeline |

**Note:** We are creating 3 separate pipelines in Attio:
1. **Customer Deals** (1,021 records) - Home transactions
2. **Agent Onboarding** (947 records) - Agent recruitment with Internship stage
3. **Lender Onboarding** (160 records) - Lender recruitment with Internship stage

### Important Field Mappings

**🚨 CRITICAL EMAIL LOCATION:**

`Account.Person_Account_Email__c` is **EMPTY** in Salesforce exports!

**Correct email source:** `Contact.Email`

**Join Pattern:**
```
Account.PersonContactId → Contact.Id → Contact.Email
```

You MUST join Account records with Contact records to get email addresses.

#### Account.csv + Contact.csv → Agents/Lenders

**⚠️ IMPORTANT:** Contact.csv has the real data - Account x-prefixed fields are empty!

| Salesforce Field | Attio Field | Notes |
|------------------|-------------|-------|
| Account.Id | salesforce_id | Preserve for lookups |
| Account.FirstName | first_name | |
| Account.LastName | last_name | |
| **Contact.Email** | email | **Primary email (via PersonContactId join)** |
| Contact.MobilePhone | phone | Priority: MobilePhone > Account.Phone |
| Account.Phone | phone (fallback) | Normalize to E.164 |
| BillingState / BillingStateCode | state | Use StateCode (2-letter) |
| **Contact.Brokerage_Name__c** | brokerage_name | **81% populated (not Account.Website at 12%)** |
| Account.Brokerage_License_Number__c | brokerage_license | |
| **Contact.License_Number__c** | license_number | **79% populated - agent's personal RE license** |
| **Contact.Managing_Broker_Name__c** | managing_broker_name | **41% (not Account.Managing_Broker__c at 0%)** |
| **Contact.Managing_Broker_Email__c** | managing_broker_email | **40% populated** |
| **Contact.Managing_Broker_Phone__c** | managing_broker_phone | **35% populated** |
| **Contact.Military_Service__c** | military_service | **56% (not Account.xMilitary_Service__c at 0%)** |
| **Contact.Military_Status__c** | military_status | **57% (not Account.xMilitary_Status__c at 0%)** |
| **Contact.Agent_Bio__c** | bio | **24% (not Account.xAgent_Bio__c at 0%)** |
| **Contact.Active_on_Website__c** | active_on_website | **98% as '1'/'0' (not Added_to_Website_Date__c at 50%)** |
| Account.Added_to_Website_Date__c | added_to_website_date | Preserve for historical reference |

#### Area__c.csv → Areas

| Salesforce Field | Attio Field | Notes |
|------------------|-------------|-------|
| Id | salesforce_id | |
| Name | name | City or base name |
| State__c | state | Full state name → convert to code |
| Coverage_Target__c | coverage_target | |
| Coverage_Active__c | coverage_active | |

#### Area_Assignment__c.csv → Area Assignments

| Salesforce Field | Attio Field | Notes |
|------------------|-------------|-------|
| Id | salesforce_id | |
| Agent__c | agent | Lookup → Agent.salesforce_id |
| Area__c | area | Lookup → Area.salesforce_id |
| AA_Score__c | aa_score | Ranking score |
| Status__c | status | Active, Waitlist, Inactive |

#### Opportunity.csv → Deals

| Salesforce Field | Attio Field | Notes |
|------------------|-------------|-------|
| Id | salesforce_id | |
| AccountId | customer | Lookup → Customer.salesforce_id |
| Agent__c | agent | Lookup → Agent.salesforce_id |
| Lender__c | lender | Lookup → Lender.salesforce_id |
| StageName | stage | Map to new stages |
| Sale_Price__c | sale_price | |
| Closing_Commission__c | commission_percent | Stored as whole % (2.75 = 2.75%) |
| Payout_Amount__c | payout_amount | |
| Property_Address__c | property_address | |
| Actual_Close_Date__c | actual_close_date | |
| Buying_andor_Selling__c | deal_type | Infer Buying/Selling/Lender |
| Area__c | (for reference) | Can derive from agent |
| Area_Assignment__c | (for reference) | Can derive from agent |

### Stage Mapping

| Salesforce StageName | Attio Stage |
|---------------------|-------------|
| Closed Won | Closed Won |
| Closed - Lost | Closed Lost |
| Transaction Closed | Closed Won |
| Paid - Complete | Closed Won |
| Actively Looking | Touring |
| Under Contract | Under Contract |
| New | New Lead |

### Migration Order

**Step 0:** Run `scripts/setup-attio-schema.ts` to create all objects, attributes, and pipelines

1. **States** - Create State objects with state_slug (e.g., "west-virginia", "puerto-rico")
2. **Areas** - ~271 city/base areas (filter out ~51 state-level placeholder areas)
3. **Agents** - Filter: `RecordTypeId = '0124x000000YzFsAAK'` (join with Contact for email)
4. **Lenders** - Filter: `RecordTypeId = '0124x000000ZGGZAA4'` (join with Contact for email)
5. **State Lender Assignments** - Convert 152 Salesforce lender area assignments → `State.lenders`
6. **Area Assignments** - **511 agent-only** assignments (lenders now excluded)
7. **Customers** - From Opportunity.AccountId where `RecordTypeId = '0124x000000Z83FAAS'`
8. **Customer Deals Pipeline** - Filter: `RecordTypeId = '0124x000000Z7G3AAK'`
9. **Agent Onboarding Pipeline** - Filter: `RecordTypeId = '0124x000000Z7FyAAK'` (includes 113 internships)
10. **Lender Onboarding Pipeline** - Filter: `RecordTypeId = '0124x000000ZGHrAAO'` (includes 4 internships)

### Data Quality Notes

**✅ Verified from Data Analysis:**

- **Email Location:** Emails are in Contact.csv (NOT Account.Person_Account_Email__c which is empty)
- **Area Assignments:** 511 agent-only assignments (lenders now assigned via State.lenders)
  - 396 assignments → Active agents on website
  - 115 assignments → Inactive agents (CEO prepopulated for future activation)
- **Lender State Assignments:** 152 lender area assignments → converted to State.lenders multi-select
- **Phone Numbers:** Need E.164 normalization - mixed formats: `(719) 445-1843`, `214-578-1641`
- **State Conversion:** Area__c.State__c has full names ("Colorado", "Puerto Rico") - convert to 2-letter codes ("CO", "PR")
- **Customer Deals:** 965 of 1,021 (94%) have Agent__c populated - better than expected!
- **Internship Program:** 117 total internships (113 agents + 4 lenders) tracked from 2021-2025
- **Duplicate Leads:** 357 duplicate Lead emails need deduplication before migration

---

## Tech Stack

- **Next.js 14** (App Router)
- **Attio** - Primary CRM (source of truth)
- **SignWell** - E-signature contracts
- **OpenPhone** - SMS notifications
- **Sanity** - Headshot images only
- **Slack** - Admin notifications

## Security Scanning

This project uses **Semgrep** (open source, LGPL-2.1) for static security analysis.

### Quick Start

```bash
# Install (if not already installed)
brew install semgrep  # macOS
# or: pip install semgrep

# Run security scan
npm run security
```

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run security` | `semgrep scan --config p/default` | Quick scan with terminal output |
| `npm run security:json` | Outputs `semgrep-results.json` | Machine-readable results |
| `npm run security:sarif` | Outputs `semgrep-results.sarif` | GitHub Code Scanning format |
| `npm run security:ci` | Adds `--error` flag | Fails if findings exist (for CI) |

### Configuration

- **`.semgrepignore`** - Defines which paths to exclude from scanning
- **`p/default` ruleset** - Community rules covering OWASP Top 10, React, TypeScript, Node.js

### What Gets Scanned

| Scanned (Production Code) | Excluded (Non-Production) |
|---------------------------|---------------------------|
| `app/` - Pages & API routes | `scripts/` - Migration scripts |
| `components/` - React components | `data/` - CSV exports |
| `services/` - Business logic | `docs/` - Documentation |
| `lib/` - Utility libraries | `sanity/` - CMS schemas |
| `actions/` - Server actions | `types/` - Type definitions |
| `utils/` - Helper functions | `public/` - Static assets |

### What It Detects

- **Injection vulnerabilities** - SQL, command, XSS
- **SSRF** - Unvalidated URLs in fetch calls
- **Hardcoded secrets** - API keys in code
- **Insecure crypto** - Weak algorithms
- **React-specific** - `dangerouslySetInnerHTML` misuse
- **Path traversal** - User input in file paths

### CI/CD Integration (Optional)

Add to `.github/workflows/security.yml`:
```yaml
name: Security Scan
on: [push, pull_request]
jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip3 install semgrep
      - run: npm run security:ci
```

## Key Entities

| Entity | Description |
|--------|-------------|
| State | US State with `state_slug` for URLs + `lenders` multi-ref for lender assignments |
| Area | City or military base within a State (~271 migrated, excludes state-level placeholders) |
| Agent | Real estate agents, ranked by AA_Score per Area (1,039 records) |
| Lender | Mortgage lenders with `states` reverse-ref (141 records) |
| Area Assignment | Links **Agents only** to Areas with AA_Score (511 records) |
| Customer | Veterans seeking to buy/sell/get mortgage (983 records) |
| Intern | Transitioning service members seeking placement with network agents/lenders |
| Customer Deal Pipeline | Home buying/selling transactions (1,021 records) |
| Agent Onboarding Pipeline | Agent recruitment (947 records) |
| Lender Onboarding Pipeline | Lender recruitment (160 records) |
| Intern Placements Pipeline | Intern application review and mentor matching workflow |

**Key Design Decisions:**
- Lenders are assigned at the **State level** via `State.lenders` multi-select (not Area Assignments)
- **Bidirectional reference:** `Lender.states` mirrors `State.lenders` for efficient reverse lookups
- Area Assignments are **agent-only**
- **Interns are separate from Agents/Lenders** - they're applicants seeking placement, not network members

## API Routes to Implement

| Route | Purpose | See LLD Section |
|-------|---------|-----------------|
| POST /api/leads | Create client + deals from website | 2.1 |
| GET /api/magic-link/validate | Validate agent portal token | 2.2 |
| POST /api/magic-link/update | Update deal from portal | 2.3 |
| POST /api/webhooks/attio | Handle Attio events | 3.1 |
| POST /api/webhooks/signwell | Handle contract events | 3.2 |

**Note:** Cron jobs removed. Use Attio native workflows for scheduled automation (see below).

---

## Attio Workflows (Configure in Attio UI)

These automations should be configured in Attio's workflow builder, NOT in code:

### 1. Stale Lead Re-routing
**Trigger:** Recurring Schedule (hourly or every 6 hours)
**Logic:**
1. Filter deals: `stage = "New Lead"` AND `contact_confirmed = false` AND `created_at < 12 hours ago` AND `reroute_count = 0`
2. For each matching deal:
   - Find next highest AA_Score agent in same area
   - Update `agent` field to new agent
   - Set `reroute_count = 1`
   - Send notification to new agent (via Slack integration or HTTP Request to OpenPhone)
3. If no agent available, send Slack alert to admin

### 2. Stale Deal Reminders (7-day)
**Trigger:** Recurring Schedule (daily at 8am)
**Logic:**
1. Filter deals in open stages where `last_updated < 7 days ago`
2. Send reminder to assigned agent (Slack or HTTP Request to OpenPhone)

### 3. Stale Deal Admin Alert (14-day)
**Trigger:** Recurring Schedule (daily at 8am)
**Logic:**
1. Filter deals in open stages where `last_updated < 14 days ago`
2. Send Slack alert to admin channel with deal details

### 4. Auto-Close Stale Deals (45-day)
**Trigger:** Recurring Schedule (daily at 6am)
**Logic:**
1. Filter deals in open stages where `last_stage_change < 45 days ago`
2. Move to "Closed Lost" stage
3. Append note: "[Auto-closed: 45 days in same stage]"

### Open Stages for Stale Checks
- New Lead
- Contacted
- Touring
- Tracking <1mo
- Tracking 1-2mo
- Tracking 3-6mo
- Tracking 6+
- Under Contract

## Libraries Implemented

| File | Purpose | Notes |
|------|---------|-------|
| lib/attio.ts | Attio API client | CRUD, query, assertRecord for multi-ref |
| lib/attio-data-loader.ts | Cached data loader | Pre-fetches ALL Attio data once, uses unstable_cache |
| lib/signwell.ts | SignWell API + helpers | E-signature contracts |
| lib/openphone.ts | SMS sending | OpenPhone API |
| lib/slack.ts | Admin notifications | Webhook-based |
| lib/magic-link.ts | JWT token utils | Agent portal links |
| lib/bonus-calculator.ts | Move-in bonus tiers | Sale price → bonus amount |
| lib/normalize-phone.ts | E.164 formatting | Phone number normalization |

## Business Rules

### Lead Routing
1. Veteran selects Agent/Lender on website → assigned directly
2. If no contact confirmation in 12 hours → re-route to highest AA_Score agent in Area
3. Maximum 1 re-route; then escalate to Admin

### Auto-Activation
Agent becomes "Active on Website" when ALL true:
- `lifecycle_stage` = "Contract Signed"
- `headshot_url` exists
- `bio` exists  
- `military_service` exists

### Stalled Deals
- 7 days no update → SMS reminder to agent
- 14 days no update → Slack alert to admin
- 45 days in same stage → Auto-close as Lost

### Move-In Bonus Tiers
| Sale Price | Bonus | Charity |
|------------|-------|---------|
| < $100K | $200 | $20 |
| $100K-$199K | $400 | $40 |
| $200K-$299K | $700 | $70 |
| $300K-$399K | $1,000 | $100 |
| $400K-$499K | $1,200 | $120 |
| $500K-$649K | $1,500 | $150 |
| $650K-$799K | $2,000 | $200 |
| $800K-$999K | $3,000 | $300 |
| $1M+ | $4,000 | $400 |

## Environment Variables

See `docs/migration/LLD.md` Section 7 for complete list.

Required:
- `ATTIO_API_KEY`
- `ATTIO_WEBHOOK_SECRET`
- `SIGNWELL_API_KEY`
- `SIGNWELL_WEBHOOK_SECRET`
- `OPENPHONE_API_KEY`
- `SLACK_WEBHOOK_URL`
- `MAGIC_LINK_SECRET`
- `NEXT_PUBLIC_BASE_URL`

## File Structure

```
your-project/
├── CLAUDE.md                    ← This file (project root)
├── docs/
│   └── migration/
│       ├── PRD.md
│       ├── HLD.md
│       └── LLD.md
├── data/
│   └── salesforce/              ← Full Salesforce exports (gitignored)
│       ├── Account.csv
│       ├── Contact.csv
│       ├── Area__c.csv
│       ├── Area_Assignment__c.csv
│       ├── Opportunity.csv
│       ├── Lead.csv
│       └── OpportunityHistory.csv
├── app/
│   └── api/
│       ├── leads/route.ts
│       ├── magic-link/
│       ├── webhooks/
│       └── cron/
├── lib/
│   ├── attio.ts
│   ├── signwell.ts
│   ├── openphone.ts
│   ├── slack.ts
│   ├── magic-link.ts
│   ├── bonus-calculator.ts
│   └── normalize-phone.ts
└── scripts/
    ├── migrate-areas.ts
    ├── migrate-agents.ts
    ├── migrate-lenders.ts
    ├── migrate-area-assignments.ts
    └── migrate-deals.ts
```

## Common Tasks

### "Implement the Attio client"
→ Read LLD.md Section 5.1, create `lib/attio.ts`

### "Build the lead submission endpoint"
→ Read LLD.md Section 2.1, create `app/api/leads/route.ts`

### "Add the Attio webhook handler"
→ Read LLD.md Section 3.1, create `app/api/webhooks/attio/route.ts`

### "Create migration scripts"
→ Read LLD.md Section 6, create files in `scripts/`
→ Reference `data/salesforce/` CSVs for actual data structure

### "How does lead re-routing work?"
→ Read PRD.md Section 5.3, HLD.md Section 3.4, LLD.md Section 4.1

### "Migrate agents from Salesforce"
→ Read `data/salesforce/Account.csv` structure above
→ Filter by RecordTypeId = `0124x000000YzFs`
→ See LLD.md Section 6.2 for script template

### "What fields are in the Opportunity export?"
→ Check Field Mappings section above
→ Or inspect `data/salesforce/Opportunity.csv` directly
