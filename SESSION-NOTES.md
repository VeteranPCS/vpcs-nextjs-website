# VeteranPCS Migration - Session Notes

**Project:** Salesforce → Attio CRM Migration
**Branch:** attio-migration

---

## Current Status

**Phase:** MIGRATION COMPLETE ✅ — E2E test harness ready
**Next:** Create sequences in Attio UI, run test-setup, execute e2e test plan
**Blocked On:** Email sync (Gmail/Microsoft must be synced in Attio for sequences to send)

### Next Steps (in order)
1. **Verify email sync** — Gmail or Microsoft account synced in Attio
2. **Create 14 sequences** in Attio UI → `docs/attio-sequences.md`
3. **Paste 18 email templates** into sequences → `docs/attio-email-templates.md`
4. **Run test setup** → `npx tsx scripts/test-setup.ts`
5. **Execute e2e test plan** → `docs/e2e-test-plan.md`
6. **Run test teardown** → `npx tsx scripts/test-teardown.ts`
7. **Create dedicated Slack channels** → planned channels in `docs/attio-workflows.md` lines 558-567
8. **Enhancement Phase:** Multi-step contact form, area-based agent routing

---

## Recent Sessions

### 2026-03-03 - People Record Integration for Sequence Enrollment

**Status:** ✅ Complete

**Problem:** Attio sequences can only enroll built-in objects (People, Companies). Custom objects (customers, agents, lenders, interns) cannot be enrolled directly. WF1 was failing with "Customer records cannot be enrolled into a sequence."

**Solution:** Create linked People records for every custom object record, deduped by email.

**Files Created:**
- `lib/attio-people.ts` — `findOrCreatePerson()` helper (upserts People record by email)
- `scripts/add-person-attribute.ts` — Schema migration: adds `person` field to 4 custom objects
- `scripts/backfill-people-records.ts` — Links ~2,100 existing records to People records

**Files Modified:**
- `lib/attio-schema.ts` — Added `person` attribute to AGENT, CUSTOMER, INTERN attribute arrays
- `services/salesForcePostFormsService.tsx` — Added `findOrCreatePerson()` calls to all 4 form functions
- `scripts/test-setup.ts` — Creates People records for test agent/lender
- `scripts/test-teardown.ts` — Cleans up People records
- `docs/attio-workflows.md` — Updated enrollment paths to traverse `person` field
- `docs/attio-sequences.md` — Updated Object field to `people`
- `CLAUDE.md` — Added rule #15 (People records), key file, data model section

**Next Steps:**
1. Run `npx tsx scripts/add-person-attribute.ts` — Add `person` field to Attio objects
2. Run `npx tsx scripts/backfill-people-records.ts` — Backfill ~2,100 existing records
3. Update all 8 workflows in Attio UI — Change enrollment recipient to traverse `person` field
4. Re-test WF1 — Verify sequence enrollment succeeds

---

### 2026-02-26 - E2E Test Harness & Headshot Fallback

**Status:** ✅ Complete

**Completed:**
- Added `headshot_url` field to `AttioAgent` and `AttioLender` interfaces in data loader
- Added headshot_url fallback in stateService photo lookup (agents + lenders) — test records without Sanity photos now display via Attio's `headshot_url` field
- Added `placehold.co` to Next.js image remote patterns
- Added `deleteRecord()` method to Attio client
- Created `scripts/test-setup.ts` — creates test agent, lender, area assignment in Colorado with placeholder photos
- Created `scripts/test-teardown.ts` — removes all test records in correct dependency order
- Created `docs/e2e-test-plan.md` — comprehensive manual test checklist for all 8 workflows, 14 sequences
- Added `scripts/test-ids.json` to `.gitignore`

**Files Created:**
- `scripts/test-setup.ts`
- `scripts/test-teardown.ts`
- `docs/e2e-test-plan.md`

**Files Modified:**
- `lib/attio-data-loader.ts` (headshot_url in interfaces + mapping)
- `services/stateService.tsx` (photo fallback logic)
- `next.config.mjs` (placehold.co domain)
- `lib/attio.ts` (deleteRecord method)
- `.gitignore` (test-ids.json)
- `RESUME.md` (updated next steps + key files)
- `SESSION-NOTES.md` (this entry)

---

### 2026-02-25 - Fix WF3b & WF4b Exit-from-Sequence Blocks

**Status:** ✅ Complete

**Completed:**
- Fixed WF3b (Agent Onboarding Stage Changed): Added "Exit from sequence" block between trigger and IF/ELSE to exit agents from Agent Onboarding sequence on any stage change
- Fixed WF4b (Lender Onboarding Stage Changed): Same pattern — added "Exit from sequence" block for Lender Onboarding sequence
- Both workflows re-published and Live
- Updated `docs/attio-workflows.md`: removed Known Gaps section, replaced all ⚠️ warnings with ✅, updated flow diagrams to show Exit blocks, added Exit action to WF3b/WF4b summary rows
- Updated `docs/attio-sequences.md`: replaced all 7 ⚠️ warnings with ✅, standardized workflow naming (Workflow N → WFN)
- Updated `docs/attio-email-templates.md`: fixed 9 stale "Sent via" references from original 5-workflow plan to current 8-workflow naming, fixed incorrect "Send email" in implementation notes, standardized sequence names
- Full cross-reference review: all 8 workflows, 14 sequences, and 18 templates verified consistent

**Key Technique (Attio workflow editor):**
- To insert a block between two connected blocks: Select upstream block → click "Disconnect" in right panel → click green "+" to add new block → drag from new block's output connector to reconnect downstream block

**Files Modified:**
- `docs/attio-workflows.md`
- `docs/attio-sequences.md`
- `docs/attio-email-templates.md`

---

### 2026-02-25 - Attio Workflows Complete (8/8 Live)

**Status:** ✅ Complete

**Completed:**
- Published WF4b: Lender Onboarding Stage Changed (IF Contract Sent → Enroll Lender Contract Ready; ELSE IF Live on Website → Enroll Lender Live + Slack)
- Published WF5a: Intern Placement Created (Enroll in Intern Onboarding + Slack "New Intern Application")
- Published WF5b: Intern Placement Stage Changed (Exit from Intern Onboarding sequence on any stage change)
- All 8 Attio workflows now Live

**Final Workflow Inventory (8 Live):**
| # | Workflow | Trigger | Key Actions |
|---|---------|---------|-------------|
| WF1 | New Customer Deal Created | Record added to customer_deals | Enroll C1/C2/C3 + A1/L1, Slack |
| WF2 | Customer Deal Stage Changed | List entry updated on customer_deals | Enroll C4/C5, Slack |
| WF3a | Agent Onboarding Created | Record added to agent_onboarding | Enroll Agent Onboarding, Slack |
| WF3b | Agent Onboarding Stage Changed | List entry updated on agent_onboarding | Enroll Contract Ready/Live, Slack |
| WF4a | Lender Onboarding Created | Record added to lender_onboarding | Enroll Lender Onboarding, Slack |
| WF4b | Lender Onboarding Stage Changed | List entry updated on lender_onboarding | Enroll Contract Ready/Live, Slack |
| WF5a | Intern Placement Created | Record added to intern_placements | Enroll Intern Onboarding, Slack |
| WF5b | Intern Placement Stage Changed | List entry updated on intern_placements | Exit Intern Onboarding |

**Key Findings:**
- Attio DOES have an "Exit from sequence" block (plan was uncertain about this)
- All trigger/sender/recipient patterns confirmed: "Record added to list" → Added by / Created entry > Parent Record; "List entry updated" → Updated by / Updated entry > Parent Record
- Grant access dialogs appear for each new list/sequence used by a workflow
- Attio auto-generates workflow descriptions on publish

---

### 2026-01-29 - Documentation Cleanup

**Status:** ✅ Complete

**Completed:**
- Cleaned up CLAUDE.md, RESUME.md, SESSION-NOTES.md
- Removed outdated migration execution steps
- Condensed historical session entries
- Preserved key Attio API learnings and architecture documentation

---

### 2026-01-25 - Intern Object & Placement Pipeline

**Status:** ✅ Complete

**Context:**
VeteranPCS's internship program is a **placement/matching service** for transitioning service members seeking to become real estate agents or mortgage lenders. Interns are NOT becoming VeteranPCS agents - they're being connected with independent agents/lenders in the network who can mentor and sponsor them.

**What Was Built:**
- New `interns` object (21 attributes)
- New `intern_placements` pipeline (8 stages)
- Updated form handler to create intern records (not agents)
- All 17 form fields now persisted

**Files Created:**
- `scripts/setup-intern-schema.ts`
- `scripts/add-intern-select-options.ts`

**Files Modified:**
- `lib/attio-schema.ts`
- `services/salesForcePostFormsService.tsx`
- `services/formTrackingService.ts`

---

### 2026-01-23 - Fix Contact Form Agent/Lender References

**Status:** ✅ Complete

**Issues Fixed:**
1. Form submission failed with `Cannot find attribute with slug/ID "lead_source"` - removed unused attribute
2. Agent/lender references not linking to deals - 15-char vs 18-char Salesforce ID mismatch

**Solution:**
- Removed `lead_source` from customer creation
- Changed state page links to use `attio_id` instead of Salesforce ID
- Changed form service from `queryRecords()` to `getRecord()` for direct lookup

**Files Modified:**
- `lib/attio-schema.ts`
- `services/salesForcePostFormsService.tsx`
- `services/stateService.tsx`
- `components/StatePage/StatePageCityAgents.tsx`
- `components/StatePage/StatePageVaLoan.tsx`

---

## Migration History Summary

The Salesforce → Attio migration was completed across multiple phases from December 2024 to January 2026:

### Phase 1-2: Planning & Documentation
- Data exploration and analysis
- Updated PRD, HLD, LLD documentation
- Discovered critical data patterns (Contact.csv has real data, not Account.csv)

### Phase 3: Schema & Scripts
- Created 6 custom objects, 3 pipelines via Attio API
- Built 10 migration scripts
- Discovered Attio API patterns (24 learnings documented in CLAUDE.md)

### Phase 4: Data Migration
| Object | Migrated | Notes |
|--------|----------|-------|
| States | 52 | All US states + DC + PR |
| Agents | ~1,027 | From cleaned data |
| Lenders | ~138 | From cleaned data |
| Areas | 271 | Excludes state-level placeholders |
| Area Assignments | 503 | Agent-only (lenders at state level) |
| Customers | ~944 | From cleaned data |
| Customer Deals | ~925 | Pipeline entries |
| Agent Onboarding | ~902 | Pipeline entries |
| Lender Onboarding | ~138 | Pipeline entries |

### Phase 5: Website Integration
- Refactored stateService for Attio
- Refactored contact forms for Attio
- Created utility libraries (magic-link, slack, openphone)
- Implemented webhook handler and cron jobs

### Post-Migration Fixes
- Fixed stale lender references (multi-ref PATCH vs PUT)
- Fixed state page data loading (unstable_cache for POST requests)
- Fixed agent commission attribute type (currency → number)
- Fixed lender brokerage name display

---

## Key Learnings

**Critical Attio API patterns (see CLAUDE.md for full details):**

1. Record references require `target_object` + `target_record_id`
2. Select options must be created separately via dedicated endpoint
3. List entry stages must be set inside `entry_values`, not top-level
4. Multi-ref fields: PATCH appends, PUT (assertRecord) replaces
5. POST requests bypass Next.js cache - use `unstable_cache`
6. Can't query by internal `id` field - use parallel getRecord calls
7. Record-reference queries need nested `target_record_id` syntax
8. Bidirectional references needed for reverse lookups

---

## Session Template

```markdown
## YYYY-MM-DD - [Session Title]

**Status:** ✅ Complete / 🟡 In Progress / ❌ Blocked

**Completed:**
- Task 1

**Files Modified:**
- file.ts

**Notes:**
- Context
```
