# VeteranPCS Migration - Session Notes

**Project:** Salesforce → Attio CRM Migration
**Branch:** attio-migration

---

## Current Status

**Phase:** HYBRID EMAIL ARCHITECTURE IMPLEMENTED
**Next:** Simplify Attio workflows (remove sequence blocks), test email delivery
**No longer blocked:** Emails sent via Resend, not Attio sequences

### Next Steps (in order)
1. **Simplify Attio workflows** — Remove sequence enrollment/exit blocks in Attio UI (keep Slack)
2. **Register webhook** for list-entry events in Attio (for stage-change emails)
3. **Test email delivery** — Submit test forms, verify Resend dashboard
4. **Create dedicated Slack channels** → planned channels in `docs/attio-workflows.md`
5. **Enhancement Phase:** Multi-step contact form, area-based agent routing

---

## Recent Sessions

### 2026-03-15 - Hybrid Email Architecture (Attio + Resend)

**Status:** ✅ Complete

**Problem:** Attio sequences can't access cross-entity data (agent brokerage, deal bonus amounts, etc.). Impossible to build personalized emails with cross-entity data.

**Solution:** Replaced Attio sequences with Resend for all email delivery. Attio keeps its CRM role + Slack notifications.

**What Changed:**
- **New:** `lib/email.ts` — Resend client wrapper with Attio note logging
- **New:** `emails/templates/` — 19 React Email templates (typed props, no merge field limitations)
- **New:** `app/(site)/portal/page.tsx` — Agent portal for magic link confirmation
- **New:** `app/api/cron/stale-leads/route.ts` — Stale lead re-routing (every 2hrs)
- **New:** `app/api/cron/follow-up-emails/route.ts` — Onboarding follow-up drips (daily)
- **New:** `vercel.json` — Cron schedules
- **Modified:** `services/salesForcePostFormsService.tsx` — Added email sends via Resend
- **Modified:** `app/api/webhooks/attio/route.ts` — Added list-entry event handling for stage-change emails
- **Modified:** `lib/attio.ts` — Added `createNote()`, `getListEntry()`, `parseListEntry()`
- **Rolled back:** `updatePeopleAssignment()` and `PEOPLE_RELATIONSHIP_ATTRIBUTES` (no longer needed)
- **Updated:** `CLAUDE.md`, `RESUME.md`, all docs, memory files

**Key Architecture:**
```
Form → Attio Record + Send Email via Resend
Stage Change → Attio Webhook → Our Handler → Query Data → Send Email via Resend
Follow-ups → Vercel Cron → Query Attio → Send Email via Resend
```

**Dependencies Added:** `resend`, `@react-email/components`

---

### 2026-03-03 - person_type Multi-Select on People Object

**Status:** ✅ Complete

**Problem:** No way to distinguish People records by role in Attio CRM UI. Needed filtered views like "All Agent People."

**Solution:** Added `person_type` multi-select field (Agent, Lender, Customer, Intern) to People object. Multi-select because People records are deduped by email — a person who is both an Agent and Customer shares one record.

**Key Learning:** Attio multi-select fields require array values (`['Agent']`), unlike single-select which accepts strings (`'Veteran'`). PATCH appends to multi-select and deduplicates automatically.

**Executed:**
- `npx tsx scripts/add-person-type-attribute.ts` — Created attribute + 4 options
- `npx tsx scripts/backfill-person-type.ts` — Tagged all 2,111 People records (0 errors)
- Verified: Agent, Customer, Lender tags confirmed; append + dedup behavior confirmed

**Files Created:**
- `scripts/add-person-type-attribute.ts` — Schema: attribute + options on People
- `scripts/backfill-person-type.ts` — Backfill: tags existing People records

**Files Modified:**
- `lib/attio-schema.ts` — Added `PERSON_TYPE_OPTIONS` constant
- `lib/attio-people.ts` — Added optional `personType` param to `findOrCreatePerson()`
- `services/salesForcePostFormsService.tsx` — Added `personType` to all 4 form call sites
- `scripts/test-setup.ts` — Tags test agent/lender People records

---

### 2026-03-03 - People Record Integration for Sequence Enrollment

**Status:** ✅ Complete (scripts executed, all records linked)

**Solution:** Created linked People records for every custom object record, deduped by email. All ~2,100 records backfilled.

**Files Created:**
- `lib/attio-people.ts` — `findOrCreatePerson()` helper
- `scripts/add-person-attribute.ts` — Adds `person` field to 4 custom objects
- `scripts/backfill-people-records.ts` — Links existing records to People records

**Files Modified:**
- `lib/attio-schema.ts`, `services/salesForcePostFormsService.tsx`, `scripts/test-setup.ts`, `scripts/test-teardown.ts`, `docs/attio-workflows.md`, `docs/attio-sequences.md`, `CLAUDE.md`

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

## Migration History

Migration completed Dec 2024 – Jan 2026. Full details in CLAUDE.md (Migration Results, API Notes).

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
