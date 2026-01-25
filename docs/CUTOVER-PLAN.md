# VeteranPCS Attio Migration - Cutover Plan

**Domain:** https://www.veteranpcs.com
**Environment Variable:** `NEXT_PUBLIC_BASE_URL=https://www.veteranpcs.com`
**Last Updated:** 2026-01-21

---

## Overview

This document contains step-by-step instructions for completing the Attio migration cutover. Follow each section in order.

**Estimated Total Time:** 2-3 hours

---

## Table of Contents

1. [Pre-Cutover: Environment Variables](#1-pre-cutover-environment-variables)
2. [Configure Attio Webhooks](#2-configure-attio-webhooks)
3. [Configure Attio Workflows](#3-configure-attio-workflows)
4. [Final Data Sync (Day of Cutover)](#4-final-data-sync-day-of-cutover)
5. [Deploy and Verify](#5-deploy-and-verify)
6. [Post-Cutover Monitoring](#6-post-cutover-monitoring)

---

## 1. Pre-Cutover: Environment Variables ✅ COMPLETED

### 1.1 Generate Required Secrets ✅

~~You need two new secrets. Generate them using a password generator (16+ random characters each):~~

```bash
# Option 1: Use openssl
openssl rand -hex 16  # For CRON_SECRET
openssl rand -hex 16  # For ATTIO_WEBHOOK_SECRET

# Option 2: Use 1Password or similar password manager
# Generate 32-character random strings
```

### 1.2 Add Environment Variables in Vercel ✅

~~1. Go to [Vercel Dashboard](https://vercel.com/dashboard)~~
~~2. Select your project: **vpcs-nextjs-website**~~
~~3. Navigate to **Settings** → **Environment Variables**~~
~~4. Add the following variables for **Production** environment:~~

| Variable | Value | Status |
|----------|-------|--------|
| `ATTIO_WEBHOOK_SECRET` | (configured) | ✅ Added to Vercel Production |

**Note:** `CRON_SECRET` is no longer needed - scheduled automations are handled by Attio native workflows.

**Note:** These should already exist in your `.env.local` for local testing:
- `ATTIO_API_KEY` ✅ (already configured)
- `SLACK_WEBHOOK_URL` ✅ (already configured)
- `OPENPHONE_API_KEY` ✅ (already configured)
- `MAGIC_LINK_SECRET` ✅ (already configured)

### 1.3 Verify Existing Variables ✅

All required variables are now set in Vercel Production:

```
ATTIO_API_KEY ✅
SLACK_WEBHOOK_URL ✅
OPENPHONE_API_KEY ✅
MAGIC_LINK_SECRET ✅
ATTIO_WEBHOOK_SECRET ✅
NEXT_PUBLIC_BASE_URL=https://www.veteranpcs.com ✅
```

---

## 2. Configure Attio Webhooks

### 2.1 Access Attio Developer Settings

1. Log in to [Attio](https://app.attio.com)
2. Click your **profile icon** (bottom left)
3. Select **Workspace settings**
4. Navigate to **Developers** section
5. Click **Webhooks** tab

### 2.2 Create the Webhook

Click **Create webhook** and configure:

| Field | Value |
|-------|-------|
| **Target URL** | `https://www.veteranpcs.com/api/webhooks/attio` |
| **Secret** | Use the same value you set for `ATTIO_WEBHOOK_SECRET` in Vercel |

### 2.3 Subscribe to Events

Select these events to trigger the webhook:

**Record Events (for cache revalidation):**
- ✅ `record.created` - When any record is created
- ✅ `record.updated` - When any record is updated
- ✅ `record.deleted` - When any record is deleted

**Filter by Objects (recommended for performance):**
If Attio allows filtering by object type, select only:
- `agents`
- `lenders`
- `areas`
- `area_assignments`

### 2.4 How Webhook Verification Works

Your webhook route already implements Attio's signature verification:

```typescript
// From app/api/webhooks/attio/route.ts
const signature = request.headers.get('x-attio-signature');
const body = await request.text();

const expectedSig = crypto
  .createHmac('sha256', ATTIO_WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

if (signature !== expectedSig) {
  return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
}
```

Attio sends the signature in the `Attio-Signature` header (also `X-Attio-Signature` for compatibility).

**Reference:** [Attio Webhook Documentation](https://docs.attio.com/rest-api/guides/webhooks)

### 2.5 Test the Webhook (After Deploy)

After deploying to production, test the webhook:

1. In Attio, go to an Agent record
2. Make a small edit (e.g., update bio)
3. Save the record
4. Check Vercel logs for webhook receipt:
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Filter by path: `/api/webhooks/attio`
   - Should see: `Processing Attio webhook: record.updated on agents/...`

---

## 3. Configure Attio Workflows

Attio's native workflow automation replaces custom cron jobs for scheduled tasks. Configure these in Attio's UI.

### 3.1 Access Workflow Builder

1. Log in to [Attio](https://app.attio.com)
2. Click **Automations** in the left sidebar
3. Click **Create workflow**

### 3.2 Stale Lead Re-routing Workflow

**Purpose:** Re-route leads to next-best agent after 12 hours without contact confirmation.

**Configuration:**
1. **Trigger:** Recurring Schedule → Every 6 hours (or hourly for faster response)
2. **Action:** Query Customer Deals where:
   - Stage = "New Lead"
   - `contact_confirmed` = false
   - `created_at` < 12 hours ago
   - `reroute_count` = 0
3. **For Each** matching deal:
   - Find agent's area from area_assignments
   - Query next-highest AA_Score agent in that area
   - **If** agent found:
     - Update deal: set `agent` to new agent, `reroute_count` = 1
     - Send Slack notification to new agent (or HTTP Request to OpenPhone)
   - **Else:**
     - Send Slack alert to admin channel ("Manual assignment needed")

### 3.3 Stale Deal Reminders (7-day)

**Purpose:** Send SMS reminder to agents for deals with no activity in 7 days.

**Configuration:**
1. **Trigger:** Recurring Schedule → Daily at 8:00 AM
2. **Action:** Query Customer Deals where:
   - Stage in: New Lead, Contacted, Touring, Tracking <1mo, Tracking 1-2mo, Tracking 3-6mo, Tracking 6+, Under Contract
   - `last_updated` < 7 days ago
   - `last_updated` >= 14 days ago (to avoid overlap with 14-day alert)
3. **For Each** matching deal:
   - Get assigned agent's phone number
   - Send notification via Slack or HTTP Request to OpenPhone API

### 3.4 Stale Deal Admin Alert (14-day)

**Purpose:** Alert admins about deals stalled for 14+ days.

**Configuration:**
1. **Trigger:** Recurring Schedule → Daily at 8:00 AM
2. **Action:** Query Customer Deals where:
   - Stage in open stages (same as above)
   - `last_updated` < 14 days ago
3. **For Each** matching deal:
   - Send Slack message with deal details, customer name, agent name, days stalled

### 3.5 Auto-Close Stale Deals (45-day)

**Purpose:** Automatically close deals that have been in the same stage for 45+ days.

**Configuration:**
1. **Trigger:** Recurring Schedule → Daily at 6:00 AM
2. **Action:** Query Customer Deals where:
   - Stage in open stages
   - `last_stage_change` < 45 days ago
3. **For Each** matching deal:
   - Update stage to "Closed Lost"
   - Append to notes: "[Auto-closed: 45 days in same stage - {date}]"

### 3.6 Open Stages Reference

Use these stages when filtering for "open" deals:
- New Lead
- Contacted
- Touring
- Tracking <1mo
- Tracking 1-2mo
- Tracking 3-6mo
- Tracking 6+
- Under Contract

**Reference:** [Attio Workflows Documentation](https://attio.com/help/reference/automations/workflows/getting-started-with-workflows)

---

## 4. Final Data Sync (Day of Cutover)

### 4.1 Export Fresh Salesforce Data

**In Salesforce:**
1. Navigate to **Reports** or use **Data Export**
2. Export these objects as CSV:
   - Account.csv (all Person Accounts)
   - Contact.csv (all Contacts)
   - Opportunity.csv (all Opportunities)
   - Area__c.csv (all Areas)
   - Area_Assignment__c.csv (all Area Assignments)

3. Place files in `data/salesforce/` directory

### 4.2 Run Data Cleaning

```bash
# If you have a data cleaning script, run it:
npx tsx scripts/clean-data.ts

# This should generate:
# - data/cleaned/data-cleaned-agents.csv
# - data/cleaned/data-cleaned-lenders.csv
# - data/cleaned/data-cleaned-customers.csv
# - data/cleaned/data-cleaned-areas.csv
# - data/cleaned/data-cleaned-area_assignments.csv
# - data/cleaned/data-cleaned-relationships.csv
```

### 4.3 Clear Existing Attio Data (Optional)

If doing a full re-migration:

```bash
# Delete in reverse dependency order
npx tsx scripts/delete-attio-data.ts agent_onboarding
npx tsx scripts/delete-attio-data.ts lender_onboarding
npx tsx scripts/delete-attio-data.ts customer_deals
npx tsx scripts/delete-attio-data.ts area_assignments
npx tsx scripts/delete-attio-data.ts areas
npx tsx scripts/delete-attio-data.ts customers
npx tsx scripts/delete-attio-data.ts agents
npx tsx scripts/delete-attio-data.ts lenders
# DO NOT delete states - they are static reference data
```

### 4.4 Run V2 Migrations

```bash
# 1. Person records (can run in parallel)
npx tsx scripts/migrate-agents-v2.ts
npx tsx scripts/migrate-lenders-v2.ts
npx tsx scripts/migrate-customers-v2.ts

# 2. Areas (depends on states)
npx tsx scripts/migrate-areas-v2.ts

# 3. State-lender assignments (IMPORTANT: Run AFTER lenders migration)
npx tsx scripts/migrate-state-lenders-v2.ts

# 4. Area assignments (depends on agents + areas)
npx tsx scripts/migrate-area-assignments-v2.ts

# 5. Pipelines (depends on customers + agents + lenders)
npx tsx scripts/migrate-customer-deals-v2.ts
npx tsx scripts/migrate-agent-onboarding-v2.ts
npx tsx scripts/migrate-lender-onboarding-v2.ts
```

**⚠️ IMPORTANT:** If you previously ran migrations and State.lenders contains stale UUIDs:
```bash
# Clean up orphaned lender references (run after migrate-state-lenders-v2.ts)
npx tsx scripts/cleanup-stale-lender-refs.ts
```

This fixes an issue where re-migrating lenders creates new UUIDs, but State.lenders still references old UUIDs. Symptoms: state pages show 0 lenders despite lenders being assigned.

### 4.5 Verify Migration Counts

```bash
npx tsx scripts/check-attio-data.ts
```

Expected counts (approximate):
| Object | Expected |
|--------|----------|
| States | 52 |
| Agents | ~1,027 |
| Lenders | ~138 |
| Customers | ~944 |
| Areas | ~271 |
| Area Assignments | ~503 |
| Customer Deals | ~925 |
| Agent Onboarding | ~902 |
| Lender Onboarding | ~138 |

---

## 5. Deploy and Verify

### 5.1 Merge to Main

```bash
# Ensure all changes are committed
git status

# Switch to main and merge
git checkout main
git pull origin main
git merge attio-migration

# Push to trigger deployment
git push origin main
```

### 5.2 Verify Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Wait for deployment to complete (green checkmark)
4. Verify the deployment URL: https://www.veteranpcs.com

### 5.3 Verify Attio Workflows

1. In Attio → **Automations** → **Workflows**
2. Verify these workflows are active:
   - Stale Lead Re-routing (every 6 hours or hourly)
   - Stale Deal Reminders (daily)
   - Stale Deal Admin Alert (daily)
   - Auto-Close Stale Deals (daily)

### 5.4 Test End-to-End Lead Flow

1. **Submit a test form** on https://www.veteranpcs.com (use a test email)
2. **Verify in Attio:**
   - New Customer record created
   - New Customer Deal in pipeline
   - Agent assigned
3. **Verify notifications sent:**
   - Check OpenPhone for SMS to agent
   - Check Slack for notification (if configured)

### 5.5 Test a State Page

1. Visit https://www.veteranpcs.com/texas
2. Verify agents display correctly
3. Verify lenders display correctly
4. Check browser console for errors

---

## 6. Post-Cutover Monitoring

### 6.1 First 24 Hours

**Check Vercel Logs frequently:**
1. Vercel Dashboard → Logs
2. Filter by:
   - `/api/webhooks/attio` - Webhook processing
   - `/api/cron/` - Cron job execution
   - Error logs

**Monitor for:**
- ❌ 401 Unauthorized errors (secret mismatch)
- ❌ 500 Internal Server errors (code bugs)
- ❌ Timeout errors (slow queries)

### 6.2 Verify Attio Workflow Execution

**After first scheduled run:** Check workflow execution in Attio
1. Go to Attio → **Automations** → **Workflows**
2. Click on each workflow to view execution history
3. Verify workflows are running on schedule and processing records

### 6.3 Verify Cache Revalidation

1. Make a change to an Agent in Attio (e.g., update bio)
2. Wait 30 seconds
3. Visit the agent's state page (e.g., /texas)
4. Verify the change appears (may need hard refresh)

### 6.4 Slack Alert Verification

If you have Slack configured, you should receive alerts for:
- Stale deals (14+ days without update)
- Escalated leads (no agent available for re-route)

---

## Troubleshooting

### Attio Workflows Not Running

1. Verify workflow is **Active** (not paused) in Attio → Automations
2. Check workflow execution history for errors
3. Verify trigger schedule is configured correctly
4. Test with a manual run to verify logic works

### Webhook Signature Mismatch

1. Verify `ATTIO_WEBHOOK_SECRET` in Vercel matches Attio webhook secret exactly
2. Check for leading/trailing whitespace
3. Test locally with the secret

### State Pages Showing 0 Lenders

**Symptom:** Texas (or other states) shows agents but no lenders, even though lenders are assigned in Attio.

**Cause:** After V2 re-migration, lender records got new UUIDs, but `State.lenders` multi-ref field still contains old (orphaned) UUIDs.

**Fix:**
```bash
# Re-run state-lenders migration to add new UUIDs
npx tsx scripts/migrate-state-lenders-v2.ts

# Then clean up stale references
npx tsx scripts/cleanup-stale-lender-refs.ts
```

**Verification:**
```bash
# Test that lenders are returned correctly
set -a && source .env.local && set +a && npx tsx -e '
const stateService = require("./services/stateService.tsx").default;
async function test() {
  const lenders = await stateService.fetchLendersListByState("texas");
  console.log("Texas lenders:", lenders.totalSize);
}
test();
'
```

---

## Sources

- [Attio Developer Documentation](https://docs.attio.com/)
- [Attio Webhook Reference](https://docs.attio.com/rest-api/guides/webhooks)
- [Attio Record Events](https://docs.attio.com/rest-api/webhook-reference/record-events/recordcreated)
- [Attio Workflows - Getting Started](https://attio.com/help/reference/automations/workflows/getting-started-with-workflows)
- [Attio Workflows - Block Library](https://attio.com/help/reference/automations/workflows/workflows-block-library)
