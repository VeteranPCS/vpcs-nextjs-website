# VeteranPCS - Quick Resume Guide

**Last Updated:** 2026-02-26
**Project:** VeteranPCS CRM (Attio-powered)
**Branch:** attio-migration
**Status:** MIGRATION COMPLETE — Automation setup in progress

---

## Current State

The Salesforce → Attio migration is **complete**. The website now:
- Reads all agent/lender data from Attio
- Creates customers and deals in Attio via contact forms
- Uses Attio UUIDs for agent/lender references in URLs
- All 8 Attio Workflows are **built and Live** in the Attio UI

### What's Next

**Automation Setup (in order):**
1. Verify email sync — Gmail or Microsoft account synced in Attio
2. Create 14 sequences in Attio UI → `docs/attio-sequences.md`
3. Paste 18 email templates into sequences → `docs/attio-email-templates.md`
4. Run `npx tsx scripts/test-setup.ts` to create test records in Colorado
5. Test workflows end-to-end → `docs/e2e-test-plan.md`
6. Run `npx tsx scripts/test-teardown.ts` to clean up test records
7. Create dedicated Slack channels (currently all posting to #general)

**Enhancement Phase (after automation is tested):**
1. Multi-step contact form with Buying/Selling/Both selection
2. Area-based agent routing for unselected agents

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions, Attio API learnings, architecture |
| `SESSION-NOTES.md` | Session history and context |
| `lib/attio.ts` | Attio API client |
| `lib/attio-data-loader.ts` | Cached data loader for website |
| `services/stateService.tsx` | Fetches agents/lenders for state pages |
| `services/salesForcePostFormsService.tsx` | Contact form submissions (creates Attio records) |
| `docs/e2e-test-plan.md` | Manual test checklist for all 8 workflows |
| `scripts/test-setup.ts` | Creates test agent/lender in Colorado |
| `scripts/test-teardown.ts` | Removes all test records |
| `docs/migration/` | PRD, HLD, LLD documentation |

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

---

## Need Help?

1. Read `CLAUDE.md` for Attio API patterns and architecture
2. Check `docs/migration/LLD.md` for implementation details
3. Review recent sessions in `SESSION-NOTES.md`
