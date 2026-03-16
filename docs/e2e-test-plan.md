# End-to-End Test Plan

**Date:** 2026-03-15
**Branch:** attio-migration
**Purpose:** Verify email delivery via Resend, Attio record creation, webhook handling, and cron job automation.

---

## Prerequisites

### A. Environment Setup

- [ ] **Resend API key** configured in `.env.local` (`RESEND_API_KEY`)
- [ ] **Domain verified** in Resend (`veteranpcs.com` — SPF, DKIM, DMARC)
- [ ] **Attio webhook** registered for list-entry events (in addition to record events)

### B. Attio Workflow Simplification

Remove sequence enrollment/exit blocks from all 8 workflows in Attio UI. Keep Slack notification blocks only.

### C. Test Environment

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

**Expected — Records:**
- [ ] Customer record created in Attio
- [ ] Customer deal created in Customer Deals pipeline (stage: "New Lead")
- [ ] **People record** exists for `harper+testcustomer@gmail.com` (Attio > People, search by email)
- [ ] People record has `person_type` = `[Customer]`
- [ ] Customer record's `person` field links to this People record

**Expected — Automation:**
- [ ] C2 email sent via Resend to `harper+testcustomer@gmail.com` (check Resend dashboard)
- [ ] A1 lead alert email sent via Resend to test agent's email
- [ ] Attio note logged on customer record: "Email sent: C2"
- [ ] Attio note logged on agent record: "Email sent: A1"
- [ ] Slack notification in `#general`
- [ ] SMS sent to test agent via OpenPhone

#### 1b: Customer deal with assigned lender
1. Go to `/contact-lender` page (or click "Contact Now" on test lender)
2. Fill out form with:
   - Email: `harper+testcustomer2@gmail.com`
   - Select the test lender
3. Submit

**Expected:**
- [ ] People record exists for `harper+testcustomer2@gmail.com` with `person_type` = `[Customer]`
- [ ] C3 email sent via Resend to customer
- [ ] L1 lead alert email sent via Resend to lender
- [ ] Slack notification in `#general`

#### 1c: Customer deal with no agent or lender
1. Create a customer deal via Attio UI (or API) with no agent/lender assigned

**Expected:**
- [ ] C1 email sent via Resend to customer
- [ ] Slack notification in `#general`

---

### WF2: Customer Deal Stage Changed

**Trigger:** List entry updated on Customer Deals

#### 2a: Move deal to "Under Contract"
1. In Attio UI, find the test customer's deal
2. Change stage to "Under Contract"

**Expected:**
- [ ] C4 email sent via Resend to customer (triggered by webhook handler)
- [ ] Slack notification in `#general`

#### 2b: Move deal to "Paid Complete"
1. Change stage to "Paid Complete"

**Expected:**
- [ ] C5 email sent via Resend to customer with bonus amounts (triggered by webhook handler)
- [ ] Slack notification in `#general`

#### 2c: Move deal to "Closed Lost"
1. Change stage to "Closed Lost"

**Expected:**
- [ ] Slack notification in `#general`
- [ ] **No email sent** (closed lost customers don't get follow-up emails)

---

### WF3a: Agent Onboarding Created

**Trigger:** Record added to Agent Onboarding pipeline

#### 3a: Submit get-listed-agents form
1. Go to `/get-listed` agents form
2. Fill out with test agent data:
   - Email: `harper+testagent2@gmail.com`
   - Military Service: Army
3. Submit

**Expected — Records:**
- [ ] Agent record created in Attio
- [ ] Agent added to Agent Onboarding pipeline (stage: "New Application")
- [ ] **People record** exists for `harper+testagent2@gmail.com` with `person_type` = `[Agent]`
- [ ] Agent record's `person` field links to this People record

**Expected — Automation:**
- [ ] A2 email sent via Resend to agent
- [ ] Attio note logged on agent record: "Email sent: A2"
- [ ] Slack notification in `#general`

---

### WF3b: Agent Onboarding Stage Changed

**Trigger:** List entry updated on Agent Onboarding

#### 3b: Move to "Interviewing" (test sequence exit)
1. In Attio UI, change test agent's onboarding stage to "Interviewing"

**Expected:**
- [ ] No immediate email sent (follow-up emails handled by daily cron, not stage changes)

#### 3c: Move to "Contract Sent"
1. Change stage to "Contract Sent"

**Expected:**
- [ ] A4 email sent via Resend to agent (triggered by webhook handler)
- [ ] Slack notification in `#general`

#### 3d: Move to "Live on Website"
1. Change stage to "Live on Website"

**Expected:**
- [ ] A5 email sent via Resend to agent (triggered by webhook handler)
- [ ] Slack notification in `#general`

---

### WF4a: Lender Onboarding Created

**Trigger:** Record added to Lender Onboarding pipeline

#### 4a: Submit get-listed-lenders form
1. Go to `/get-listed` lenders form
2. Fill out with test lender data:
   - Email: `harper+testlender2@gmail.com`
3. Submit

**Expected — Records:**
- [ ] Lender record created in Attio
- [ ] Lender added to Lender Onboarding pipeline (stage: "New Application")
- [ ] **People record** exists for `harper+testlender2@gmail.com` with `person_type` = `[Lender]`
- [ ] Lender record's `person` field links to this People record

**Expected — Automation:**
- [ ] L2 email sent via Resend to lender
- [ ] Attio note logged on lender record: "Email sent: L2"
- [ ] Slack notification in `#general`

---

### WF4b: Lender Onboarding Stage Changed

**Trigger:** List entry updated on Lender Onboarding

#### 4b: Move to next stage (test sequence exit)
1. In Attio UI, change test lender's onboarding stage past "New Application"

**Expected:**
- [ ] No immediate email sent (follow-up emails handled by daily cron)

#### 4c: Move to "Contract Sent"
1. Change stage to "Contract Sent"

**Expected:**
- [ ] L4 email sent via Resend to lender (triggered by webhook handler)

#### 4d: Move to "Live on Website"
1. Change stage to "Live on Website"

**Expected:**
- [ ] L5 email sent via Resend to lender (triggered by webhook handler)
- [ ] Slack notification in `#general`

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

**Expected — Records:**
- [ ] Intern record created in Attio
- [ ] Intern added to Intern Placements pipeline (stage: "New Application")
- [ ] **People record** exists for `harper+testintern@gmail.com` with `person_type` = `[Intern]`
- [ ] Intern record's `person` field links to this People record

**Expected — Automation:**
- [ ] I1 email sent via Resend to intern
- [ ] Attio note logged on intern record: "Email sent: I1"
- [ ] Slack notification in `#general`

---

### WF5b: Intern Placement Stage Changed

**Trigger:** List entry updated on Intern Placements

#### 5b: Move to "Under Review"
1. In Attio UI, change test intern's stage to "Under Review"

**Expected:**
- [ ] No immediate email sent (follow-up emails handled by daily cron)

---

### Bonus: Dual-Role person_type Accumulation

**Purpose:** Verify that a person with multiple roles accumulates all types on one People record.

#### 6a: Submit agent form then customer form with same email
1. Submit the get-listed-agents form with email `harper+testdual@gmail.com`
2. Then submit a contact-agent form with the **same email** `harper+testdual@gmail.com`

**Expected:**
- [ ] Single People record exists for `harper+testdual@gmail.com`
- [ ] `person_type` = `[Agent, Customer]` (both tags accumulated, not just the latest)
- [ ] Agent record's `person` field → same People record as Customer record's `person` field

---

## Verification Methods

### Check People record & person_type
1. Attio > People (built-in object)
2. Search by email address
3. Verify:
   - Record exists with correct name
   - `person_type` field shows expected tag(s) — e.g., `[Customer]` or `[Agent, Customer]`
   - The custom object record (Customer, Agent, etc.) has a `person` field linking to this People record

### Check Resend email delivery
1. Check Resend dashboard (resend.com/emails) for sent emails
2. Check your real inbox (e.g., `harper+testcustomer@gmail.com`)
3. Check spam/junk folder
4. Allow up to 1 minute for delivery
5. If no email: check `RESEND_API_KEY` in `.env.local` and server logs for errors

### Check Attio note logging
1. Open the relevant record in Attio
2. Check the record's timeline/activity tab
3. Verify note appears: "Email sent: {template label}"

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
| No emails sent | Resend API key missing or invalid | Check `RESEND_API_KEY` in `.env.local` |
| Email sends but not received | Domain not verified in Resend | Verify SPF/DKIM/DMARC on veteranpcs.com in Resend dashboard |
| Email in spam folder | Domain reputation or content triggers | Check Resend dashboard for bounce/complaint metrics |
| No Attio note logged | `note:read-write` scope missing on API key | Check Attio API key permissions |
| Stage-change email not sent | Webhook not registered for list-entry events | Add list-entry.updated subscription in Attio webhook settings |
| Duplicate emails on stage change | `stage_email_sent` field not checked | Verify webhook handler checks field before sending |
| Agent/lender not on `/colorado` | Cache not refreshed | Wait 1 hour or restart dev server |
| Form submission error | API route issue | Check browser console and server logs |
| Slack not posting | Webhook URL incorrect | Check `SLACK_WEBHOOK_URL` in `.env.local` |
| SMS not sending | OpenPhone API issue | Check `OPENPHONE_API_KEY` and phone format |
| Cron job not running | CRON_SECRET not set | Set `CRON_SECRET` in Vercel project settings |

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
| Dual-role person_type | | | | |
