# VeteranPCS - Quick Resume Guide

**Last Updated:** 2026-03-15
**Project:** VeteranPCS CRM (Attio-powered)
**Branch:** attio-migration
**Status:** HYBRID EMAIL ARCHITECTURE IMPLEMENTED

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

1. **Simplify Attio workflows** — Remove sequence enrollment/exit blocks in Attio UI (keep Slack)
2. **Test email delivery** — Submit test forms, verify Resend emails
3. **Create dedicated Slack channels** — currently posting to `#general`
4. **Retire `#salesforce-alerts`** Slack channel

**Enhancement Phase:**
1. Multi-step contact form with Buying/Selling/Both selection
2. Area-based agent routing for unselected agents

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
