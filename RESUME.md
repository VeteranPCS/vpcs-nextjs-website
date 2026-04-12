# VeteranPCS - Quick Resume Guide

**Last Updated:** 2026-04-11
**Project:** VeteranPCS CRM (Attio-powered)
**Branch:** attio-migration
**Status:** E2E TESTING — 11/14 PASS (Test 3 re-verified 2026-04-11), 2 PARTIAL, 1 REMAINING

---

## Current State

The Salesforce → Attio migration is **complete**. Email automation uses **Resend** (not Attio sequences):
- All agent/lender/customer data in Attio
- 19 React Email templates in `emails/templates/`
- Form handlers send emails via Resend with full cross-entity data
- Webhook handler sends stage-change emails (C4/C5/A4/A5/L4/L5)
- Cron jobs handle stale leads and follow-up drips
- Agent portal page at `/portal` for magic link confirmation

### What's Next

1. **Complete Test 14** — Dual-role person_type accumulation test
2. **Cleanup test records** — `npx tsx scripts/test-teardown.ts` + manual Attio cleanup
3. **Deploy to production**
4. **Enhancement Phase:** Multi-step contact form, area-based agent routing

### Recent Changes (2026-04-03)
- **Inquiries pipeline** on People object replaces customer record creation from general contact form
- **WF6** Attio workflow: New Inquiry → Slack `#leads-unassigned`
- **9 Attio workflows** total (was 8): added WF6 for inquiries
- Form dropdowns now match Attio select values directly (Active Duty, Marines)
- Currency field parsing fixed in `parseListEntry`
- Agent form error handling fixed (submit button no longer gets stuck)

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions, Attio API learnings, architecture |
| `SESSION-NOTES.md` | Session history and context |
| `lib/attio.ts` | Attio API client (incl. createNote, getListEntry) |
| `lib/email.ts` | Resend email client with Attio note logging |
| `emails/templates/` | 19 React Email templates |
| `lib/attio-data-loader.ts` | Cached data loader for website |
| `services/stateService.tsx` | Fetches agents/lenders for state pages |
| `lib/attio-people.ts` | People record upsert + person_type tagging |
| `services/salesForcePostFormsService.tsx` | Contact form submissions + email sends |
| `app/api/webhooks/attio/route.ts` | Webhook: cache revalidation + stage-change emails |
| `app/api/cron/stale-leads/route.ts` | Stale lead re-routing cron |
| `app/api/cron/follow-up-emails/route.ts` | Follow-up drip emails cron |
| `app/(site)/portal/page.tsx` | Agent portal (magic link destination) |
| `scripts/test-setup.ts` | Creates test agent/lender in Colorado |
| `scripts/test-teardown.ts` | Removes all test records |

---

## Quick Commands

```bash
# Start development
npm run dev

# Run a migration/utility script
npx tsx scripts/[script-name].ts

# Security scan
npm run security

# Commit changes
git add .
git commit -m "Description"
git push origin attio-migration
```

---

## Environment Variables

Required in `.env.local`:
- `ATTIO_API_KEY` - Attio API access
- `ATTIO_WEBHOOK_SECRET` - Webhook signature verification
- `OPENPHONE_API_KEY` - SMS notifications
- `SLACK_WEBHOOK_URL` - Admin notifications
- `MAGIC_LINK_SECRET` - Agent portal JWT signing
- `NEXT_PUBLIC_BASE_URL` - Site URL for magic links
- `RESEND_API_KEY` - Resend email delivery
- `RESEND_FROM_EMAIL` - Sender address (default: `VeteranPCS <tech@veteranpcs.com>`)
- `CRON_SECRET` - Vercel cron job auth

---

## Need Help?

1. Read `CLAUDE.md` for Attio API patterns and architecture
2. Check `docs/migration/LLD.md` for implementation details
3. Review recent sessions in `SESSION-NOTES.md`
