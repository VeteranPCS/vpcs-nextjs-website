# VeteranPCS CRM (Attio)

VeteranPCS website powered by Attio CRM. Next.js 14 App Router, TypeScript, Resend email, Sanity (images only).

**Branch:** attio-migration | **Status:** Hybrid email architecture (Resend + Attio CRM) implemented

---

## Behavioral Rules

1. **Diagnose before fixing.** When debugging, verify the root cause before attempting fixes. Do not apply multiple speculative fixes in sequence — diagnose first, then fix once. If the first fix doesn't work, step back and re-diagnose rather than trying variations.

2. **Prefer implementation over planning.** If the user gives a plan or asks to build something, start implementing immediately. Do not spend time exploring or creating additional plans unless explicitly asked.

3. **Verify Attio API patterns against `.claude/references/attio-api-reference.md`** before writing any Attio query or record creation code. The top 5 bugs are: missing `target_object`, flat record-ref filters, using `$contains`, filtering by `id`, and wrong stage syntax.

4. **Verify API capabilities against actual documentation** before assuming Attio features exist. Do not assume workflow or sequence capabilities without citing docs. Use context7 MCP or fetch from https://docs.attio.com/rest-api/overview.

---

## Session Management

**On Session Start:** Read `RESUME.md` for context, check `SESSION-NOTES.md` for recent history, ask what to work on.
**On Session End:** Update `SESSION-NOTES.md` with summary, ask user to commit.

---

## Architecture

```
Website Data Flow:
  lib/attio-data-loader.ts → unstable_cache (1hr) → in-memory lookups
  app/(site)/[state]/page.tsx → stateService → cached Attio data + Sanity photos

Email Flow:
  Form Submission → Create Attio Records → Send via Resend (lib/email.ts)
  Stage Change → Attio Webhook → Our Handler → Query Data → Send via Resend
  Follow-ups → Vercel Cron → Query Attio → Send via Resend

Attio Workflows (9 total): Slack notifications only. All email via Resend.
  WF6: New Inquiry → Slack #leads-unassigned (general contact form)
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/attio.ts` | Attio API client (CRUD, query, assertRecord, createNote) |
| `lib/attio-people.ts` | People record upsert (dedup by email) |
| `lib/attio-data-loader.ts` | Cached data loader for website |
| `lib/email.ts` | Resend email client + Attio note logging |
| `emails/templates/` | 19 React Email templates (C1-C5, A1-A5, L1-L5, I1-I2) |
| `services/salesForcePostFormsService.tsx` | Form submissions + email sends |
| `app/api/webhooks/attio/route.ts` | Cache revalidation + stage-change emails |
| `app/api/cron/stale-leads/route.ts` | Lead re-routing (every 2hrs) |
| `app/api/cron/follow-up-emails/route.ts` | Onboarding follow-up drips (daily) |
| `app/(site)/portal/page.tsx` | Agent portal (magic link confirmation) |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/magic-link/validate` | GET | Validate agent portal token |
| `/api/magic-link/update` | POST | Update deal from portal |
| `/api/portal/deal` | GET | Fetch deal for portal display |
| `/api/webhooks/attio` | POST | Attio events → cache revalidation + emails |
| `/api/cron/stale-leads` | GET | Stale lead re-routing (Vercel cron) |
| `/api/cron/follow-up-emails` | GET | Follow-up drips (Vercel cron) |

---

## Business Rules

- **Lead Routing:** Veteran selects agent → assigned. No confirmation in 12h → re-route to highest AA_Score agent. Max 1 re-route, then escalate.
- **Auto-Activation:** Agent active when: lifecycle_stage = "Contract Signed" + headshot + bio + military_service all exist.
- **Stalled Deals:** 7d → SMS reminder. 14d → Slack alert. 45d → auto-close as Lost.
- **Bonus Tiers:** $200 (<$100K) to $4,000 ($1M+). See `lib/bonus-calculator.ts`.

---

## Environment Variables

Required in `.env.local`: `ATTIO_API_KEY`, `ATTIO_WEBHOOK_SECRET`, `OPENPHONE_API_KEY`, `SLACK_WEBHOOK_URL`, `MAGIC_LINK_SECRET`, `NEXT_PUBLIC_BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`

---

## References (Deep Dives)

| Reference | When to Read |
|-----------|-------------|
| `.claude/references/attio-api-reference.md` | Writing ANY Attio API code (queries, records, webhooks, People) |
| `docs/migration/PRD.md` | Business requirements |
| `docs/migration/HLD.md` | Architecture, data model |
| `docs/migration/LLD.md` | Implementation details |
| `docs/attio-workflows.md` | 9 Attio workflows (Slack-only, incl. WF6 Inquiries) |
| `docs/attio-email-templates.md` | Email content reference |

---

## Historical: Salesforce Migration

Completed January 2026. ~1,027 agents, ~138 lenders, ~944 customers migrated. Salesforce RecordTypeIds and CSV patterns documented in `docs/migration/`.
