# Cherry-Pick Plan: attio-migration -> main

**Created:** 2026-04-19
**Decision:** Stay on Salesforce. Cherry-pick the new features built during the Attio migration back into main, wired to Salesforce instead of Attio.

---

## Context

`main` is still fully Salesforce-connected:
- `services/salesForcePostFormsService.tsx` — posts to Salesforce Web-to-Lead (1,189 lines)
- `services/stateService.tsx` — reads agents/lenders from Salesforce API via `salesForceTokenService` (298 lines)
- `services/agentService.tsx` — queries Salesforce for agent data
- No portal, no crons, no Resend emails, no magic links
- Only `lib/` file is `lib/bah-scraper.ts`
- API routes: `/api/v1/areas`, `/api/v1/bah`, `/api/v1/impact`, `/api/v1/revalidate/salesforce`, `/api/v1/revalidate/sanity`

`attio-migration` has 151 changed files (+42,490 / -1,683 lines). Most of that is Attio-specific and gets thrown away. What follows is the subset worth keeping.

---

## Schema Reconciliation (Validated 2026-04-22)

Before cherry-picking, the live Salesforce schema was probed with `scripts/recon-salesforce.mjs`. Full evidence in `docs/salesforce-schema/{opportunity,customer,account}-reconciliation.md`. Summary:

- **Opportunity pipeline is shared across RecordTypes** — Agent (`0124x000000Z7FyAAK`, default), Customer (`0124x000000Z7G3AAK`), Lender (`0124x000000ZGHrAAO`). **Every customer-side SOQL query MUST filter `WHERE RecordTypeId = '0124x000000Z7G3AAK'`** or it will leak agent/lender rows. 2,313 total Opportunity records across all pipelines.
- **All 16 plan-assumed Opportunity fields exist** (`Agent__c`, `Lender__c`, `Sale_Price__c`, `Property_Address__c`, `Expected_Close_Date__c`, `Actual_Close_Date__c`, `Buying_andor_Selling__c`, `Payout_Amount__c`, `Charity_Amount__c`, `Closing_Commission__c`, `Destination_State__c`, etc.).
- **Stage picklist has 17 values, not 4.** Plan listed `Under Contract`, `Transaction Closed`, `Paid - Complete`, `Closed - Lost`. Live picklist also includes `Closed Won` as a terminal stage — it must be added to the stale-leads exclusion list.
- **Customer SObject is a red herring** — it's a dormant standard Salesforce B2C/Commerce Cloud object with 0 records and no references to Opportunity or Account. The Attio-era memory hint ("destination_city on Customer") does not apply on Salesforce. Customer-side portal data lives on **Person Account via `Opportunity.AccountId`**.
- **Account uses Person Accounts** (53 `__pc` fields, 2,353 Person Accounts total). Role flags: `isAgent__pc` (1,095), `isLender__pc` (149), `isCustomer__pc` (~1,109). Person Account Customer RecordType: `0124x000000Z83FAAS`.
- **Portal-critical Person Account fields confirmed**: `Current_location__pc` (customer's current base), `City_and_or_Base_you_are_moving_to__pc` (destination), `Military_Status__pc`, `Military_Service__pc`, `Discharge_Status__pc`, `Have_you_personally_PCS_d__pc`. Avoid the legacy `x`-prefixed duplicates (`xMilitary_Service__pc`, `xCities_Bases_you_service__pc`) — those are deprecated admin placeholders.

---

## What to Cherry-Pick

### 1. Magic Link Portal (NEW FEATURE)

These files don't exist on main. They need to be added and rewired to query Salesforce Opportunities instead of Attio customer_deals.

| File | What It Does | Rewire Needed |
|------|-------------|---------------|
| `app/(site)/portal/page.tsx` | Agent portal UI — view and update deal status | Replace `attio.queryListEntries` with SOQL Opportunity query |
| `app/api/magic-link/validate/route.ts` | JWT token validation | Replace Attio deal lookup with Salesforce Opportunity lookup |
| `app/api/magic-link/update/route.ts` | Deal stage update from portal | Replace `attio.updateListEntry` with Salesforce Opportunity update |
| `app/api/portal/deal/route.ts` | Fetch deal data for portal display | Replace Attio query with SOQL |
| `lib/magic-link.ts` | JWT sign/verify logic | **No changes needed** — CRM-independent |

**Salesforce mapping:** Attio "customer_deals" pipeline entries = Salesforce Opportunities with RecordTypeId `0124x000000Z7G3AAK` (Customer). Stage names verified — see Schema Reconciliation above.

### 2. Stale Leads Cron (NEW FEATURE)

| File | What It Does | Rewire Needed |
|------|-------------|---------------|
| `app/api/cron/stale-leads/route.ts` | Every 2hrs: find stale deals, re-route or send SMS reminder | Replace Attio queries with SOQL. Query Opportunities by LastModifiedDate + StageName, filtered to `RecordTypeId = '0124x000000Z7G3AAK'`, excluding terminal stages (`Transaction Closed`, `Paid - Complete`, `Closed - Lost`, `Closed Won`) |
| `vercel.json` | Cron schedule definitions | Keep the cron entries for stale-leads |

### 3. OpenPhone SMS Improvements

| File | What It Does | Rewire Needed |
|------|-------------|---------------|
| `actions/sendOpenPhoneMessage.ts` | SMS sending via OpenPhone API | Check diff — may have bug fixes or improvements over main's version |

### 4. Portal-Related Resend Email Templates

These are new files. They send deal-update and stale-lead emails via Resend. Only the portal/SMS-related subset:

| File | Template ID | Purpose |
|------|-------------|---------|
| `emails/templates/agent/LeadAlert.tsx` | A4 | "You have a new lead" (includes magic link) |
| `emails/templates/customer/UnderContract.tsx` | C4 | Deal moved to Under Contract |
| `emails/templates/customer/TransactionClosed.tsx` | C5 | Deal closed |
| `emails/templates/customer/AgentReassignment.tsx` | — | Lead re-routed to new agent |
| `emails/templates/components/Layout.tsx` | — | Shared email layout |
| `emails/templates/components/Footer.tsx` | — | Shared email footer |
| `lib/email.ts` | — | Resend send helper |

**Not needed** (handled by Salesforce natively or not portal-related):
- `emails/templates/customer/ContactConfirmation.tsx` (C1)
- `emails/templates/customer/WelcomeAgent.tsx` (C2)
- `emails/templates/customer/WelcomeLender.tsx` (C3)
- `emails/templates/agent/OnboardingWelcome.tsx` (A1)
- `emails/templates/agent/OnboardingFollowUp.tsx` (A2)
- `emails/templates/agent/ContractReady.tsx` (A3)
- `emails/templates/agent/LiveOnWebsite.tsx` (A5)
- All `emails/templates/lender/*` (L1-L5)
- All `emails/templates/intern/*` (I1-I2)

### 5. Bonus Calculator (NEW FEATURE)

| File | What It Does | Rewire Needed |
|------|-------------|---------------|
| `lib/bonus-calculator.ts` | Calculates veteran move-in bonus by sale price tier | **None** — pure business logic |

### 6. Vitest Test Suite

| File | What It Does | Rewire Needed |
|------|-------------|---------------|
| `vitest.config.ts` | Test configuration | None |
| `test/setup.ts` | Test setup | None |
| `test/fixtures.ts` | Test fixtures | Update fixtures to use Salesforce data shapes |
| `lib/__tests__/bonus-calculator.test.ts` | Bonus calc tests | None |
| `lib/__tests__/magic-link.test.ts` | Magic link tests | None |
| `services/__tests__/*` | Form submission tests | Update to test Salesforce integration |

### 7. Bug Fixes and UI Improvements

These commits may contain fixes that apply to main regardless of CRM:

| Commit | Description | Check |
|--------|-------------|-------|
| `c14f741` | Fix destination_city not populating on customer records | May apply to Salesforce form |
| `dac9f5b` | Remove duplicate Slack notifications | Check if main has same issue |
| Component changes in `components/GetListedAgents/`, `components/StatePage/` | UI fixes | Review diffs individually |

---

## What NOT to Cherry-Pick

Everything Attio-specific gets left on the branch:

```
lib/attio.ts                              # Attio API client
lib/attio-people.ts                       # People record management  
lib/attio-data-loader.ts                  # Attio data loader (main has Salesforce version)
lib/attio-schema.ts                       # Attio schema definitions
app/api/webhooks/attio/route.ts           # Attio webhook handler
app/api/cron/follow-up-emails/route.ts    # Onboarding drips (Salesforce can handle)
scripts/*                                 # All migration/sync scripts
data/*                                    # All mapping files and CSVs
docs/migration/*                          # Migration documentation
docs/attio-*                              # Attio-specific docs
docs/CUTOVER-PLAN.md                      # Attio cutover plan
docs/FINAL-DATA-SYNC.md                   # Attio sync plan
.claude/references/attio-api-reference.md # Attio API reference
.claude/hooks/attio-query-validator.md    # Attio query validator
.claude/skills/attio-api.md              # Attio API skill
RESUME.md                                 # Delta sync progress
SESSION-NOTES.md                          # Attio migration session history
```

---

## New Dependencies

```
resend          — Email delivery (for portal/SMS templates)
react-email     — Email template components
@react-email/*  — Email component library
jsonwebtoken    — Magic link JWT (may already be in main)
```

No new Salesforce dependencies — main already has Salesforce auth and API calls working.

---

## New Environment Variables

Add to `.env.local` and Vercel:

```
RESEND_API_KEY          — Resend email delivery
RESEND_FROM_EMAIL       — Sender address (e.g., noreply@veteranpcs.com)
MAGIC_LINK_SECRET       — JWT signing key for portal links
CRON_SECRET             — Auth for Vercel cron endpoints
```

Keep existing: `OPENPHONE_API_KEY`, `SLACK_WEBHOOK_URL`, `NEXT_PUBLIC_BASE_URL`, and all Salesforce env vars already on main.

Do NOT add: `ATTIO_API_KEY`, `ATTIO_WEBHOOK_SECRET`.

---

## Implementation Approach

### Option A: Feature Branch off Main (Recommended)

1. Create `feature/portal-sms` branch from `main`
2. Manually copy the files listed above from `attio-migration`
3. Build `lib/salesforce-deals.ts` — a thin wrapper for Salesforce Opportunity CRUD using the existing `salesForceTokenService`
4. Rewire portal routes + stale-leads cron to use it
5. Test against Salesforce sandbox
6. PR into `main`

**Why not cherry-pick commits:** The attio-migration commits bundle Attio-specific and CRM-agnostic changes together. Trying to cherry-pick individual commits would pull in Attio dependencies. Cleaner to copy files and rewire.

### Option B: Cherry-Pick + Revert

1. Merge attio-migration into main
2. Revert all Attio-specific changes
3. Rewire remaining code to Salesforce

**Why not:** Higher risk. The merge brings in 42K lines, and reverting selectively is error-prone. Option A is more surgical.

---

## Salesforce Deal Query Reference

The portal and cron need to query/update Salesforce Opportunities. Here's the SOQL equivalent of what the Attio code does:

```sql
-- Find deal by ID (portal/deal route)
SELECT Id, Name, StageName, AccountId, Agent__c, Lender__c,
       Sale_Price__c, Property_Address__c, Expected_Close_Date__c,
       Actual_Close_Date__c, Buying_andor_Selling__c, Payout_Amount__c,
       Charity_Amount__c, Closing_Commission__c, Destination_State__c
FROM Opportunity
WHERE Id = :opportunityId
AND RecordTypeId = '0124x000000Z7G3AAK'

-- Find stale deals (cron)
SELECT Id, Name, StageName, AccountId, Agent__c, LastModifiedDate
FROM Opportunity
WHERE RecordTypeId = '0124x000000Z7G3AAK'
AND StageName NOT IN ('Transaction Closed', 'Paid - Complete', 'Closed - Lost', 'Closed Won')
AND LastModifiedDate < :sevenDaysAgo

-- Find a customer Person Account (portal auth / dashboard)
SELECT Id, FirstName, LastName, PersonEmail, PersonMobilePhone,
       Current_location__pc, City_and_or_Base_you_are_moving_to__pc,
       Military_Status__pc, Military_Service__pc, Discharge_Status__pc,
       Have_you_personally_PCS_d__pc
FROM Account
WHERE IsPersonAccount = true
AND isCustomer__pc = true
AND PersonEmail = :customerEmail

-- Update deal stage (portal update)
UPDATE Opportunity SET StageName = :newStage WHERE Id = :opportunityId
```

---

## Open Questions

1. ~~**Salesforce Opportunity stage names**~~ — **RESOLVED:** Portal UI can display user-friendly labels with tooltips, mapped to Salesforce StageName values behind the scenes. Just a display mapping array in the portal component.
2. ~~**Agent magic link delivery**~~ — **RESOLVED:** Form handler creates the Salesforce Opportunity, generates the JWT magic link, and texts it to the agent via OpenPhone — all in the same flow. No Salesforce trigger or outbound message needed.
3. ~~**Stale lead re-routing**~~ — **RESOLVED:** Standard Salesforce REST API PATCH on Opportunity. `PATCH /sobjects/Opportunity/{id}` with `{"Agent__c": "newAgentId"}`. No special permissions needed beyond standard API access. Check Setup > Object Manager > Opportunity > Validation Rules to confirm no custom rules block Agent__c updates.
