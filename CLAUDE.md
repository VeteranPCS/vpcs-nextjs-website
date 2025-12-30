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

**Last Updated:** 2024-12-29
**Current Phase:** Phase 2 Complete → Phase 3 Starting
**Branch:** attio-migration

**✅ Completed:**
- Phase 1: Plan Mode & Data Exploration
- Phase 2: Documentation Updates (all 4 docs updated)
- Created ATTIO-SETUP-GUIDE.md for UI setup
- Created SESSION-NOTES.md and RESUME.md

**🟡 In Progress:**
- Phase 3a: Attio UI Setup (manual - user task)

**⏳ Next:**
- Phase 3b: Implement migration scripts (blocked on Attio UI completion)

**📋 Ready to Implement (once Attio setup complete):**
1. scripts/clean-data.ts
2. scripts/migrate-states.ts
3. scripts/migrate-agents.ts
4. scripts/migrate-lenders.ts
5. scripts/migrate-area-assignments.ts
6. scripts/migrate-customers.ts
7. scripts/migrate-customer-deals.ts
8. scripts/migrate-agent-onboarding.ts
9. scripts/migrate-lender-onboarding.ts
10. scripts/validate-migration.ts

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

| Salesforce Field | Attio Field | Notes |
|------------------|-------------|-------|
| Account.Id | salesforce_id | Preserve for lookups |
| Account.FirstName | first_name | |
| Account.LastName | last_name | |
| **Contact.Email** | email | **Primary email (via PersonContactId join)** |
| Contact.MobilePhone | phone | Priority: MobilePhone > Account.Phone |
| Account.Phone | phone (fallback) | Normalize to E.164 |
| BillingState / BillingStateCode | state | Use StateCode (2-letter) |
| Website | brokerage_name | Website field stores brokerage |
| Brokerage_License_Number__c | brokerage_license | |
| Managing_Broker__c | managing_broker_name | |
| xMilitary_Service__c | military_service | Army, Navy, etc. |
| xMilitary_Status__c | military_status | Active Duty, Veteran, etc. |
| xAgent_Bio__c | bio | |
| Added_to_Website_Date__c | added_to_website_date | If set, agent is Active |

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
| Closing_Commission__c | agent_commission | |
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

1. **States** - Create State objects with state_slug (e.g., "west-virginia", "puerto-rico")
2. **Areas** - Link to States
3. **Agents** - Filter: `RecordTypeId = '0124x000000YzFsAAK'` (join with Contact for email)
4. **Lenders** - Filter: `RecordTypeId = '0124x000000ZGGZAA4'` (join with Contact for email)
5. **Area Assignments** - **ALL 663** assignments (includes 152 lenders + 115 inactive agents - CEO prepopulated)
6. **Customers** - From Opportunity.AccountId where `RecordTypeId = '0124x000000Z83FAAS'`
7. **Customer Deals Pipeline** - Filter: `RecordTypeId = '0124x000000Z7G3AAK'`
8. **Agent Onboarding Pipeline** - Filter: `RecordTypeId = '0124x000000Z7FyAAK'` (includes 113 internships)
9. **Lender Onboarding Pipeline** - Filter: `RecordTypeId = '0124x000000ZGHrAAO'` (includes 4 internships)

### Data Quality Notes

**✅ Verified from Data Analysis:**

- **Email Location:** Emails are in Contact.csv (NOT Account.Person_Account_Email__c which is empty)
- **Area Assignments:** ALL 663 assignments are valid - NO deleted agents found
  - 396 assignments → Active agents on website
  - 115 assignments → Inactive agents (CEO prepopulated for future activation)
  - 152 assignments → Lenders (legacy data, CEO wants preserved)
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

## Key Entities

| Entity | Description |
|--------|-------------|
| State | US State with unique state_slug for URLs (e.g., "west-virginia", "puerto-rico") |
| Area | City or military base within a State where agents operate |
| Agent | Real estate agents, ranked by AA_Score per Area |
| Lender | Mortgage lenders, operate at State level |
| Area Assignment | Links Agent OR Lender to Area with AA_Score (663 total) |
| Customer | Veterans seeking to buy/sell/get mortgage (renamed from "Client") |
| Customer Deal Pipeline | Home buying/selling transactions (1,021 records) |
| Agent Onboarding Pipeline | Agent recruitment with Internship stage (947 records, 113 internships) |
| Lender Onboarding Pipeline | Lender recruitment with Internship stage (160 records, 4 internships) |

## API Routes to Implement

| Route | Purpose | See LLD Section |
|-------|---------|-----------------|
| POST /api/leads | Create client + deals from website | 2.1 |
| GET /api/magic-link/validate | Validate agent portal token | 2.2 |
| POST /api/magic-link/update | Update deal from portal | 2.3 |
| POST /api/webhooks/attio | Handle Attio events | 3.1 |
| POST /api/webhooks/signwell | Handle contract events | 3.2 |
| GET /api/cron/check-stale-leads | Re-route uncontacted leads | 4.1 |
| GET /api/cron/check-stale-deals | Send reminders, auto-close | 4.2 |
| GET /api/cron/check-renewals | Trigger annual renewals | 4.3 |

## Libraries to Implement

| File | Purpose | See LLD Section |
|------|---------|-----------------|
| lib/attio.ts | Attio API client | 5.1 |
| lib/signwell.ts | SignWell API + helpers | 5.2 |
| lib/openphone.ts | SMS sending | 5.3 |
| lib/slack.ts | Admin notifications | 5.4 |
| lib/magic-link.ts | JWT token utils | 5.5 |
| lib/bonus-calculator.ts | Move-in bonus tiers | 5.6 |
| lib/normalize-phone.ts | E.164 formatting | 5.7 |

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
| Sale Price | Bonus |
|------------|-------|
| < $150K | $250 |
| $150K-$250K | $500 |
| $250K-$350K | $1,000 |
| $350K-$500K | $1,500 |
| $500K-$750K | $2,500 |
| $750K-$1M | $3,500 |
| $1M+ | $4,000 |

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
