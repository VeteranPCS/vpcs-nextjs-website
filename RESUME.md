# VeteranPCS - Quick Resume Guide

**Last Updated:** 2026-01-29
**Project:** VeteranPCS CRM (Attio-powered)
**Branch:** attio-migration (ready for merge to main)
**Status:** MIGRATION COMPLETE - Enhancement Phase

---

## Current State

The Salesforce → Attio migration is **complete**. The website now:
- Reads all agent/lender data from Attio
- Creates customers and deals in Attio via contact forms
- Uses Attio UUIDs for agent/lender references in URLs

### What's Next

**Enhancement Phase (Optional):**
1. Multi-step contact form with Buying/Selling/Both selection
2. Area-based agent routing for unselected agents
3. Configure Attio Workflows for stale lead/deal automation

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
