# VeteranPCS Migration - Session Notes

**Project:** Salesforce → Attio CRM Migration
**Branch:** attio-migration
**Plan File:** `~/.claude/plans/floating-booping-puzzle.md`

---

## Quick Status

**Current Phase:** Phase 3b Complete - Schema Automation & Migration Scripts
**Next Phase:** Phase 4 - Execute Data Migration
**Blocked On:** Create pipeline stages manually in Attio UI (statuses cannot be created via API)
**Ready to Code:** ✅ All migration scripts ready to execute

---

## Session Log

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
- **CRITICAL:** Pipeline stages/statuses CANNOT be created via API - must use Attio UI

**API Limitations Discovered:**
- `POST /v2/lists/{slug}/statuses` returns 404 - endpoint doesn't exist
- Stages must be manually created in Attio UI for each pipeline

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
- [ ] Create pipeline stages manually in Attio UI:
  - Agent Onboarding: 8 stages (New Application → Closed Lost)
  - Lender Onboarding: 8 stages (same)
  - Customer Deals: 9 stages (New Lead → Closed Lost)
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

**Notes:**
- Use `npx tsx` not `npx ts-node` (ESM module resolution issue)
- Schema setup script is idempotent - safe to re-run
- All ~80 attributes successfully created via API

---

## [NEXT SESSION DATE] - [TITLE]

**Platform:** Claude Code CLI
**Duration:** [TIME]
**Status:** [🟡 In Progress / ✅ Complete / ❌ Blocked]

**Completed:**
- [ ] Task 1
- [ ] Task 2

**Blockers:**
- None / [Describe blocker]

**Decisions Made:**
- [Key decisions this session]

**Files Modified:**
- [List files]

**Git Commits:**
- [Commit SHAs]

**Next Session Tasks:**
- [ ] Task 1
- [ ] Task 2

**Notes:**
- [Any important context for next session]

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

| Script | Status | Records | Notes |
|--------|--------|---------|-------|
| scripts/setup-attio-schema.ts | ✅ Complete | 6 objects, 3 pipelines | All created via API |
| scripts/migrate-states.ts | ✅ Ready | 52 | Generate state_slug |
| scripts/migrate-agents.ts | ✅ Ready | 1,039 | Contact join for emails |
| scripts/migrate-lenders.ts | ✅ Ready | 141 | Contact join + NMLS |
| scripts/migrate-state-lenders.ts | ✅ Ready | 152 | State.lenders refs |
| scripts/migrate-areas.ts | ✅ Ready | ~271 | Filters state-level areas |
| scripts/migrate-area-assignments.ts | ✅ Ready | 511 | Agent-only assignments |
| scripts/migrate-customers.ts | ✅ Ready | ~983 | From Opportunity.AccountId |
| scripts/migrate-customer-deals.ts | ✅ Ready | 1,021 | Needs pipeline stages |
| scripts/migrate-agent-onboarding.ts | ✅ Ready | 947 | Needs pipeline stages |
| scripts/migrate-lender-onboarding.ts | ✅ Ready | 160 | Needs pipeline stages |
| scripts/validate-migration.ts | ⏳ Not Started | - | Final validation |

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
