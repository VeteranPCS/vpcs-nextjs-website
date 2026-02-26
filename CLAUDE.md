# VeteranPCS CRM (Attio)

This project is the VeteranPCS website, powered by Attio CRM.

---

## Project Status

**Status:** MIGRATION COMPLETE ✅
**Branch:** attio-migration (ready for merge to main)
**Last Updated:** 2026-01-31

The Salesforce → Attio migration is complete. All data is now in Attio, and the website reads/writes to Attio.

**Recently Completed:**
- ✅ Email automation documentation (5 workflows, 14 sequences, 18 templates)
- ✅ Slack notification specifications
- ✅ Revised architecture: Workflows enroll in Sequences (workflows cannot send emails directly)

**Next Steps (Enhancement Phase):**
1. Multi-step contact form with Buying/Selling/Both selection
2. Area-based agent routing for unselected agents
3. Configure Attio Workflows in UI (see `docs/attio-workflows.md`)

---

## Session Management

**On Session Start:**
1. Read `RESUME.md` for quick context
2. Check `SESSION-NOTES.md` for recent session history
3. Ask the user what they'd like to work on

**On Session End:**
1. Update `SESSION-NOTES.md` with session summary
2. Ask user to commit changes

---

## Attio API Notes

**Critical learnings from the migration - reference these when working with Attio:**

### 1. Record References require `target_object`
```typescript
// WRONG - will fail
{ target_record_id: 'uuid' }

// CORRECT
{ target_object: 'agents', target_record_id: 'uuid' }
```

### 2. Select options must be created separately
- When creating a `select` attribute, options are NOT created inline
- Use dedicated endpoint: `POST /objects/{obj}/attributes/{attr}/options`
- Body: `{ "data": { "title": "Option Name" } }`

### 3. Phone numbers require E.164 format
- Attio rejects phones not in E.164 format
- Use `lib/normalize-phone.ts` to convert

### 4. List entry status/stage MUST be set inside `entry_values`
```typescript
// WRONG - will be silently ignored
body.data.status_title = 'Paid Complete';

// ALSO WRONG - 'title' key not recognized
entry_values.stage = { title: 'Paid Complete' };

// CORRECT - use 'status' key with status title as string
entry_values.stage = { status: 'Paid Complete' };
```

### 5. List entry creation requires `parent_object`
```typescript
// WRONG - missing parent_object
{ parent_record_id: 'uuid', entry_values: {...} }

// CORRECT
{ parent_object: 'customers', parent_record_id: 'uuid', entry_values: {...} }
```

### 6. Custom objects need a `name` attribute for display
- Attio UI shows record display names based on a `name` attribute
- Without it, records display as auto-generated UUIDs
- Add `name` as a text attribute and populate with human-readable values

### 7. Cannot DELETE attributes via API - only archive
- Attio API returns 404 for DELETE on attributes
- Use PATCH to archive: `{ "data": { "is_archived": true } }`
- **Archived attributes still occupy their slug** - cannot reuse

### 8. Attio Query API uses MongoDB-style operators
```typescript
// CORRECT - MongoDB-style operators
await attio.queryRecords('agents', {
  filter: { email: { $eq: 'test@example.com' } }
});

// Multiple conditions with $and
await attio.queryRecords('area_assignments', {
  filter: {
    $and: [
      { area: { $eq: areaId } },
      { status: { $eq: 'Active' } }
    ]
  }
});
```

**Supported operators:** `$eq`, `$ne`, `$gt`, `$lt`, `$in`, `$nin`, `$and`, `$or`

**⚠️ CRITICAL: `$contains` is NOT supported for record-reference fields!**
- Only `$eq` and `$in` work on `target_record_id`

### 9. Multi-ref fields: PATCH appends, PUT replaces
```typescript
// WRONG - PATCH only APPENDS, never removes
await attio.updateRecord('states', stateId, { lenders: [] }); // Ignored!

// CORRECT - PUT (assertRecord) completely replaces
await attio.assertRecord('states', 'state_code', {
  state_code: 'TX',
  lenders: validIds.map(id => ({ target_object: 'lenders', target_record_id: id }))
});
```

### 10. POST requests bypass Next.js fetch cache
- Attio's query API uses POST
- **Problem:** Next.js only caches GET requests
- **Solution:** Use `unstable_cache` wrapper:
```typescript
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => fetchAllData(),
  ['attio-all-data'],
  { revalidate: 3600, tags: ['attio-data'] }
);
```

**CRITICAL:** `unstable_cache` serializes data to JSON - Map objects become plain objects. Use `Record<string, T>` instead of `Map<string, T>`.

### 11. Cannot query by internal `id` field
```typescript
// WRONG - id is not a queryable field
await attio.queryRecords('areas', { filter: { id: { $in: areaIds } } });

// CORRECT - use parallel getRecord calls
const areas = await Promise.all(
  areaIds.map(id => attio.getRecord('areas', id).catch(() => null))
);
```

### 12. Record-reference queries require nested syntax
```typescript
// WRONG - flat structure
await attio.queryRecords('area_assignments', { filter: { agent: agentId } });

// CORRECT - nested with target_record_id
await attio.queryRecords('area_assignments', {
  filter: { agent: { target_record_id: { $eq: agentId } } }
});
```

### 13. Attio webhook signature header is `attio-signature` (lowercase)
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

### 14. Attio webhook payload structure
```typescript
interface AttioWebhookPayload {
  webhook_id: string;
  events: Array<{
    event_type: 'record.created' | 'record.updated' | 'record.deleted';
    id: {
      workspace_id: string;
      object_id: string;      // UUID, not slug!
      record_id: string;
    };
  }>;
}

// Get object slug from UUID
const objectInfo = await attio.getObject(event.id.object_id);
const objectSlug = objectInfo.api_slug;
```

### 15. Scripts must use dynamic imports for env vars
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
}
```

---

## Data Model

### Bidirectional References

Attio doesn't support reverse queries on multi-ref fields. Create bidirectional references:

| Object A | Field on A | Object B | Field on B |
|----------|-----------|----------|-----------|
| State | `lenders` | Lender | `states` |
| State | `areas` | Area | `state` |
| Area | `area_assignments` | Area Assignment | `area` |
| Agent | (via area_assignments) | Area Assignment | `agent` |

```typescript
// ❌ IMPOSSIBLE: "Find all states where lender X is assigned"
// Attio has no $contains operator for record-reference fields

// ✅ WITH BIDIRECTIONAL: Read lender.states directly
const lender = await attio.getRecord('lenders', lenderId);
const assignedStateIds = lender.states;
```

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
| Customer Deal Pipeline | Home buying/selling transactions |
| Agent Onboarding Pipeline | Agent recruitment |
| Lender Onboarding Pipeline | Lender recruitment |
| Intern Placements Pipeline | Intern application review and mentor matching |

**Key Design Decisions:**
- Lenders assigned at **State level** via `State.lenders` (not Area Assignments)
- `Lender.states` mirrors `State.lenders` for reverse lookups
- Area Assignments are **agent-only**
- Interns are separate from Agents/Lenders (applicants, not network members)

---

## Intern Object & Placement Pipeline

**Purpose:** Track transitioning service members seeking placement with network agents/lenders for mentorship.

### Intern Object Attributes
| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | text | Full name (first + last) |
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
| `desired_state` | text | 2-letter code |
| `desired_city` | text | City where they want to work |
| `preferred_start_date` | date | When they can begin |
| `licensed` | select | Yes, No, In Progress |
| `mentor_agent` | record-reference | Network agent mentoring this intern |
| `mentor_lender` | record-reference | Network lender mentoring this intern |

### Intern Placements Pipeline Stages
| Stage | Status | Description |
|-------|--------|-------------|
| New Application | Active | Just submitted |
| Under Review | Active | Admin reviewing |
| Contacted | Active | Confirmed details |
| Matching | Active | Looking for mentor |
| Matched | Active | Mentor identified |
| Placement Complete | Closed (won) | Successfully placed |
| Withdrawn | Closed | Applicant withdrew |
| Unable to Place | Closed | Could not find mentor |

---

## Architecture

### Website Data Layer

```
lib/attio-data-loader.ts
  → Fetches ALL Attio data once (5 API calls total)
  → Uses unstable_cache with 1-hour revalidation
  → Builds in-memory lookup maps (Record<>, not Map<>)

app/(site)/[state]/page.tsx
  → services/stateService.fetchAgentsListByState()
    → getAttioData() (cached)
    → Filter agents by state
    → Fetch photos from Sanity
  → Components render data (unchanged from Salesforce era)
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/attio.ts` | Attio API client (CRUD, query, assertRecord) |
| `lib/attio-data-loader.ts` | Cached data loader for website |
| `lib/attio-schema.ts` | Schema definitions and constants |
| `services/stateService.tsx` | Fetches agents/lenders for state pages |
| `services/salesForcePostFormsService.tsx` | Contact form submissions |
| `lib/magic-link.ts` | JWT token generation/validation |
| `lib/slack.ts` | Slack webhook notifications |
| `lib/openphone.ts` | SMS via OpenPhone API |
| `lib/normalize-phone.ts` | E.164 phone formatting |
| `lib/bonus-calculator.ts` | Move-in bonus tiers |

### API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/magic-link/validate` | Validate agent portal token |
| `POST /api/magic-link/update` | Update deal from portal |
| `POST /api/webhooks/attio` | Handle Attio events, revalidate cache |

---

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

---

## Email Automation Architecture

**Critical:** Attio Workflows **CANNOT** send emails directly. Workflows enroll/exit people from **Sequences**, which send emails via synced Gmail/Microsoft accounts.

### Workflows (8 total, all Live)

Workflows handle business logic and control sequence enrollment. Attio doesn't support OR triggers, so each onboarding pipeline has separate "Created" and "Stage Changed" workflows:

| # | Workflow | Trigger | Actions |
|---|----------|---------|---------|
| WF1 | New Customer Deal Created | Record added to list | Enroll in C1/C2/C3 + A1/L1 sequences, Slack |
| WF2 | Customer Deal Stage Changed | List entry updated | Enroll in C4/C5 sequences, Slack |
| WF3a | Agent Onboarding Created | Record added to list | Enroll Agent Onboarding, Slack |
| WF3b | Agent Onboarding Stage Changed | List entry updated | Enroll Contract Ready/Live, Slack |
| WF4a | Lender Onboarding Created | Record added to list | Enroll Lender Onboarding, Slack |
| WF4b | Lender Onboarding Stage Changed | List entry updated | Enroll Contract Ready/Live, Slack |
| WF5a | Intern Placement Created | Record added to list | Enroll Intern Onboarding, Slack |
| WF5b | Intern Placement Stage Changed | List entry updated | Exit Intern Onboarding |

### Sequences (14 total)

Sequences are the email sending mechanism:

| Category | Sequences |
|----------|-----------|
| Customer | Welcome-Unassigned (C1), Welcome-Agent (C2), Welcome-Lender (C3), Under Contract (C4), Closed (C5) |
| Agent | Lead Alert (A1), Onboarding (A2→A3), Contract Ready (A4), Live (A5) |
| Lender | Lead Alert (L1), Onboarding (L2→L3), Contract Ready (L4), Live (L5) |
| Intern | Onboarding (I1→I2) |

### Email Templates (18 total)

| Category | Templates |
|----------|-----------|
| Customer | C1-C6 (confirmations, milestones) |
| Agent | A1-A5 (leads, onboarding) |
| Lender | L1-L5 (leads, onboarding) |
| Intern | I1-I2 (welcome, follow-up) |
| Referral | R1 (thank you) |

### Slack Channels

| Channel | Purpose |
|---------|---------|
| `#new-leads` | Assigned leads |
| `#leads-unassigned` | Unassigned leads (Beth monitors) |
| `#agent-applications` | Agent onboarding |
| `#lender-applications` | Lender onboarding |
| `#intern-applications` | Intern applications |
| `#deals` | Under contract, won, lost |

**Full Documentation:**
- `docs/attio-workflows.md` - 8 workflows (all Live) with sequence enrollment logic
- `docs/attio-sequences.md` - 14 sequences with email content
- `docs/attio-email-templates.md` - 18 email templates ready to copy/paste

---

## Attio Workflows - Stale Lead/Deal Automation

These scheduled automations should be configured in Attio's workflow builder:

### 1. Stale Lead Re-routing
**Trigger:** Recurring Schedule (hourly or every 6 hours)
**Logic:** Filter deals where `stage = "New Lead"` AND `contact_confirmed = false` AND `created_at < 12 hours ago` → re-route to next agent

### 2. Stale Deal Reminders (7-day)
**Trigger:** Daily at 8am
**Logic:** Filter deals in open stages where `last_updated < 7 days ago` → send reminder

### 3. Stale Deal Admin Alert (14-day)
**Trigger:** Daily at 8am
**Logic:** Filter deals where `last_updated < 14 days ago` → Slack alert

### 4. Auto-Close Stale Deals (45-day)
**Trigger:** Daily at 6am
**Logic:** Filter deals where `last_stage_change < 45 days ago` → move to "Closed Lost"

---

## Tech Stack

- **Next.js 14** (App Router)
- **Attio** - Primary CRM
- **SignWell** - E-signature contracts (future)
- **OpenPhone** - SMS notifications
- **Sanity** - Headshot images only
- **Slack** - Admin notifications

## Environment Variables

Required in `.env.local`:
- `ATTIO_API_KEY`
- `ATTIO_WEBHOOK_SECRET`
- `OPENPHONE_API_KEY`
- `SLACK_WEBHOOK_URL`
- `MAGIC_LINK_SECRET`
- `NEXT_PUBLIC_BASE_URL`

---

## Security Scanning

```bash
npm run security          # Quick scan
npm run security:json     # JSON output
npm run security:ci       # Fails if findings (for CI)
```

---

## Documentation

**Email Automation** in `docs/`:
- **attio-workflows.md** - 8 workflows (all Live) with sequence enrollment logic
- **attio-sequences.md** - 14 sequences (the actual email senders)
- **attio-email-templates.md** - 18 email templates ready to copy/paste

**Migration documentation** in `docs/migration/`:
- **PRD.md** - Business requirements
- **HLD.md** - Architecture, data model
- **LLD.md** - Implementation details

---

## Historical Reference: Salesforce Migration

The migration from Salesforce to Attio was completed in January 2026. Key learnings:

### Salesforce Data Patterns
- `Contact.csv` has the real data (email, military_service, bio, etc.)
- `Account.csv` x-prefixed fields are empty
- Join: `Account.PersonContactId → Contact.Id → Contact.Email`

### RecordTypeIds (18-char)
| Type | RecordTypeId |
|------|--------------|
| Agent | `0124x000000YzFsAAK` |
| Lender | `0124x000000ZGGZAA4` |
| Customer | `0124x000000Z83FAAS` |
| Customer Deal | `0124x000000Z7G3AAK` |
| Agent Onboarding | `0124x000000Z7FyAAK` |
| Lender Onboarding | `0124x000000ZGHrAAO` |

### Migration Results
| Object | Migrated |
|--------|----------|
| States | 52 |
| Agents | ~1,027 |
| Lenders | ~138 |
| Areas | 271 |
| Area Assignments | 503 |
| Customers | ~944 |
| Customer Deals | ~925 |
| Agent Onboarding | ~902 |
| Lender Onboarding | ~138 |
