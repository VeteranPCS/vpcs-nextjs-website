# Resume Work - Quick Start Guide

**Last Updated:** 2024-12-29 20:03:52 PST
**Project:** VeteranPCS Salesforce → Attio CRM Migration
**Last Commit:** fa624c8 (pushed to origin/attio-migration)
**Linear Ticket:** Created for Attio UI setup (manual)

---

## 🚀 Quick Resume Checklist

When starting a new Claude Code session, follow these steps:

### 1. Environment Check
```bash
# Verify you're in the right directory
pwd  # Should show: /Users/harperfoley/VPCS/vpcs-nextjs-website

# Check current branch
git branch --show-current  # Should show: attio-migration

# Check for uncommitted changes
git status

# See recent work
git log -3 --oneline
```

### 2. Read Context Files (in order)
1. **RESUME.md** ← You are here
2. **SESSION-NOTES.md** - What happened in last session
3. **CLAUDE.md** - Project overview (scroll to "Current Migration Status")
4. **~/.claude/plans/floating-booping-puzzle.md** - Full migration plan

### 3. Check Current Phase Status

**Current Phase:** Phase 2 Complete → Phase 3 Starting

**Completed:**
- ✅ Phase 1: Plan Mode & Data Exploration
- ✅ Phase 2: Documentation Updates (CLAUDE.md, HLD.md, LLD.md, PRD.md)
- ✅ Created ATTIO-SETUP-GUIDE.md for manual UI setup

**Next:**
- 🟡 Phase 3a: Attio UI Setup (manual - user task)
- ⏳ Phase 3b: Implement migration scripts

**Blocked On:**
- Attio objects must be created via UI before scripts can run
- User needs to complete `docs/migration/ATTIO-SETUP-GUIDE.md` (90-120 min)

### 4. Understand Current Blockers

**🚨 CRITICAL BLOCKER:**
- **What:** Attio objects must be created via UI before migration scripts can run
- **Why:** Scripts use Attio API to create records - objects must exist first
- **How Long:** 90-120 minutes (manual UI work)
- **Guide:** `docs/migration/ATTIO-SETUP-GUIDE.md` (comprehensive, step-by-step)
- **Status:** Linear ticket created, user working on it

**⚠️ API Slug Verification Required:**
When Attio setup is complete, user MUST verify these exact API slugs exist:
- `states` (not "state")
- `areas` (not "area")
- `agents` (not "agent")
- `lenders` (not "lender")
- `customers` (not "customer" or "clients")
- `area_assignments` (not "area_assignment")
- `agent_onboarding` (not "agent-onboarding")
- `lender_onboarding` (not "lender-onboarding")
- `customer_deals` (not "customer-deals" or "deals")

### 5. Ask User About Blockers

Before starting work, ask:
```
"Have you completed the Attio UI setup from docs/migration/ATTIO-SETUP-GUIDE.md?
This is required before I can implement the migration scripts.

Please confirm:
1. All 9 objects/pipelines created? (6 objects + 3 pipelines)
2. All API slugs verified against the checklist in ATTIO-SETUP-GUIDE.md?
3. ATTIO_API_KEY in .env.local still valid and has proper permissions?"
```

**If YES (Attio Setup Complete):**
- ✅ Proceed to implement scripts/clean-data.ts
- ✅ Mark Phase 3a complete in SESSION-NOTES.md
- ✅ Begin Phase 3b: Migration Scripts Implementation

**If NO (Still Working on Attio):**
- ⏸️  User is still working through ATTIO-SETUP-GUIDE.md
- ✅ Can work on: documentation improvements, planning, architecture discussions
- ❌ Cannot work on: migration scripts (need Attio objects first)

**If PARTIAL (Some Objects Created):**
- ⚠️  Ask which objects are done
- ⚠️  May be able to test individual scripts if dependencies met
- ⚠️  Recommend completing all before starting (cleaner)

---

## 📋 Current Task Priority

Based on the migration plan, here's what to do next:

### If Attio Setup Complete:

**Priority 1: Data Cleaning**
```bash
# Implement deduplication script
File: scripts/clean-data.ts
Purpose: Deduplicate 357 Lead emails, validate Contact joins
Output: data/cleaned/*.csv
```

**Priority 2: States Migration**
```bash
# Implement state migration with slug generation
File: scripts/migrate-states.ts
Purpose: Create 52 State records (50 states + DC + PR)
Output: data/mappings/states.json
```

**Priority 3: Agents Migration**
```bash
# Implement agent migration with Contact join
File: scripts/migrate-agents.ts
Purpose: Migrate 1,039 agents (Account → Contact join for emails)
Output: data/mappings/agents.json
```

### If Attio Setup NOT Complete:

**Alternative Tasks:**
1. Review and improve ATTIO-SETUP-GUIDE.md based on user feedback
2. Design data validation test suite
3. Plan error handling strategy for migration scripts
4. Draft API integration patterns for post-migration features

---

## 🔗 Linear Integration Status

**MCP Configuration:** ⏸️ NOT CONFIGURED (optional future enhancement)

**What Happened:**
- User asked about connecting Claude Code to Linear
- Provided complete MCP server setup instructions
- User manually created Linear ticket for Attio UI setup instead
- Linear MCP configuration deferred (not blocking current work)

**If User Wants to Configure Later:**
1. Get Linear API key from https://linear.app/settings/api
2. Find Linear MCP server URL (check MCP registry or npm)
3. Run: `claude mcp add --transport http linear <URL> --scope project --header "Authorization: Bearer <KEY>"`
4. Restart Claude Code session
5. Can then create/update Linear tasks directly from CLI

**Current Workaround:**
- User creates Linear tickets manually as needed
- Migration work proceeds independently of Linear integration

---

## 🔧 Environment Variables Required

Verify these are in `.env.local`:

```bash
# Check env file exists
cat .env.local | grep -E "(ATTIO_API_KEY|SALESFORCE)"

# Required for migration:
ATTIO_API_KEY
```

**Note:** All Salesforce connection variables are present but only needed for reference.

---

## 📁 Key File Locations

```
Project Root: /Users/harperfoley/VPCS/vpcs-nextjs-website/

Documentation:
├── CLAUDE.md                                    # Project instructions
├── SESSION-NOTES.md                             # Session history
├── RESUME.md                                    # This file
└── docs/migration/
    ├── PRD.md                                   # Business requirements
    ├── HLD.md                                   # High-level design
    ├── LLD.md                                   # Low-level design
    └── ATTIO-SETUP-GUIDE.md                     # UI setup instructions

Data:
├── data/salesforce/                             # Source CSVs (gitignored)
│   ├── Account.csv                              # 2,661 accounts
│   ├── Contact.csv                              # 2,995 contacts (has emails!)
│   ├── Area__c.csv                              # 322 areas
│   ├── Area_Assignment__c.csv                   # 663 assignments
│   ├── Opportunity.csv                          # 2,128 opps (3 RecordTypes)
│   ├── Lead.csv                                 # 5,020 leads
│   ├── RecordType.csv                           # RecordType IDs
│   └── BusinessProcess.csv                      # Business processes
├── data/cleaned/                                # Will be created by clean-data.ts
└── data/mappings/                               # Migration ID mappings
    └── areas.json                               # Already exists from prior work

Migration Scripts:
├── scripts/migrate-areas.ts                     # ✅ Already exists
└── scripts/                                     # ⏳ To be created
    ├── clean-data.ts
    ├── migrate-states.ts
    ├── migrate-agents.ts
    ├── migrate-lenders.ts
    ├── migrate-area-assignments.ts
    ├── migrate-customers.ts
    ├── migrate-customer-deals.ts
    ├── migrate-agent-onboarding.ts
    ├── migrate-lender-onboarding.ts
    └── validate-migration.ts

Libraries:
├── lib/attio.ts                                 # ✅ Already exists
├── lib/normalize-phone.ts                       # ✅ Already exists
├── lib/bonus-calculator.ts                      # ✅ Already exists
└── lib/                                         # ⏳ May need additional libs

Migration Plan:
└── ~/.claude/plans/floating-booping-puzzle.md   # Full 4-week plan
```

---

## 🎯 Critical Data Discoveries

**Always remember these when implementing scripts:**

1. **Email Location:** Account.Person_Account_Email__c is EMPTY
   - Must join: Account.PersonContactId → Contact.Id → Contact.Email
   - 100% of agents/lenders MUST have emails or skip record

2. **RecordType IDs:** Use FULL 18-character IDs
   - Agent: `0124x000000YzFsAAK` (NOT `0124x000000YzFs`)
   - Lender: `0124x000000ZGGZAA4`
   - Customer: `0124x000000Z83FAAS`
   - Customer Deal: `0124x000000Z7G3AAK`
   - Agent Onboarding: `0124x000000Z7FyAAK`
   - Lender Onboarding: `0124x000000ZGHrAAO`

3. **Area Assignments:** ALL 663 are valid
   - 396 → Active agents on website
   - 115 → Inactive agents (CEO prepopulated)
   - 152 → Lenders (legacy data, CEO wants preserved)

4. **Phone Priority:** Contact.MobilePhone > Account.Phone
   - Then normalize to E.164 format (+1XXXXXXXXXX)

5. **State Conversion:** Area__c.State__c has full names
   - "Colorado" → "CO"
   - "Puerto Rico" → "PR"
   - "District of Columbia" → "DC"

6. **Internship Tracking:** 117 total internships
   - 113 agents (2021-2025)
   - 4 lenders
   - Preserve all Start_Date__c, End_Date__c, Location__c

---

## 🐛 Known Issues

**None currently.** Session just completed documentation phase.

---

## 💬 Message to Claude Code (When Resuming)

When you start a new Claude Code session, say:

```
I'm resuming work on the VeteranPCS Salesforce → Attio CRM migration.

Please:
1. Read RESUME.md (this file) for context
2. Read SESSION-NOTES.md for last session summary
3. Ask me: "Have you completed the Attio UI setup?"
4. Based on my answer, tell me what we should work on next

The project is currently between Phase 2 (documentation complete) and
Phase 3 (migration scripts). We're blocked on manual Attio UI setup.
```

---

## ✅ Session End Checklist

Before ending a session, complete these tasks:

```bash
# 1. Update SESSION-NOTES.md
# Add new session entry with:
# - Date and duration
# - What you completed
# - Key decisions made
# - Files modified
# - Next steps

# 2. Update RESUME.md "Last Updated" date
# Edit line 3 of this file

# 3. Update CLAUDE.md "Current Migration Status" section
# (Only if phase changed or major milestone reached)

# 4. Commit all work
git add .
git commit -m "Session checkpoint: [brief summary of work]"
git push origin attio-migration

# 5. Verify commit succeeded
git log -1 --oneline

# 6. Close Claude Code
exit
```

---

## 🔗 Quick Links

- **GitHub Repo:** [Add your repo URL here]
- **Attio Workspace:** [Add Attio URL when available]
- **Slack Channel:** [Add if applicable]
- **Project Docs:** `/docs/migration/`

---

## 📞 Need Help?

**If you're stuck:**
1. Check SESSION-NOTES.md for context from last session
2. Review the relevant doc:
   - Business question? → PRD.md
   - Architecture question? → HLD.md
   - Implementation question? → LLD.md
3. Check the plan: `~/.claude/plans/floating-booping-puzzle.md`
4. Ask Claude Code to explain the issue

**Common Questions:**
- "What RecordTypeId should I use for agents?" → See section above
- "Where do I get email addresses?" → Contact.Email via PersonContactId join
- "How many area assignments should I migrate?" → ALL 663
- "What's the state slug for Puerto Rico?" → "puerto-rico"

---

## ✅ Session Continuity Verification

**Before ending this session, verify all context is saved:**

```bash
# 1. Check all files are committed
git status  # Should show "working tree clean"

# 2. Verify files exist and have content
ls -lh SESSION-NOTES.md RESUME.md CLAUDE.md docs/migration/ATTIO-SETUP-GUIDE.md

# 3. Check commit is pushed
git log origin/attio-migration -1 --oneline  # Should show: fa624c8

# 4. Verify .env.local has API key
grep ATTIO_API_KEY .env.local  # Should show the key

# 5. Verify migration plan exists
ls -lh ~/.claude/plans/floating-booping-puzzle.md

# 6. Quick content check
head -20 RESUME.md  # Should show "Last Updated: 2024-12-29"
tail -30 SESSION-NOTES.md  # Should show latest session details
```

**All checks pass?** ✅ Safe to end session!

**Next Session Will Resume Because:**
- ✅ CLAUDE.md instructs me to read RESUME.md and SESSION-NOTES.md on startup
- ✅ All work is committed and pushed to Git
- ✅ RESUME.md has clear instructions for next steps
- ✅ SESSION-NOTES.md documents all decisions and context
- ✅ ATTIO-SETUP-GUIDE.md provides complete manual steps
- ✅ Migration plan preserved in ~/.claude/plans/

**Confidence Level:** 🟢 HIGH - Session designed for clean resumption

---

**Ready to start? Run:** `claude-code` and paste the message from the "Message to Claude Code" section above.
