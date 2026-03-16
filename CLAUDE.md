# VeteranPCS CRM (Attio)

This project is the VeteranPCS website, powered by Attio CRM.

---

## Project Status

**Status:** HYBRID EMAIL ARCHITECTURE IMPLEMENTED
**Branch:** attio-migration
**Last Updated:** 2026-03-15

The Salesforce → Attio migration is complete. Email sending uses Resend (not Attio sequences).

**Architecture Decision:** Attio sequences cannot access cross-entity data (agent brokerage, deal bonus amounts, etc.), so all emails are sent from application code via Resend, where we have full access to every Attio object through the API. Attio keeps its role as CRM (data, pipelines, admin UI, Slack notifications).

**Recently Completed:**
- ✅ Resend integration with Attio note logging (`lib/email.ts`)
- ✅ 19 React Email templates (`emails/templates/`)
- ✅ Form handlers send emails via Resend (C1-C3, A1-A2, L1-L2, I1)
- ✅ Webhook handler sends stage-change emails (C4-C5, A4-A5, L4-L5)
- ✅ Stale lead re-routing cron (`/api/cron/stale-leads`)
- ✅ Onboarding follow-up drips cron (`/api/cron/follow-up-emails`)
- ✅ Agent portal page (`/portal`) for magic link confirmation
- ✅ Attio Workflows simplified to Slack-only (sequence enrollment removed)
- ✅ People record denormalization rolled back (no longer needed)

**Next Steps:**
1. **Simplify Attio workflows** — Remove sequence enrollment/exit blocks from all 8 workflows in Attio UI (keep Slack blocks)
2. **Test email delivery** — Submit test forms and verify Resend emails arrive
3. **Create dedicated Slack channels** — workflows currently post to `#general`
4. **Retire `#salesforce-alerts` channel**

**Enhancement Phase:**
1. Multi-step contact form with Buying/Selling/Both selection
2. Area-based agent routing for unselected agents

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

### 15. People records for CRM contact management
```typescript
// Each custom record has a `person` field → People record for CRM dedup.
// (Originally added for Attio sequence enrollment, which was replaced by Resend.)
// Kept because People records are useful for Attio's contact management features.

import { findOrCreatePerson } from "@/lib/attio-people";

// Upserts by email — same email = same People record across object types
const personId = await findOrCreatePerson({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+15551234567",
});

// Link to custom object
const customerData = {
  ...otherFields,
  person: { target_object: "people", target_record_id: personId },
};

// ⚠️ People built-in object uses DIFFERENT field formats:
// - name: [{ first_name, last_name, full_name }]  (personal-name type)
// - email_addresses: [{ email_address: "x@y.com" }]
// - phone_numbers: [{ original_phone_number: "+1..." }]
// Do NOT use separate first_name/last_name fields — they don't exist on People!
```

### 16. Multi-select attributes require array values
```typescript
// WRONG - single string rejected for multi-select
await attio.updateRecord("people", id, { person_type: "Agent" });
// Error: "Multi-select attribute expects an array but received a single value"

// CORRECT - wrap in array
await attio.updateRecord("people", id, { person_type: ["Agent"] });

// PATCH appends to multi-select (existing values preserved)
// PUT replaces entire multi-select (existing values lost)
```

### 17. Scripts must use dynamic imports for env vars
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

### People Record Linkage

Every custom object record has a `person` field linking to a built-in People record for CRM contact management:

| Custom Object | `person` field | Purpose |
|---------------|---------------|---------|
| Customer | → People | CRM contact dedup |
| Agent | → People | CRM contact dedup |
| Lender | → People | CRM contact dedup |
| Intern | → People | CRM contact dedup |

People records are deduped by email — same email across object types = same People record.

Each People record has a `person_type` multi-select field (Agent, Lender, Customer, Intern) set automatically by `findOrCreatePerson()`. Dual-role people accumulate multiple tags (e.g., `[Agent, Customer]`).

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
| `lib/attio.ts` | Attio API client (CRUD, query, assertRecord, createNote) |
| `lib/attio-people.ts` | People record upsert for CRM contact management |
| `lib/attio-data-loader.ts` | Cached data loader for website |
| `lib/attio-schema.ts` | Schema definitions and constants |
| `lib/email.ts` | Resend email client with Attio note logging |
| `emails/templates/` | React Email templates (19 total) |
| `services/stateService.tsx` | Fetches agents/lenders for state pages |
| `services/salesForcePostFormsService.tsx` | Contact form submissions + email sends |
| `app/api/webhooks/attio/route.ts` | Attio webhook: cache revalidation + stage-change emails |
| `app/api/cron/stale-leads/route.ts` | Stale lead re-routing (every 2hrs) |
| `app/api/cron/follow-up-emails/route.ts` | Onboarding follow-up drips (daily) |
| `app/(site)/portal/page.tsx` | Agent portal for magic link confirmation |
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
| `GET /api/portal/deal` | Fetch deal data for portal display |
| `POST /api/webhooks/attio` | Handle Attio events, revalidate cache, send stage-change emails |
| `GET /api/cron/stale-leads` | Stale lead re-routing (Vercel cron) |
| `GET /api/cron/follow-up-emails` | Onboarding follow-up drips (Vercel cron) |

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

**Architecture:** Hybrid approach — Attio handles CRM data + Slack notifications, Resend handles all email delivery, React Email provides typed templates.

### How Emails Are Sent

```
Form Submission → Create Attio Records → Send Email via Resend (code has all data)
Stage Change → Attio Webhook → Our Handler → Query Data → Send Email via Resend
Follow-ups → Vercel Cron → Query Attio → Send Email via Resend
```

**Key files:**
- `lib/email.ts` — Resend client wrapper with Attio note logging
- `emails/templates/` — 19 React Email templates (typed props, no merge field limitations)
- `services/salesForcePostFormsService.tsx` — Form handlers send immediate emails
- `app/api/webhooks/attio/route.ts` — Stage-change emails
- `app/api/cron/stale-leads/route.ts` — Stale lead re-routing (every 2hrs)
- `app/api/cron/follow-up-emails/route.ts` — Onboarding follow-up drips (daily)

### Attio Workflows (8 total, Slack-only)

Workflows handle Slack notifications. Email sending was removed from workflows (handled by application code instead).

| # | Workflow | Trigger | Actions |
|---|----------|---------|---------|
| WF1 | New Customer Deal Created | Record added to list | Slack notification |
| WF2 | Customer Deal Stage Changed | List entry updated | Slack notification |
| WF3a | Agent Onboarding Created | Record added to list | Slack notification |
| WF3b | Agent Onboarding Stage Changed | List entry updated | Slack notification |
| WF4a | Lender Onboarding Created | Record added to list | Slack notification |
| WF4b | Lender Onboarding Stage Changed | List entry updated | Slack notification |
| WF5a | Intern Placement Created | Record added to list | Slack notification |
| WF5b | Intern Placement Stage Changed | List entry updated | (no action needed) |

### Email Templates (19 total, React Email)

| Category | Templates | Sent By |
|----------|-----------|---------|
| Customer | C1-C5 + C2b (confirmations, milestones, reassignment) | Form handlers + webhook |
| Agent | A1-A5 (leads, onboarding) | Form handlers + webhook + cron |
| Lender | L1-L5 (leads, onboarding) | Form handlers + webhook + cron |
| Intern | I1-I2 (welcome, follow-up) | Form handler + cron |

### Slack Channels

| Channel | Purpose |
|---------|---------|
| `#new-leads` | Assigned leads |
| `#leads-unassigned` | Unassigned leads (Beth monitors) |
| `#agent-applications` | Agent onboarding |
| `#lender-applications` | Lender onboarding |
| `#intern-applications` | Intern applications |
| `#deals` | Under contract, won, lost |

**Documentation:**
- `docs/attio-workflows.md` - 8 workflows (Slack-only)
- `docs/attio-email-templates.md` - Email content reference (templates implemented in `emails/templates/`)

---

## Stale Lead/Deal Automation (Vercel Cron)

Handled by application cron jobs, not Attio workflows.

### `/api/cron/stale-leads` (every 2 hours)
1. **12-hour re-route** — Deals in "New Lead" where `contact_confirmed = false` AND created > 12h ago → re-route to next AA_Score agent
2. **7-day reminder** — Deals in open stages where `last_updated < 7 days ago` → SMS reminder to agent
3. **14-day alert** — Deals where `last_updated < 14 days ago` → Slack alert to admin
4. **45-day auto-close** — Deals where `last_stage_change < 45 days ago` → move to "Closed Lost"

### `/api/cron/follow-up-emails` (daily at 2pm UTC)
- Query onboarding entries in "New Application" stage
- Send follow-up emails (A3/L3/I2) at 7-day intervals, up to 4 times

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
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (default: `VeteranPCS <tech@veteranpcs.com>`)
- `CRON_SECRET` (Vercel sets this for cron job auth)

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
