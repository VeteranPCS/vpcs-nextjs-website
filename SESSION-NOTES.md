# VeteranPCS Migration - Session Notes

**Project:** Salesforce → Attio CRM Migration
**Branch:** attio-migration

---

## Current Status

**Phase:** MIGRATION COMPLETE ✅ — Automation setup in progress
**Next:** Create sequences, paste email templates, test end-to-end
**Blocked On:** Email sync (Gmail/Microsoft must be synced in Attio for sequences to send)

### Next Steps (in order)
1. **Verify email sync** — Gmail or Microsoft account synced in Attio
2. **Create 14 sequences** in Attio UI → `docs/attio-sequences.md`
3. **Paste 18 email templates** into sequences → `docs/attio-email-templates.md`
4. **Test workflows end-to-end** → checklists in `docs/attio-workflows.md` lines 605-639 and `docs/attio-sequences.md` lines 498-511
5. **Create dedicated Slack channels** → planned channels in `docs/attio-workflows.md` lines 558-567
6. **Enhancement Phase:** Multi-step contact form, area-based agent routing

---

## Recent Sessions

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
