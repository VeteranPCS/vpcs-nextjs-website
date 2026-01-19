# VeteranPCS Migration - Session Notes

**Project:** Salesforce → Attio CRM Migration
**Branch:** attio-migration
**Plan File:** `~/.claude/plans/floating-booping-puzzle.md`

---

## Quick Status

**Current Phase:** Phase 5 COMPLETE ✅ + V2 Re-Migration COMPLETE ✅ + Cutover Prep COMPLETE ✅
**Next Phase:** CUTOVER (Final Data Sync + Merge to Main)
**Blocked On:** User to configure Attio webhook + Vercel env vars
**Last Session:** 2026-01-18 - Fix State Page Data Loading

---

## Session Log

### 2026-01-18 - Fix State Page Data Loading (Latest Session)

**Platform:** Claude Code CLI
**Status:** ✅ Complete

**Issue Reported:**
- User reported agents and lenders not consistently populating on state pages during build
- Hard refresh (cmd+shift+r) made data appear, suggesting caching/fetching issue
- After local build, data population was "hit or miss"

**Root Cause Identified:**
1. **260+ uncached API calls during build** - Each of 52 state pages was making 5+ POST requests to Attio
2. **POST requests bypass Next.js fetch cache** - POST method is never cached by Next.js
3. **`unstable_cache` serialization issue** - Map objects become plain objects when JSON serialized

**Solution Implemented:**
1. ✅ Created `lib/attio-data-loader.ts` - Pre-fetches ALL Attio data once (5 API calls total)
2. ✅ Uses `unstable_cache` with 1-hour revalidation for build-time caching
3. ✅ Changed from Map<> to Record<> for JSON serialization compatibility
4. ✅ Refactored `services/stateService.tsx` to use data loader
5. ✅ Added fallback for standalone script execution (testing/debugging)

**Key Technical Learning:**
| Issue | Cause | Solution |
|-------|-------|----------|
| POST not cached | Next.js only caches GET requests | Use `unstable_cache` wrapper |
| Map serialization | JSON.stringify converts Map to {} | Use Record<string, T> instead |
| unstable_cache context | Only works during Next.js rendering | Try/catch with direct fetch fallback |

**Build Results After Fix:**
| Page | Before | After |
|------|--------|-------|
| Texas | 106KB, 2 images | **439KB, 47 images** |
| Puerto Rico | 106KB, 2 images | **114KB, 3 images** |

**Files Modified:**
- `lib/attio-data-loader.ts` - New file: Pre-fetches and caches all Attio data
- `services/stateService.tsx` - Refactored to use data loader instead of individual API calls

**Architecture Change:**
```
Before: 52 pages × 5 API calls = 260 uncached calls during build
After:  1 data fetch (cached) → 52 pages filter in memory
```

---

### 2026-01-18 - Migration Audit & Multi-Ref Field Fix (Continued Session)

**Platform:** Claude Code CLI
**Status:** ✅ Complete

**Issue Reported:**
- User reported agents and lenders still not populating properly across all 50 states + DC + PR
- Previous session's cleanup script appeared to work but didn't actually persist changes

**Root Cause Identified:**
- **CRITICAL DISCOVERY:** Attio PATCH API (`updateRecord`) for multi-ref fields **only APPENDS**, never replaces
- Setting `lenders: []` via PATCH is **silently ignored** - it does NOT clear the field
- The cleanup script was reporting success but the stale UUIDs persisted

**Fix Applied:**
1. ✅ Added `assertRecord()` method to `lib/attio.ts` using PUT endpoint
2. ✅ Updated `cleanup-stale-lender-refs.ts` to use `assertRecord` instead of `updateRecord`
3. ✅ Created Puerto Rico area (San Juan) + assigned agent Sara Quinones via `fix-puerto-rico.ts`
4. ✅ Re-ran cleanup - all 50 states cleaned, 0 stale references remaining

**Key Technical Learning:**
| Method | Endpoint | Multi-Ref Behavior |
|--------|----------|-------------------|
| `updateRecord()` | PATCH `/objects/{obj}/records/{id}` | **APPENDS** only, ignores empty arrays |
| `assertRecord()` | PUT `/objects/{obj}/records?matching_attribute={attr}` | **REPLACES** completely |

**Final Audit Results:**
| Metric | Value |
|--------|-------|
| Total states | 52 |
| States with agents | 50 |
| States with lenders | 51 |
| Stale lender references | **0** (was 304) |
| Invalid area references | 0 |
| Invalid agent references | 0 |

**Expected Gaps (Source Data Limitation):**
- **Maine (ME):** 0 agents, 2 lenders - No active area assignments in Salesforce source
- **Puerto Rico (PR):** 1 agent, 0 lenders - Created area today, no lenders assigned in source

**Files Modified:**
- `lib/attio.ts` - Added `assertRecord()` method for PUT-based multi-ref replacement
- `scripts/cleanup-stale-lender-refs.ts` - Updated to use assertRecord
- `CLAUDE.md` - Updated API notes with PATCH vs PUT behavior

**Files Created:**
- `scripts/fix-puerto-rico.ts` - Creates San Juan area and assigns active agent
- `scripts/audit-migration.ts` - Comprehensive migration audit script

**Migration Data Verification:**
- Active agents on website: 329/1026 (matches Salesforce source)
- Active lenders on website: 19/138 (matches Salesforce source)
- Areas: 272 (includes new San Juan for PR)
- Area Assignments: 509 (includes new PR assignment)

---

### 2026-01-18 - Fixed Stale Lender References (Earlier Session)

**Platform:** Claude Code CLI
**Status:** ✅ Complete

**Issue Reported:**
- Colorado state page working correctly
- Texas state page showing agents but no lenders
- Some state pages showing no agents or lenders

**Root Cause Identified:**
- The V2 migration re-created lenders with **new UUIDs**
- The `State.lenders` multi-ref field still contained **old V1 UUIDs** (orphaned references)
- Example: Texas had 8 lender IDs assigned, but **none** existed in the lenders table
- The stateService filtered out non-existent IDs, resulting in 0 lenders on some pages

**Fix Applied:**
1. ✅ Re-ran `migrate-state-lenders-v2.ts` to add correct V2 lender UUIDs to State.lenders
2. ✅ Created `cleanup-stale-lender-refs.ts` script to remove orphaned V1 UUIDs
3. ✅ Verified fix across all 52 states

**Post-Fix Results:**
| Metric | Value |
|--------|-------|
| States with agents | 50/52 |
| States with lenders | 51/52 |
| Total agents (with photos) | 374 |
| Total lenders (with photos) | 151 |

**States without data (expected):**
- Maine: 0 agents (2 lenders) - No agents assigned yet
- Puerto Rico: 0 agents, 0 lenders - No coverage yet

**API Status:**
- ✅ Attio Pro trial expiration did **NOT** cause data loss
- ✅ API is fully functional (read/write operations work)
- ⚠️ Occasional 500 errors on Attio API (transient, retry works)

**Files Created:**
- `scripts/cleanup-stale-lender-refs.ts` - Removes orphaned lender references

**Key Insight:**
When the V2 migration re-created records, the old UUIDs became orphaned. Multi-ref fields like `State.lenders` don't automatically clean up orphaned references. The stateService's filtering logic masked this issue by silently excluding non-existent lenders, making the root cause hard to identify.

**Next Session Tasks:**
- [ ] Verify website pages are displaying correctly in browser
- [ ] Consider adding error logging for orphaned references in stateService
- [ ] Proceed with cutover when ready

---

### 2026-01-17 - Cutover Plan & Vercel Cron Configuration

**Platform:** Claude Code CLI
**Status:** ✅ Complete

**Completed:**
- ✅ Committed V2 migration scripts (all 9 scripts + rebuild-mappings.ts utility)
- ✅ Fixed TypeScript errors (added offset to queryRecords type, CsvRow types)
- ✅ Removed redundant scripts/v2/ directory (working versions are in scripts/ root)
- ✅ Created `vercel.json` with cron job configuration
- ✅ Created comprehensive `docs/CUTOVER-PLAN.md` with step-by-step instructions
- ✅ Researched and documented Attio webhook setup (signature verification with Attio-Signature header)
- ✅ Researched and documented Vercel cron job setup (CRON_SECRET + Authorization header)

**Files Created:**
- `vercel.json` - Cron job configuration (hourly stale-leads, daily stale-deals)
- `docs/CUTOVER-PLAN.md` - Complete cutover instructions with env vars, webhooks, data sync

**Files Modified:**
- `lib/attio.ts` - Added `offset` parameter to queryRecords type
- `scripts/rebuild-mappings.ts` - Added CsvRow interface for type safety
- `.gitignore` - Added `data/cleaned/` to ignore PII data

**Git Commits:**
- `23fec7e` - Add V2 migration scripts for cleaned data re-migration
- `b27e274` - Add Vercel cron jobs configuration and cutover plan

**V2 Migration Results (Current Attio State):**
| Object | Count |
|--------|-------|
| Agents | 1,027 |
| Lenders | 138 |
| Customers | 944 |
| Areas | 271 |
| Area Assignments | 503 |
| Customer Deals | 925 |
| Agent Onboarding | 902 |
| Lender Onboarding | 138 |

**Cutover Prerequisites (User Action Required):**
1. Add `CRON_SECRET` to Vercel Production env vars (generate 16+ char random string)
2. Add `ATTIO_WEBHOOK_SECRET` to Vercel Production env vars (generate 16+ char random string)
3. Configure Attio webhook in Attio → Workspace Settings → Developers → Webhooks:
   - URL: `https://www.veteranpcs.com/api/webhooks/attio`
   - Secret: Same as `ATTIO_WEBHOOK_SECRET`
   - Events: `record.created`, `record.updated`, `record.deleted` for agents, lenders, areas, area_assignments

**Cron Jobs Configured:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/check-stale-leads` | Hourly (`0 * * * *`) | Re-route leads after 12h without contact |
| `/api/cron/check-stale-deals` | Daily 6am UTC (`0 6 * * *`) | 7-day reminders, 14-day alerts, 45-day auto-close |

**Next Session Tasks:**
- [ ] Verify user has configured Attio webhook and Vercel env vars
- [ ] Export fresh Salesforce CSVs (day of cutover)
- [ ] Run data cleaning to generate fresh `data/cleaned/` files
- [ ] Clear Attio and re-run V2 migrations (final sync)
- [ ] Merge `attio-migration` → `main`
- [ ] Verify cron jobs appear in Vercel dashboard
- [ ] Test end-to-end lead flow on production
- [ ] Monitor for 24-48 hours post-cutover

**Reference:**
- Full cutover instructions: `docs/CUTOVER-PLAN.md`
- Vercel cron docs: https://vercel.com/docs/cron-jobs
- Attio webhook docs: https://docs.attio.com/rest-api/guides/webhooks

---

### 2024-12-29 - Documentation & Planning Complete

**Platform:** Claude Code CLI
**Duration:** ~2 hours
**Status:** ✅ Phase 2 Complete

**Completed:**
- ✅ Updated CLAUDE.md with correct 18-character RecordTypeIds
- ✅ Updated LLD.md Section 9 with field mappings and RecordType reference
- ✅ Updated HLD.md Section 8.2 with Contact join transformation
- ✅ Updated PRD.md Section 11 with accurate success metrics
- ✅ Created docs/migration/ATTIO-SETUP-GUIDE.md (comprehensive UI setup guide)

**Key Discoveries:**
- Account.Person_Account_Email__c is EMPTY - must join via Contact.csv
- RecordTypeIds must be FULL 18 characters (not truncated 15)
- ALL 663 area assignments are valid (CEO prepopulated, no orphans)
- 117 internship records to preserve (113 agents + 4 lenders, 2021-2025)
- 3 separate pipelines needed: Agent Onboarding, Lender Onboarding, Customer Deals

**Decisions Made:**
- Use "Customer" not "Client" throughout codebase
- Keep ALL 663 area assignments (396 active agents + 115 inactive + 152 lenders)
- Add State object with state_slug for URL decoupling
- Include Puerto Rico (PR) as a state

**Files Modified:**
- CLAUDE.md (added Session Management section)
- docs/migration/HLD.md (updated Section 8.2)
- docs/migration/LLD.md (updated Section 9)
- docs/migration/PRD.md (updated Section 11)
- docs/migration/ATTIO-SETUP-GUIDE.md (new - comprehensive UI guide)
- SESSION-NOTES.md (new - this file)
- RESUME.md (new - quick start guide)

**Git Commits:**
- fa624c85a1a3ab374bd8ea4be2fad3a6036ef40c (fa624c8)
  - "Session checkpoint: Phase 2 complete - docs updated, session management added"
  - Pushed to origin/attio-migration successfully
  - 12 files changed, 1407 insertions(+), 3 deletions(-)

**Linear Integration:**
- Discussed Linear MCP server configuration
- User manually created Linear ticket for Attio UI setup
- MCP configuration NOT completed this session (optional enhancement for future)
- Can configure Linear MCP later if needed for automated task creation

**Session End Discussion:**
- User asked whether to end session or keep running during Attio UI setup
- Recommended: END SESSION (clean break point between Phase 2 and Phase 3)
- Session management system designed for this exact scenario
- Next session will resume seamlessly via RESUME.md and SESSION-NOTES.md

**Next Session Tasks:**
1. ✅ **First Action**: Read RESUME.md and SESSION-NOTES.md automatically
2. ❓ **Ask User**: "Have you completed the Attio UI setup from docs/migration/ATTIO-SETUP-GUIDE.md?"
3. **If YES** → Start implementing scripts/clean-data.ts
4. **If NO** → Wait or work on alternative tasks (planning, documentation improvements)
5. **Verify**: All 9 Attio objects/pipelines created with exact API slugs

**Environment Notes:**
- .env.local has ATTIO_API_KEY configured
- Working directory: /Users/harperfoley/VPCS/vpcs-nextjs-website
- Node.js and TypeScript ready
- CSV files in data/salesforce/

---

## 2026-01-10 - Schema Automation & Migration Scripts Complete

**Platform:** Claude Code CLI
**Duration:** ~3 hours
**Status:** ✅ Phase 3b Complete

**Completed:**
- ✅ Added bidirectional references to schema (State.areas, Area.area_assignments)
- ✅ Fixed Attio API issues (description, config fields, currency format, email-address type)
- ✅ Successfully ran setup-attio-schema.ts - created 6/6 objects, 3/3 pipelines
- ✅ Created all migration scripts:
  - scripts/migrate-states.ts (52 states)
  - scripts/migrate-agents.ts (1,039 agents with Contact join)
  - scripts/migrate-lenders.ts (141 lenders)
  - scripts/migrate-state-lenders.ts (152 lender→State assignments)
  - scripts/migrate-areas.ts (updated for bidirectional refs)
  - scripts/migrate-area-assignments.ts (511 agent-only assignments)
  - scripts/migrate-customers.ts (~983 customers)
  - scripts/migrate-customer-deals.ts (1,021 deals)
  - scripts/migrate-agent-onboarding.ts (947 records, 113 internships)
  - scripts/migrate-lender-onboarding.ts (160 records, 4 internships)
- ✅ Updated lib/attio.ts with list entry methods (createListEntry, updateListEntry, queryListEntries)

**Key Discoveries:**
- Attio API requires `description` and `config` fields for attributes
- Attio lists require `workspace_access: 'full-access'` and `workspace_member_access: []`
- `email-address` attribute type not supported - use `text` instead
- Currency config needs `default_currency_code` + `display_type` (not `currency_code`)
- List attributes cannot have `is_required: true`
- **FIXED:** Pipeline stages CAN be created via API (see API Fix section below)

**API Fix - Stages/Statuses:**
- Original endpoint `POST /v2/lists/{slug}/statuses` returns 404
- **Correct approach:** Create `status` type attribute, then add statuses to it
- Endpoint: `POST /lists/{slug}/attributes/{status_attr}/statuses`
- Status attributes require `config: {}` in request body

**Files Created:**
- scripts/migrate-states.ts
- scripts/migrate-agents.ts
- scripts/migrate-lenders.ts
- scripts/migrate-state-lenders.ts
- scripts/migrate-area-assignments.ts
- scripts/migrate-customers.ts
- scripts/migrate-customer-deals.ts
- scripts/migrate-agent-onboarding.ts
- scripts/migrate-lender-onboarding.ts

**Files Modified:**
- lib/attio-schema.ts (bidirectional refs, fixed types)
- lib/attio.ts (list entry methods, API fixes)
- scripts/migrate-areas.ts (bidirectional State.areas update)

**Attio Objects Created:**
1. agents - 18 attributes
2. lenders - 22 attributes
3. customers - 13 attributes
4. states - 6 attributes (including areas[] and lenders[])
5. areas - 6 attributes (including area_assignments[])
6. area_assignments - 5 attributes

**Attio Pipelines Created:**
1. agent_onboarding (parent: agents)
2. lender_onboarding (parent: lenders)
3. customer_deals (parent: customers)

**Next Session Tasks:**
- [x] ~~Create pipeline stages manually in Attio UI~~ **DONE VIA API**
  - All 25 stages created programmatically (8 + 8 + 9)
- [ ] Run migration scripts in order:
  1. migrate-states.ts
  2. migrate-agents.ts
  3. migrate-lenders.ts
  4. migrate-state-lenders.ts
  5. migrate-areas.ts
  6. migrate-area-assignments.ts
  7. migrate-customers.ts
  8. migrate-customer-deals.ts
  9. migrate-agent-onboarding.ts
  10. migrate-lender-onboarding.ts
- [ ] Validate migration counts match expected

**Git Commits:**
- 2c1f40f - "Phase 3b complete: Schema automation & all migration scripts"
  - Pushed to origin/attio-migration successfully
  - 17 files changed, 3170 insertions(+), 141 deletions(-)

**Notes:**
- Use `npx tsx` not `npx ts-node` (ESM module resolution issue)
- Schema setup script is idempotent - safe to re-run
- All ~80 attributes successfully created via API

---

## 2026-01-10 (continued) - API Fixes & Owner Attributes

**Platform:** Claude Code CLI
**Duration:** ~1 hour
**Status:** ✅ Complete

**Completed:**
- ✅ Fixed Attio stage/status creation API (discovered correct endpoint)
- ✅ All 25 pipeline stages created via API (no manual UI needed!)
- ✅ Added `owner` (actor-reference) attribute to all 3 pipelines
- ✅ Researched Lists vs Deals - confirmed Lists have full feature parity
- ✅ Updated lib/attio.ts with status attribute management methods

**Key Decisions:**
- **Keep custom Lists** instead of native Deals for customer transactions
  - Lists have identical functionality (stages, owner assignment, webhooks)
  - Custom Lists allow `record-reference` to our custom objects (agents, lenders, areas)
  - No features lost - `actor-reference` type enables admin assignment
- **Added owner attribute** to all pipelines for team member assignment

**Files Modified:**
- lib/attio.ts (added getListAttributes, getListStatusAttribute, ensureListStatusAttribute, getListStatuses methods)
- lib/attio-schema.ts (added owner attribute to all pipeline definitions)
- SESSION-NOTES.md, RESUME.md (documentation updates)

**Git Commits:**
- c7f5d60 - "Fix Attio status/stage creation via API"
- 2aebd96 - "Update docs: no more manual Attio UI steps needed"
- b79c99f - "Add owner (actor-reference) attribute to all pipelines"

**API Discovery:**
```typescript
// Create status attribute on list
POST /lists/{slug}/attributes
{ type: 'status', api_slug: 'stage', config: {} }

// Add statuses to that attribute
POST /lists/{slug}/attributes/stage/statuses
{ title: 'New Lead', celebration_enabled: false }
```

**Next Steps:**
- Ready to execute migration scripts (all 10 scripts ready)
- Execution order documented in RESUME.md

---

## 2026-01-11 - Phase 4a: Core Data Migration Complete

**Platform:** Claude Code CLI
**Duration:** ~3 hours
**Status:** ✅ Phase 4a Complete

**Completed:**
- ✅ migrate-states.ts - 52 states created (50 states + DC + PR)
- ✅ migrate-agents.ts - 1,026 created, 6 phone errors, 7 duplicate emails
- ✅ migrate-lenders.ts - 139 created, 2 phone errors (1 real: Mark Ambrose)
- ✅ migrate-state-lenders.ts - 51 states updated, 152 lender assignments
- ✅ migrate-areas.ts - 271 areas created, 51 states with bidirectional refs
- ✅ migrate-area-assignments.ts - 506 created, 3 skipped (missing agents)
- ✅ migrate-customers.ts - 953 created, 12 phone errors, 18 skipped (no email)
- ✅ Fixed 3 critical Attio API issues (see API Fixes below)
- ✅ Created fix-area-assignment-status-options.ts script
- ✅ Created post-migration review docs for manual follow-up

**API Fixes (Key Learnings):**

1. **RecordTypeId 15-char vs 18-char:**
   - Salesforce CSV exports use 15-character case-sensitive IDs
   - Documented 18-char IDs won't match - use 15-char versions
   - Fix: `0124x000000ZGGZAA4` → `0124x000000ZGGZ`

2. **Missing target_object on record references:**
   - Attio API requires BOTH `target_object` AND `target_record_id`
   - Error: `"Missing target_object on record reference value"`
   - Fix: `{ target_record_id: id }` → `{ target_object: 'objectSlug', target_record_id: id }`

3. **Select options must be created separately:**
   - Select options cannot be created inline during attribute creation
   - Must use dedicated endpoint: `POST /objects/{obj}/attributes/{attr}/options`
   - Created `createSelectOption()` and `getSelectOptions()` methods in lib/attio.ts
   - Created fix script to add missing options

**Files Created:**
- scripts/fix-area-assignment-status-options.ts
- docs/post-migration-review/agents-review.md
- docs/post-migration-review/lenders-review.md
- docs/post-migration-review/area-assignments-review.md
- docs/post-migration-review/customers-review.md

**Files Modified:**
- lib/attio.ts (added createSelectOption, getSelectOptions methods)
- scripts/migrate-state-lenders.ts (fixed RecordTypeId, target_object)
- scripts/migrate-areas.ts (fixed target_object in state ref and bidirectional update)
- scripts/migrate-area-assignments.ts (fixed target_object in all refs)
- CLAUDE.md (added migration progress table, Attio API Notes section)
- data/mappings/*.json (6 mapping files created)

**Migration Progress:**
| Object | Expected | Created | Errors | Notes |
|--------|----------|---------|--------|-------|
| States | 52 | 52 | 0 | ✅ Complete |
| Agents | 1,039 | 1,026 | 13 | 6 phone, 7 dup email |
| Lenders | 141 | 139 | 2 | Phone format errors |
| State-Lenders | 152 | 152 | 0 | ✅ Complete |
| Areas | ~271 | 271 | 0 | ✅ Complete |
| Area Assignments | 511 | 506 | 3 | Missing agent refs |
| Customers | ~983 | 953 | 30 | 12 phone, 18 no email |

**Git Commits:**
- [Pending - will commit after this update]

**Next Session Tasks:**
- [ ] Run migrate-customers.ts (~983 customers)
- [ ] Run migrate-customer-deals.ts (1,021 deals)
- [ ] Run migrate-agent-onboarding.ts (947 records)
- [ ] Run migrate-lender-onboarding.ts (160 records)
- [ ] Address skipped records from review docs
- [ ] Create validation script

**Notes:**
- Pipeline migrations may need similar select option fixes
- Review docs in docs/post-migration-review/ list all records needing manual attention
- All mapping files saved to data/mappings/ for reference lookups

---

## 2026-01-12 - Customer Deals Migration & Attio API Fixes

**Platform:** Claude Code CLI
**Duration:** ~2 hours
**Status:** ✅ Phase 4b Partial Complete

**Completed:**
- ✅ Migrated customer deals pipeline - 975/1,021 created
- ✅ Fixed critical Attio API status handling bug in lib/attio.ts
- ✅ Added missing Attio attributes: charity_amount, deal_name, destination_state
- ✅ Created delete-customer-deals.ts script for cleanup
- ✅ Updated lib/attio-schema.ts with new attributes
- ✅ Fixed stage mapping to match actual Salesforce values

**Blockers:**
- None

**Key API Discoveries (CRITICAL):**

1. **Status/Stage Setting for List Entries:**
   - `status_title` at top level is IGNORED by Attio API
   - Status must be inside `entry_values` using attribute slug
   - Format: `{ stage: { status: "Status Title" } }` NOT `{ title: "..." }`

2. **First Migration Attempt Failed Silently:**
   - 976 deals created with NO stages (all in "No Stage" section)
   - Financial data was missing due to incomplete field mappings
   - Deal names were Attio auto-generated IDs

3. **Root Causes Fixed:**
   - STAGE_MAP used "Tracking 6+mo" but Salesforce has "Tracking 6+"
   - Missing fields in OpportunityRow interface: Name, Charity_Amount__c, Destination_State__c
   - createListEntry used wrong status format

**Migration Results - Customer Deals:**
| Metric | Count |
|--------|-------|
| Successfully created | 975 |
| API errors | 1 (transient 500) |
| Skipped (no customer mapping) | 45 |
| Total in Salesforce | 1,021 |

**Files Created:**
- scripts/delete-customer-deals.ts

**Files Modified:**
- lib/attio.ts (fixed createListEntry and updateListEntry status handling)
- lib/attio-schema.ts (added charity_amount, deal_name, destination_state)
- scripts/migrate-customer-deals.ts (fixed stage map, interface, field mappings)
- CLAUDE.md (updated migration progress, added API learnings)

**API Fix Applied to lib/attio.ts:**
```typescript
// BEFORE (broken - status silently ignored)
if (statusTitle) {
  body.data.status_title = statusTitle;
}

// AFTER (working - status inside entry_values)
if (statusTitle) {
  entryValues[statusAttrSlug] = { status: statusTitle };
}
```

**Verification Completed:**
- Deals have proper stages (Paid Complete, Closed Lost, Tracking stages)
- Human-readable names (e.g., "Rainy Lehman-GA")
- Financial data populated: sale_price, payout_amount, charity_amount

**Git Commits:**
- [Pending this session]

**Next Session Tasks:**
- [ ] Review migration data quality issues
- [ ] Decide: keep current migration or redo with fixes
- [ ] Run migrate-agent-onboarding.ts (947 records)
- [ ] Run migrate-lender-onboarding.ts (160 records)
- [ ] Create customer-deals-review.md for 46 skipped records

**Notes:**
- The 45 skipped deals are for customers who weren't migrated (no email or phone errors)
- Agent/Lender onboarding scripts will benefit from fixed status handling
- May need to discuss data quality before proceeding

---

## 2026-01-13 - Data Quality Fixes & Area Assignments Migration

**Platform:** Claude Code CLI
**Duration:** ~1.5 hours
**Status:** ✅ Complete

**Completed:**
- ✅ Ran area assignments migration - 503 created, 0 errors, 6 skipped
- ✅ Updated 243 areas with bidirectional area_assignments references
- ✅ Updated CLAUDE.md with new API learnings (#9 name attribute, #10 Contact vs Account fields)
- ✅ Updated migration progress table with accurate counts

**Context from Previous Sessions:**
This session was a continuation after context compaction. Previous sessions had:
- Fixed data quality issues (customer names showing UUIDs, missing military/bio fields)
- Added `name` attribute to agents, lenders, and customers objects
- Re-ran migrations with correct Contact.csv field mappings for military/bio data
- Ran lenders migration (139 created), customers migration (953 created), state-lenders (51 states)

**Key API Discovery - Name Attribute:**
- Attio UI displays record names based on a `name` attribute
- Without it, records show auto-generated UUIDs like "d6b6f9a3-3b49-458e..."
- Solution: Add `name` text attribute and populate with `${firstName} ${lastName}`
- All migration scripts now include `name` field in createRecord calls

**Key Data Discovery - Contact vs Account Fields:**
- Account.csv x-prefixed fields (xMilitary_Service__c, etc.) are **0% populated**
- Contact.csv non-prefixed fields have actual data:
  - Military_Service__c: ~56% populated
  - Military_Status__c: ~57% populated
  - Agent_Bio__c: ~24% populated
- Migration scripts updated to use Contact fields with Account fallback

**Files Modified:**
- CLAUDE.md (migration progress, API learnings #9 and #10)
- SESSION-NOTES.md (this session entry)

**Migration Results - Area Assignments:**
| Metric | Count |
|--------|-------|
| Successfully created | 503 |
| Errors | 0 |
| Skipped (missing agent mapping) | 6 |
| Areas updated with bidirectional refs | 243 |

**Git Commits:**
- 3c8563d - "Session checkpoint: Area assignments migration + documentation updates"

**Next Session Tasks:**
- [ ] Run migrate-agent-onboarding.ts (947 records, 113 internships)
- [ ] Run migrate-lender-onboarding.ts (160 records, 4 internships)
- [ ] Create validation script to verify migration completeness
- [ ] Address skipped records from review docs

**Notes:**
- 6 area assignments skipped due to agents not in mapping (likely from phone validation errors during agent migration)
- Area assignments script also updates Area.area_assignments for bidirectional references
- All core data migrations complete - only onboarding pipelines remain

---

## 2026-01-13 - Agent Commission Attribute Type Fix

**Platform:** Claude Code CLI
**Duration:** ~1 hour
**Status:** ✅ Complete

**Completed:**
- ✅ Diagnosed agent commission display issue (showing "$2.75" instead of "2.75")
- ✅ Discovered root cause: attribute created as `currency` type instead of `number`
- ✅ Created `scripts/fix-commission-attribute.ts` script
- ✅ Archived old `agent_commission` attribute (currency type)
- ✅ Created new `commission_percent` attribute (number type)
- ✅ Repopulated 1,909 commission values to new attribute
- ✅ Verified fix - attribute now displays as plain number

**Blockers:**
- None

**Decisions Made:**
- Keep new attribute slug `commission_percent` (more accurate than `agent_commission`)
- Old `agent_commission` attribute archived (not deleted - Attio API doesn't support deletion)
- Commission values stored as whole percentages (e.g., 2.75 for 2.75%)

**Key API Discoveries:**
1. **Cannot DELETE attributes via Attio API** - only archive them
2. **Archived attributes still occupy their slug** - must use new slug for replacement
3. **Can PATCH attributes to archive:** `is_archived: true`

**Files Created:**
- scripts/fix-commission-attribute.ts
- data/backups/commission-backup.json (1,983 entries backed up)

**Files Modified:**
- [Session documentation updates pending]

**Schema Changes:**
- Old: `agent_commission` (type: currency) - ARCHIVED
- New: `commission_percent` (type: number) - ACTIVE
- Display: "2.75" instead of "$2.75"

**Git Commits:**
- [Pending]

**Next Session Tasks:**
- [ ] Run migrate-agent-onboarding.ts (947 records, 113 internships)
- [ ] Run migrate-lender-onboarding.ts (160 records, 4 internships)
- [ ] Create validation script

**Notes:**
- Customer re-migration was completed earlier this session (985 customers, 1,007 deals)
- Total customer_deals entries now: 1,983
- Commission values preserved correctly during attribute type change

---

## 2026-01-13 - Onboarding Pipelines Migration Complete

**Platform:** Claude Code CLI
**Duration:** ~30 minutes
**Status:** ✅ Complete

**Completed:**
- ✅ Ran migrate-agent-onboarding.ts - 913 created, 1 transient error, 33 skipped
- ✅ Ran migrate-lender-onboarding.ts - 158 created, 0 errors, 2 skipped
- ✅ All 117 internship records migrated (113 agents + 4 lenders)
- ✅ All pipeline stages populated correctly

**Blockers:**
- None

**Decisions Made:**
- Skipped records are from agents/lenders that failed earlier migrations (phone validation)
- Will address skipped records via post-migration review docs

**Migration Results - Agent Onboarding:**
| Metric | Count |
|--------|-------|
| Successfully created | 913 |
| Transient errors | 1 (Attio 502) |
| Skipped (missing agent mapping) | 33 |
| Total in Salesforce | 947 |
| Internships migrated | 113 |

**Migration Results - Lender Onboarding:**
| Metric | Count |
|--------|-------|
| Successfully created | 158 |
| Errors | 0 |
| Skipped (missing lender mapping) | 2 |
| Total in Salesforce | 160 |
| Internships migrated | 4 |

**Files Modified:**
- SESSION-NOTES.md (this entry)
- CLAUDE.md (migration progress table)

**Git Commits:**
- 76e2692 - "Phase 4 complete: All data migrations finished"

**Next Session Tasks:**
- [x] Create validation script to verify migration completeness
- [ ] Address skipped records from post-migration review docs
- [ ] Manual review of records with phone validation errors

**Notes:**
- All 10 migration scripts have now been executed
- Phase 4 data migration is COMPLETE
- 35 total skipped onboarding records (33 agents + 2 lenders) need manual attention
- These correspond to the agents/lenders that failed original migration due to phone format issues

---

## 2026-01-13 - Validation, Deduplication & Data Cleanup

**Platform:** Claude Code CLI
**Duration:** ~1.5 hours
**Status:** ✅ Complete

**Completed:**
- ✅ Created `scripts/validate-migration.ts` - comprehensive validation script
- ✅ Discovered duplicate records from re-migration (customers and deals)
- ✅ Created `scripts/deduplicate-records.ts` - safe deduplication script
- ✅ Verified duplicates had IDENTICAL business data before deletion
- ✅ Removed 953 duplicate customers (cascade-deleted associated deals)
- ✅ Final validation passed - all counts correct

**Blockers:**
- None

**Decisions Made:**
- Verified duplicates thoroughly before deletion (compared all business fields)
- Confirmed Attio has cascade delete - deleting customers auto-deletes linked deals
- Kept validation and deduplication scripts for future use

**Duplicate Analysis Results:**
| Object | Before | After | Duplicates Removed |
|--------|--------|-------|-------------------|
| Customers | 1,938 | 985 | 953 |
| Customer Deals | 1,983 | 1,007 | 976 (cascade) |

**Validation Script Checks:**
- Record counts vs expected
- Stage distribution across pipelines
- Field completeness (name, email, salesforce_id)
- Reference integrity (agent→area, customer→deal)
- Duplicate detection with duplicate warning

**Files Created:**
- scripts/validate-migration.ts
- scripts/deduplicate-records.ts

**Files Removed (cleanup):**
- scripts/check-duplicates.ts (temporary)
- scripts/verify-duplicates.ts (temporary)

**Git Commits:**
- 4778968 - "Add validation and deduplication scripts for migration"

**Final Migration State:**
| Object | Count | Status |
|--------|-------|--------|
| States | 52 | ✅ |
| Agents | 1,025 | ✅ |
| Lenders | 139 | ✅ |
| Areas | 271 | ✅ |
| Area Assignments | 503 | ✅ |
| Customers | 985 | ✅ |
| Customer Deals | 1,007 | ✅ |
| Agent Onboarding | 913 | ✅ |
| Lender Onboarding | 158 | ✅ |

**Next Session Tasks:**
- [ ] Address skipped records from post-migration review docs
- [ ] Manual review of records with phone validation errors
- [ ] Begin Phase 5: API routes and webhook implementation

**Notes:**
- Phase 4 Data Migration is now FULLY COMPLETE and VALIDATED
- All duplicates removed, data integrity verified
- Ready to move to Phase 5 (API implementation)

---

## 2026-01-14 - Phase 5 Planning: Website Integration & Cutover

**Platform:** Claude Code CLI
**Duration:** ~2 hours
**Status:** ✅ Complete

**Completed:**
- ✅ Comprehensive Phase 5 implementation planning
- ✅ Identified critical gap: website data layer missing from original plan
- ✅ Discovered correct Attio query API syntax (MongoDB-style operators)
- ✅ Updated CLAUDE.md with Phase 5 status, architecture, and Attio query best practices
- ✅ Created detailed plan file: `~/.claude/plans/idempotent-conjuring-hammock.md`
- ✅ Resolved all outstanding questions with user decisions

**Blockers:**
- None

**Key Decisions Made:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Contact Form Strategy | Minimal first, enhance later | Get existing forms working with Attio, then build multi-step UX in future phase |
| Image Lookup | Continue using salesforce_id | Simplest - no Sanity schema changes needed |
| Cutover Strategy | Hard cutover | Final Salesforce sync right before merge to main |
| Form Architecture | Refactor service file directly | No new API route needed - existing form components call service file |
| SignWell | Deferred | Focus on Attio + OpenPhone first |

**Critical Gap Identified & Resolved:**
- **Problem:** Original plan jumped to lead flows without addressing how website reads data
- **Discovery:** Website uses `services/stateService.tsx` to fetch agents/lenders from Salesforce
- **Solution:** Added Phase 5B (Website Data Layer) to refactor stateService for Attio

**Attio Query API Discovery:**

```typescript
// WRONG (was in original plan)
{ field: 'email', equals: 'test@example.com' }

// CORRECT (MongoDB-style operators)
{ filter: { email: { $eq: 'test@example.com' } } }

// Multiple conditions
{ filter: { $and: [
  { area: { $eq: areaId } },
  { status: { $eq: 'Active' } }
]}}
```

**Phase 5 Implementation Order:**

| Phase | Focus | Files |
|-------|-------|-------|
| 5A | Utility Libraries | lib/magic-link.ts, lib/slack.ts, lib/openphone.ts |
| 5B | Website Data Layer | services/stateService.tsx, app/api/v1/areas/route.ts |
| 5C | Contact Form Migration | salesForcePostFormsService.tsx, magic-link routes |
| 5D | Webhooks & Automations | Attio webhook, stale leads/deals crons |

**Files Modified:**
- CLAUDE.md (Phase 5 status, Attio query syntax, architecture section)
- SESSION-NOTES.md (this entry)
- ~/.claude/plans/idempotent-conjuring-hammock.md (new plan file)

**Git Commits:**
- [Pending this session]

**Next Session Tasks:**
- [ ] Phase 5A: Create lib/magic-link.ts (JWT utilities)
- [ ] Phase 5A: Create lib/slack.ts (Slack notifications)
- [ ] Phase 5A: Create lib/openphone.ts (SMS via OpenPhone)
- [ ] Phase 5B: Refactor services/stateService.tsx for Attio
- [ ] Phase 5B: Refactor app/api/v1/areas/route.ts for Attio
- [ ] Phase 5C: Refactor salesForcePostFormsService.tsx for Attio

**Notes:**
- Components are data-agnostic - only service layer needs to change
- Website will continue using salesforce_id for Sanity image lookups
- Hard cutover planned: pull fresh Salesforce data right before merge to main
- SignWell integration deferred to future phase

**Cutover Checklist (Before Merge to Main):**
1. Pull latest Salesforce CSVs
2. Run delta migration scripts for new/updated records
3. Run validation scripts to verify data completeness
4. Merge to main during low-traffic period
5. Monitor for 24-48 hours post-cutover
6. Keep Salesforce integration code in backup branch (not deleted)

---

## 2026-01-14 - Phase 5 Implementation: Website Attio Integration Complete

**Platform:** Claude Code CLI
**Duration:** ~4 hours (across context compaction)
**Status:** ✅ Complete

**Completed:**
- ✅ Phase 5A: Utility libraries (magic-link, slack, openphone)
- ✅ Phase 5B: Website data layer refactored for Attio
- ✅ Phase 5C: Contact forms + magic-link API routes
- ✅ Phase 5D: Webhook handler + cron jobs for stale leads/deals

**Blockers:**
- None

**Phase 5A - Utility Libraries:**
- `lib/magic-link.ts` - JWT generation/validation (48h expiry)
- `lib/slack.ts` - Slack webhook notifications (alerts, errors, deal closed)
- `lib/openphone.ts` - SMS via OpenPhone API (lead notifications, reminders)

**Phase 5B - Website Data Layer:**
- Refactored `services/stateService.tsx` - agents/lenders now fetched from Attio
- Refactored `app/api/v1/areas/route.ts` - areas queried from Attio
- Fixed Attio API query syntax issues (record reference fields, ID filtering)

**Phase 5C - Contact Forms:**
- Refactored `salesForcePostFormsService.tsx` - all 8 form functions now use Attio
- Created `GET /api/magic-link/validate` - validates agent portal tokens
- Created `POST /api/magic-link/update` - updates deals via magic link

**Phase 5D - Webhooks & Automations:**
- Created `POST /api/webhooks/attio` - cache revalidation on record updates
- Created `GET /api/cron/check-stale-leads` - 12h lead re-routing
- Created `GET /api/cron/check-stale-deals` - 7d/14d/45d deal monitoring

**Key API Discoveries:**

1. **Attio record reference field queries require nested syntax:**
   ```typescript
   // WRONG - causes "Filter cannot omit field" error
   { state: { $eq: stateId } }

   // CORRECT - must use target_record_id
   { state: { target_record_id: { $eq: stateId } } }
   ```

2. **Attio cannot filter by record UUID:**
   - `{ id: { $in: ['uuid1', 'uuid2'] } }` returns "Unknown attribute slug: id"
   - Solution: Fetch all matching records, filter in memory using Set

**Files Created:**
- lib/magic-link.ts
- lib/slack.ts
- lib/openphone.ts
- app/api/magic-link/validate/route.ts
- app/api/magic-link/update/route.ts
- app/api/webhooks/attio/route.ts
- app/api/cron/check-stale-leads/route.ts
- app/api/cron/check-stale-deals/route.ts

**Files Modified:**
- services/stateService.tsx (Attio queries)
- services/salesForcePostFormsService.tsx (complete rewrite)
- app/api/v1/areas/route.ts (Attio queries)

**Git Commits:**
- 7daa20d - "Phase 5A+5B: Utility libraries + Website data layer for Attio"
- 14c9586 - "Phase 5C: Complete website Attio integration"
- 829c4ad - "Phase 5D: Add Attio webhook handler and cron jobs"

**Next Session Tasks:**
- [ ] Configure Attio webhooks in Attio dashboard
- [ ] Set up cron jobs (Vercel cron or external scheduler)
- [ ] Test end-to-end lead flow
- [ ] Final cutover preparation

**Notes:**
- Website now reads ALL data from Attio (agents, lenders, areas)
- Forms create customers and deals directly in Attio
- Magic links enable agent portal access
- Stale lead re-routing and deal monitoring fully automated
- Ready for final testing and cutover to production

---

## 2026-01-16 - Agent Data Quality Fixes & Lender Display Bug

**Platform:** Claude Code CLI
**Duration:** ~1.5 hours
**Status:** ✅ Complete

**Completed:**
- ✅ Recovered from crashed session - identified license_number attribute was added to Attio
- ✅ Created backfill script for agent license numbers (778 agents updated)
- ✅ Investigated brokerage/broker data - discovered Contact.csv has the real data
- ✅ Created backfill script for brokerage/broker/active fields (978 agents updated)
- ✅ Updated migrate-agents.ts to use Contact fields as primary source
- ✅ Updated lib/attio-schema.ts with license_number attribute
- ✅ Fixed lender brokerage name display bug on state pages

**Blockers:**
- None

**Key Discovery - Contact vs Account Fields:**
Same pattern as military_service and bio - Contact.csv has the populated data:

| Field | Account.csv | Contact.csv |
|-------|-------------|-------------|
| Brokerage Name | 12.6% (Website) | **81.4%** (Brokerage_Name__c) |
| Active on Website | 49.6% (Added_to_Website_Date__c) | **98.5%** (Active_on_Website__c) |
| Managing Broker Name | 0% | **41.3%** |
| Managing Broker Email | 0% | **40.2%** |
| Managing Broker Phone | 0% | **35.4%** |
| License Number | N/A | **79%** |

**Lender Display Bug Fix:**
- stateService was using `lender.company_name` (empty) instead of `lender.brokerage_name` (populated)
- Lenders have both fields but only `brokerage_name` was migrated from Salesforce
- Fixed: `Brokerage_Name__pc: lender.brokerage_name || lender.company_name || ""`

**Files Created:**
- scripts/backfill-agent-license-numbers.ts
- scripts/backfill-agent-brokerage-info.ts

**Files Modified:**
- scripts/migrate-agents.ts (Contact fields as primary source)
- lib/attio-schema.ts (added license_number attribute)
- services/stateService.tsx (fixed lender brokerage name mapping)

**Git Commits:**
- dda730f - "Fix agent data quality: add license_number, fix brokerage/broker fields"
- c539121 - "Update session notes with data quality fixes session"
- a0ee57f - "Fix lender brokerage name display on state pages"

**Migration Results:**

| Backfill | Updated | Skipped | Errors |
|----------|---------|---------|--------|
| License Numbers | 778 | 206 (no license in Contact) | 0 |
| Brokerage/Broker Info | 978 | 5 (no data) | 1 (phone validation) |

**Next Session Tasks:**
- [ ] Configure Attio webhooks in Attio dashboard
- [ ] Set up cron jobs (Vercel cron or external scheduler)
- [ ] Test end-to-end lead flow
- [ ] Final cutover preparation

**Notes:**
- 12 agents with license numbers weren't migrated (failed original migration due to phone/email errors)
- The license_number attribute was successfully created in Attio before previous session crashed
- Person Account pattern: Contact record holds working data, Account holds master record
- Lenders use `brokerage_name` field (not `company_name`) for company display

---

## 2026-01-17 - V2 Re-Migration: Cleaned Data Upload

**Platform:** Claude Code CLI
**Duration:** ~2 hours
**Status:** ✅ Complete

**Completed:**
- ✅ Deleted all Attio data (except States) per re-migration plan
- ✅ Created 9 new V2 migration scripts reading from `data/cleaned/` CSV files
- ✅ Created `scripts/rebuild-mappings.ts` to rebuild mappings from Attio data
- ✅ Ran all V2 migrations successfully
- ✅ Fixed multiple script issues discovered during migration

**Blockers:**
- None

**Context:**
This session implemented the re-migration plan (`~/.claude/plans/robust-purring-octopus.md`) to:
- Fix 20+ records that failed original migration (phone format errors in cleaned data)
- Remove test records (AGENT SAMPLE, LENDER SAMPLE, etc.)
- Use simplified cleaned CSV format (pre-merged, pre-filtered data)

**Script Issues Fixed During Migration:**

| Issue | Fix |
|-------|-----|
| ESM module import errors | Moved scripts from `scripts/v2/` to `scripts/`, used `npx tsx` |
| `name` attribute not on area_assignments | Removed from createRecord call |
| `lead_source` not on customers | Removed from createRecord call |
| `states_licensed` select options missing | Commented out field (not configured in Attio) |
| `name`, `commission_percent` not on onboarding pipelines | Removed from createListEntry calls |
| `Closed Won`, `Interested`, `New` stages don't exist on onboarding | Skip setting stage for unknown values |
| Mapping files incomplete (only new records) | Created rebuild-mappings.ts to pull all records from Attio |

**V2 Migration Results:**

| Entity | Created | Skipped/Errors | Notes |
|--------|---------|----------------|-------|
| States | 52 | 0 | Pre-existing (not deleted) |
| Agents | 1,027 | 6 phone errors | Most were duplicates from previous session |
| Lenders | 138 | 1 phone error | `states_licensed` field skipped |
| Customers | 944 | 35 (phone/no email) | |
| Areas | 271 | 0 | 51 state-level areas filtered |
| State-Lenders | 13 states | 139 skipped | Many lenders not in mapping |
| Area Assignments | 503 | ~160 skipped | Agents not in mapping |
| Customer Deals | 925 | 90 skipped | Customers not in mapping |
| Agent Onboarding | 902 | 45 skipped | Agents not in mapping |
| Lender Onboarding | 138 | 22 skipped | Lenders not in mapping |

**Files Created:**
- scripts/migrate-agents-v2.ts
- scripts/migrate-lenders-v2.ts
- scripts/migrate-customers-v2.ts
- scripts/migrate-areas-v2.ts
- scripts/migrate-state-lenders-v2.ts
- scripts/migrate-area-assignments-v2.ts
- scripts/migrate-customer-deals-v2.ts
- scripts/migrate-agent-onboarding-v2.ts
- scripts/migrate-lender-onboarding-v2.ts
- scripts/rebuild-mappings.ts

**Files Modified:**
- scripts/delete-attio-data.ts (added agent_onboarding, lender_onboarding, areas support)

**Mapping Files Rebuilt:**
- data/mappings/agents.json (1,027 entries)
- data/mappings/agents-by-contact.json (1,027 entries)
- data/mappings/lenders.json (138 entries)
- data/mappings/lenders-by-contact.json (138 entries)
- data/mappings/customers.json (944 entries)
- data/mappings/customers-by-contact.json (944 entries)
- data/mappings/areas.json (271 entries)

**Git Commits:**
- [Pending this session]

**Key Learnings:**
1. V2 scripts read from `data/cleaned/` which has pre-normalized phone numbers and merged Contact data
2. Onboarding pipelines have different stages than customer_deals - must check actual Attio schema
3. When running migrations across sessions, must rebuild mapping files from Attio (not just from current run)
4. Many fields from original migration don't exist on Attio objects (name, commission_percent, etc.)

**Next Session Tasks:**
- [ ] Configure Attio webhooks in Attio dashboard
- [ ] Set up cron jobs (Vercel cron or external scheduler)
- [ ] Test end-to-end lead flow
- [ ] Final cutover preparation
- [ ] Commit V2 migration scripts

**Notes:**
- Skipped records are mostly due to phone format errors or missing email in original source data
- The `data/cleaned/` directory contains the master cleaned data files
- V2 scripts are simpler than original scripts (no RecordTypeId filtering, no phone normalization)
- State-lender assignments rebuilt from original Salesforce data (not in cleaned CSVs)

---

## Template for New Sessions

Copy this template when starting a new session:

```markdown
## YYYY-MM-DD - [SESSION TITLE]

**Platform:** Claude Code CLI
**Duration:** [TIME]
**Status:** [🟡 In Progress / ✅ Complete / ❌ Blocked]

**Completed:**
- [ ] Task 1

**Blockers:**
- None

**Decisions Made:**
- [Decisions]

**Files Modified:**
- [Files]

**Git Commits:**
- [Commits]

**Next Session Tasks:**
- [ ] Task 1

**Notes:**
- [Context]
```

---

## Key Reference Files

When resuming work, always review:
1. **RESUME.md** - Quick startup checklist
2. **CLAUDE.md** - Project overview and current status
3. **docs/migration/PRD.md** - Business requirements
4. **~/.claude/plans/floating-booping-puzzle.md** - Migration plan
5. **SESSION-NOTES.md** - This file (session history)

---

## Important Commands

```bash
# Start new session
cd /Users/harperfoley/VPCS/vpcs-nextjs-website
git status
cat RESUME.md
claude-code

# End session
git add .
git commit -m "Session checkpoint: [what you did]"
git push
# Update SESSION-NOTES.md with session summary
```

---

## Migration Script Status

### Original Scripts (v1)
| Script | Status | Records | Notes |
|--------|--------|---------|-------|
| scripts/setup-attio-schema.ts | ✅ Complete | 6 objects, 3 pipelines | All created via API |
| scripts/migrate-states.ts | ✅ Complete | 52/52 | All states created |
| scripts/migrate-agents.ts | ✅ Complete | 1,026/1,039 | 6 phone, 7 dup email |
| scripts/migrate-lenders.ts | ✅ Complete | 139/141 | 2 phone errors |
| scripts/migrate-state-lenders.ts | ✅ Complete | 152 | 51 states updated |
| scripts/migrate-areas.ts | ✅ Complete | 271 | Bidirectional refs done |
| scripts/migrate-area-assignments.ts | ✅ Complete | 503/509 | 6 missing agents, 243 areas updated |
| scripts/migrate-customers.ts | ✅ Complete | 953/983 | 12 phone, 18 no email |
| scripts/migrate-customer-deals.ts | ✅ Complete | 975/1,021 | 1 error, 45 no customer |
| scripts/migrate-agent-onboarding.ts | ✅ Complete | 913/947 | 1 error, 33 skipped (missing agents) |
| scripts/migrate-lender-onboarding.ts | ✅ Complete | 158/160 | 2 skipped (missing lenders) |

### V2 Scripts (from cleaned data)
| Script | Status | Records | Notes |
|--------|--------|---------|-------|
| scripts/migrate-agents-v2.ts | ✅ Complete | 1,027 | From data/cleaned/ |
| scripts/migrate-lenders-v2.ts | ✅ Complete | 138 | states_licensed skipped |
| scripts/migrate-customers-v2.ts | ✅ Complete | 944 | lead_source removed |
| scripts/migrate-areas-v2.ts | ✅ Complete | 271 | 51 state-level filtered |
| scripts/migrate-state-lenders-v2.ts | ✅ Complete | 13 states | From original SF data |
| scripts/migrate-area-assignments-v2.ts | ✅ Complete | 503 | name attr removed |
| scripts/migrate-customer-deals-v2.ts | ✅ Complete | 925 | |
| scripts/migrate-agent-onboarding-v2.ts | ✅ Complete | 902 | Stage skipping for unknown |
| scripts/migrate-lender-onboarding-v2.ts | ✅ Complete | 138 | Stage skipping for unknown |
| scripts/rebuild-mappings.ts | ✅ Complete | - | Rebuilds mappings from Attio |

### Utility Scripts
| Script | Status | Notes |
|--------|--------|-------|
| scripts/delete-attio-data.ts | ✅ Updated | Added onboarding, areas support |
| scripts/delete-customer-deals.ts | ✅ Created | Cleanup utility |
| scripts/add-name-attribute.ts | ✅ Created | Adds name attr to objects |
| scripts/populate-names.ts | ✅ Created | Populates name field |
| scripts/validate-migration.ts | ✅ Complete | Verifies counts, stages, fields, refs |
| scripts/deduplicate-records.ts | ✅ Complete | Removes duplicate records safely |
| scripts/check-attio-data.ts | ✅ Created | Checks current Attio counts |

---

## Data Quality Metrics (Target)

- States: 52 (50 states + DC + PR)
- Areas: 322
- Agents: 1,039 (100% with emails from Contact join)
- Lenders: 141
- Area Assignments: 663 (ALL preserved)
- Customers: ~983
- Customer Deals: 1,021
- Agent Onboarding: 947 (113 internships)
- Lender Onboarding: 160 (4 internships)
