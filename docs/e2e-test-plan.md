# End-to-End Workflow & Sequence Test Plan

**Date:** 2026-02-26
**Branch:** attio-migration
**Purpose:** Verify all 8 Attio Workflows, 14 Sequences, and 18 Email Templates work correctly before merging to production.

---

## Prerequisites

Before starting, complete these setup steps:

- [ ] **Email sync**: Gmail or Microsoft account synced in Attio (Settings > Email sync). Sequences cannot send without this.
- [ ] **14 sequences created** in Attio UI (see `docs/attio-sequences.md`)
- [ ] **18 email templates pasted** into sequences (see `docs/attio-email-templates.md`)
- [ ] **Test records created**: Run `npx tsx scripts/test-setup.ts` and save the output IDs
- [ ] **Dev server running**: `npm run dev` (or use preview deployment)
- [ ] **Verify test records**: Visit `/colorado` and confirm:
  - [ ] Test agent "Harper Foley (TEST AGENT)" appears with blue placeholder photo
  - [ ] Test lender "Harper Foley (TEST LENDER)" appears with blue placeholder photo
  - [ ] Clicking "Contact Now" on the test agent goes to the contact form with correct `id` parameter

---

## Test Cases

### WF1: New Customer Deal Created

**Trigger:** Record added to Customer Deals pipeline

#### 1a: Customer deal with assigned agent
1. Go to `/contact-agent` page (or click "Contact Now" on test agent)
2. Fill out form:
   - First Name: `Test`
   - Last Name: `Customer`
   - Email: `harper+testcustomer@gmail.com`
   - Phone: `555-555-0103`
   - Select the test agent
3. Submit the form

**Expected:**
- [ ] Customer record created in Attio
- [ ] Customer deal created in Customer Deals pipeline (stage: "New Lead")
- [ ] Customer enrolled in **C2 (Welcome-Agent)** sequence
- [ ] Agent enrolled in **A1 (Lead Alert)** sequence
- [ ] Slack notification in `#new-leads` (currently `#general`)
- [ ] SMS sent to test agent via OpenPhone
- [ ] Email received at `harper+testcustomer@gmail.com` (C2 welcome email)

#### 1b: Customer deal with assigned lender
1. Go to `/contact-lender` page (or click "Contact Now" on test lender)
2. Fill out form with:
   - Email: `harper+testcustomer2@gmail.com`
   - Select the test lender
3. Submit

**Expected:**
- [ ] Customer enrolled in **C3 (Welcome-Lender)** sequence
- [ ] Lender enrolled in **L1 (Lead Alert)** sequence
- [ ] Slack notification in `#new-leads`

#### 1c: Customer deal with no agent or lender
1. Create a customer deal via Attio UI (or API) with no agent/lender assigned

**Expected:**
- [ ] Customer enrolled in **C1 (Welcome-Unassigned)** sequence
- [ ] Slack notification in `#leads-unassigned`

---

### WF2: Customer Deal Stage Changed

**Trigger:** List entry updated on Customer Deals

#### 2a: Move deal to "Under Contract"
1. In Attio UI, find the test customer's deal
2. Change stage to "Under Contract"

**Expected:**
- [ ] Customer enrolled in **C4 (Under Contract)** sequence
- [ ] Slack notification in `#deals`

#### 2b: Move deal to "Paid Complete"
1. Change stage to "Paid Complete"

**Expected:**
- [ ] Customer enrolled in **C5 (Closed)** sequence
- [ ] Slack notification in `#deals`

#### 2c: Move deal to "Closed Lost"
1. Change stage to "Closed Lost"

**Expected:**
- [ ] Slack notification in `#deals`
- [ ] **No sequence enrollment** (closed lost customers don't get follow-up emails)

---

### WF3a: Agent Onboarding Created

**Trigger:** Record added to Agent Onboarding pipeline

#### 3a: Submit get-listed-agents form
1. Go to `/get-listed` agents form
2. Fill out with test agent data:
   - Email: `harper+testagent2@gmail.com`
   - Military Service: Army
3. Submit

**Expected:**
- [ ] Agent record created (or matched) in Attio
- [ ] Agent added to Agent Onboarding pipeline (stage: "New Application")
- [ ] Agent enrolled in **A2 (Onboarding Welcome)** sequence
- [ ] Slack notification in `#agent-applications`

---

### WF3b: Agent Onboarding Stage Changed

**Trigger:** List entry updated on Agent Onboarding

#### 3b: Move to "Interviewing" (test sequence exit)
1. In Attio UI, change test agent's onboarding stage to "Interviewing"

**Expected:**
- [ ] Agent **EXITED** from Agent Onboarding sequence (A3 follow-up should NOT send at day 7)
- [ ] Verify: Attio > Automations > Sequences > Agent Onboarding > check agent is in "Exited" tab, not "Active"

#### 3c: Move to "Contract Sent"
1. Change stage to "Contract Sent"

**Expected:**
- [ ] Agent enrolled in **A4 (Contract Ready)** sequence
- [ ] Slack notification

#### 3d: Move to "Live on Website"
1. Change stage to "Live on Website"

**Expected:**
- [ ] Agent enrolled in **A5 (Live)** sequence
- [ ] Slack notification in `#agent-applications`

---

### WF4a: Lender Onboarding Created

**Trigger:** Record added to Lender Onboarding pipeline

#### 4a: Submit get-listed-lenders form
1. Go to `/get-listed` lenders form
2. Fill out with test lender data:
   - Email: `harper+testlender2@gmail.com`
3. Submit

**Expected:**
- [ ] Lender record created in Attio
- [ ] Lender added to Lender Onboarding pipeline (stage: "New Application")
- [ ] Lender enrolled in **L2 (Onboarding Welcome)** sequence
- [ ] Slack notification in `#lender-applications`

---

### WF4b: Lender Onboarding Stage Changed

**Trigger:** List entry updated on Lender Onboarding

#### 4b: Move to next stage (test sequence exit)
1. In Attio UI, change test lender's onboarding stage past "New Application"

**Expected:**
- [ ] Lender **EXITED** from Lender Onboarding sequence

#### 4c: Move to "Contract Sent"
1. Change stage to "Contract Sent"

**Expected:**
- [ ] Lender enrolled in **L4 (Contract Ready)** sequence

#### 4d: Move to "Live on Website"
1. Change stage to "Live on Website"

**Expected:**
- [ ] Lender enrolled in **L5 (Live)** sequence
- [ ] Slack notification in `#lender-applications`

---

### WF5a: Intern Placement Created

**Trigger:** Record added to Intern Placements pipeline

#### 5a: Submit internship form
1. Go to `/internship` form
2. Fill out with:
   - Email: `harper+testintern@gmail.com`
   - Military Service: Marines
   - Internship Type: Real Estate Agent
3. Submit

**Expected:**
- [ ] Intern record created in Attio
- [ ] Intern added to Intern Placements pipeline (stage: "New Application")
- [ ] Intern enrolled in **I1 (Onboarding Welcome)** sequence
- [ ] Slack notification in `#intern-applications`

---

### WF5b: Intern Placement Stage Changed

**Trigger:** List entry updated on Intern Placements

#### 5b: Move to "Under Review"
1. In Attio UI, change test intern's stage to "Under Review"

**Expected:**
- [ ] Intern **EXITED** from Intern Onboarding sequence (I2 follow-up should NOT send)

---

## Verification Methods

### Check sequence enrollment
1. Attio > Automations > Sequences
2. Click the relevant sequence
3. Check tabs:
   - **Active** = currently enrolled and receiving emails
   - **Paused** = enrolled but paused
   - **Completed** = finished all steps
   - **Exited** = removed by workflow exit block

### Check email delivery
1. Check your real inbox (e.g., `harper+testcustomer@gmail.com`)
2. Check spam/junk folder
3. Allow up to 5 minutes for delivery
4. If no email: verify email sync is active in Attio Settings

### Check Slack notifications
1. Check `#general` channel (workflows currently post there)
2. After creating dedicated channels, check the appropriate channel

### Check SMS (OpenPhone)
1. Check the phone number used in test forms
2. If using a test number (`+15555550103`), check OpenPhone dashboard for outbound SMS logs

---

## Cleanup

When all tests are complete:

```bash
npx tsx scripts/test-teardown.ts
```

This will:
1. Delete the area assignment
2. Remove test lender from Colorado's State.lenders
3. Delete any pipeline entries (deals, onboarding) created during testing
4. Delete any test customer/intern records
5. Delete the test agent and lender records
6. Remove `scripts/test-ids.json`

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No emails sent | Email not synced in Attio | Settings > Email sync > Connect Gmail/Microsoft |
| Sequence shows 0 enrolled | Workflow didn't fire | Check Attio > Automations > Workflows > run history |
| Agent/lender not on `/colorado` | Cache not refreshed | Wait 1 hour or restart dev server |
| Placeholder photo not loading | placehold.co not in image domains | Check `next.config.mjs` remotePatterns |
| Form submission error | API route issue | Check browser console and server logs |
| Slack not posting | Webhook URL incorrect | Check `SLACK_WEBHOOK_URL` in `.env.local` |
| SMS not sending | OpenPhone API issue | Check `OPENPHONE_API_KEY` and phone format |

---

## Sign-Off

| Test | Pass/Fail | Tester | Date | Notes |
|------|-----------|--------|------|-------|
| WF1a (Agent lead) | | | | |
| WF1b (Lender lead) | | | | |
| WF1c (Unassigned) | | | | |
| WF2a (Under Contract) | | | | |
| WF2b (Paid Complete) | | | | |
| WF2c (Closed Lost) | | | | |
| WF3a (Agent onboard) | | | | |
| WF3b (Agent exit seq) | | | | |
| WF3c (Contract Sent) | | | | |
| WF3d (Live) | | | | |
| WF4a (Lender onboard) | | | | |
| WF4b (Lender exit seq) | | | | |
| WF4c (Contract Sent) | | | | |
| WF4d (Live) | | | | |
| WF5a (Intern onboard) | | | | |
| WF5b (Intern exit seq) | | | | |
