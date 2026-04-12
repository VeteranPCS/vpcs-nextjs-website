# End-to-End Test Plan — Hybrid Email Architecture (Resend + Attio)

**Date:** 2026-03-16
**Branch:** attio-migration
**Purpose:** Verify all form submissions, email delivery via Resend, webhook-triggered stage-change emails, cron job automation, and agent portal functionality.

**Architecture:** Emails are sent by application code via Resend. Attio handles CRM data, pipelines, and Slack notifications. React Email templates provide typed, personalized emails with full cross-entity data access.

---

## Prerequisites

### A. Environment Setup

- [x] **Resend API key** configured in `.env.local` (`RESEND_API_KEY`)
- [x] **Domain verified** in Resend (`veteranpcs.com` — SPF, DKIM, DMARC)
- [x] **`@react-email/render`** installed (required peer dependency for Resend)
- [x] **Attio webhook** registered for `record.created`, `record.updated`, `record.deleted`, `list-entry.created`, `list-entry.updated`
- [x] **`stage_email_sent`** text attribute created on `customer_deals`, `agent_onboarding`, `lender_onboarding` lists
- [x] **ngrok static domain** configured: `nonlevel-domenic-unorchestrated.ngrok-free.dev`
- [x] **`MAGIC_LINK_BASE_URL`** set in `.env.local` (ngrok URL for dev, veteranpcs.com for prod)
- [x] **`NEXT_PUBLIC_API_BASE_URL`** set to `http://127.0.0.1:3000` (localhost for form redirects)

### B. Attio Workflow Status

- [x] All 8 workflows are Live in Attio UI
- [x] Sequence enrollment/exit blocks removed from all workflows
- [x] All sequences deleted
- [x] Four People denormalization attributes archived (`assigned_buying_agent`, `assigned_selling_agent`, `assigned_lender`, `brokerage_name`)
- [x] Workflows now Slack-only

### C. Test Environment

- [ ] **Dev server running**: `npm run dev` in Terminal 1
- [ ] **ngrok tunnel running**: `npm run dev:tunnel` in Terminal 2
- [ ] **Test records exist**: Run `npx tsx scripts/test-setup.ts` if needed
  - Test Agent ID: `ffdd39c6-9cb5-4e63-a41f-189c23562f2e` (Harper Foley TEST AGENT, Colorado)
  - Test Lender ID: `b53482ba-a5ca-4ff6-9fba-4c62b3d98d94` (Harper Foley TEST LENDER, Colorado)
- [ ] **Verify test records**: Visit `http://127.0.0.1:3000/colorado` and confirm test agent/lender appear

### D. Test Data

| Field | Value |
|-------|-------|
| Test customer email | `harper.e.foley+testcustomer@gmail.com` |
| Test customer phone | `4252246148` (normalizes to `+14252246148`) |
| Test agent email | `harper.e.foley+testagent@gmail.com` |
| Test lender email | `harper.e.foley+testlender@gmail.com` |
| Agent form URL | `http://127.0.0.1:3000/contact-agent?form=agent&fn=Harper&id=ffdd39c6-9cb5-4e63-a41f-189c23562f2e&state=colorado` |
| Lender form URL | `http://127.0.0.1:3000/contact-lender?form=lender&fn=Harper&id=b53482ba-a5ca-4ff6-9fba-4c62b3d98d94&state=colorado` |

**Important:** Phone numbers must be real (not 555 numbers). Attio rejects fake phone numbers on People records.

---

## Test 1: Contact Agent Form → C2 + A1 Emails

**Form:** `/contact-agent` with test agent selected
**Emails sent by:** Form handler code (`services/salesForcePostFormsService.tsx`)

### Steps
1. Navigate to Agent form URL (see Test Data above)
2. Fill out form: First=Test, Last=Customer, Email=test customer email, Phone=4252246148, Current Base=Fort Hood, Destination=Colorado Springs, How=Google, Comments=E2E test
3. Solve reCAPTCHA
4. Click Submit
5. Verify redirect to `http://127.0.0.1:3000/thank-you`

### Verify — Attio Records
- [ ] Customer record created with correct fields
- [ ] Customer Deal created in pipeline (stage: "New Lead", deal_type: "Buying")
- [ ] Customer `buying_agent` field links to test agent
- [ ] People record created/updated for customer email with `person_type` = `[Customer]`

### Verify — Emails (check all three locations)
- [ ] **Resend dashboard** (resend.com/emails): C2 email sent to customer, A1 email sent to agent
- [ ] **Gmail inbox** at `harper.e.foley+testcustomer@gmail.com`: C2 welcome email with agent name, phone, brokerage
- [ ] **Gmail inbox** at `harper.e.foley+testagent@gmail.com`: A1 lead alert with customer name, phone, email, destination, deal type, magic link
- [ ] **Server logs**: "C2 email sent" and "A1 email sent" messages

### Verify — Attio Notes
- [ ] Customer record timeline shows note: "Email sent: C2: Customer Welcome with Agent"
- [ ] Agent record timeline shows note: "Email sent: A1: Lead Alert"

### Verify — SMS
- [ ] SMS received on agent's phone with magic link URL using ngrok domain

### Verify — Slack
- [ ] Notification posted to `#general` channel

---

## Test 2: Agent Portal (Magic Link Confirmation)

**Page:** `/portal?token=<from SMS>`
**API:** `GET /api/magic-link/validate` + `POST /api/magic-link/update`

### Steps
1. Copy the magic link URL from the SMS (or from server logs)
2. Open in browser at localhost (replace ngrok domain with `127.0.0.1:3000` for local testing)
3. Verify deal summary displays correctly
4. Click "Confirm — I'll reach out to this customer"
5. Verify success screen appears

### Verify — Portal UI
- [ ] "New Lead" heading visible below nav bar
- [ ] Customer name, phone (clickable tel: link), email (clickable mailto: link) displayed
- [ ] Lead details: Type, Stage, Notes, Submitted date displayed
- [ ] Red confirm button visible and distinct from navy section headers
- [ ] After confirm: green checkmark, "Contact Confirmed!" message, Call + Email buttons

### Verify — Attio
- [ ] Deal's `contact_confirmed` field is `true` (blue checkmark in Attio)

### Verify — Revisit
- [ ] Visiting the same portal link again shows "Already Confirmed" instead of confirm button

---

## Test 3: Contact Lender Form → C3 + L1 Emails

**Form:** `/contact-lender` with test lender selected
**Emails sent by:** Form handler code

### Steps
1. Navigate to Lender form URL
2. Fill out form with different test customer email (e.g., `harper.e.foley+testcustomer2@gmail.com`)
3. Solve reCAPTCHA, submit

### Verify
- [ ] Customer record created, deal created (deal_type: "Lender")
- [ ] **Resend**: C3 email sent to customer with lender name, company, NMLS#
- [ ] **Resend**: L1 lead alert sent to lender with customer details + magic link
- [ ] **Attio notes**: C3 on customer, L1 on lender
- [ ] **SMS**: Sent to lender's phone

---

## Test 4: General Contact Form → C1 Email

**Form:** `/contact`
**Emails sent by:** Form handler code

### Steps
1. Navigate to `http://127.0.0.1:3000/contact`
2. Fill out form with test data (no agent/lender selection)
3. Submit

### Verify
- [ ] Customer record created
- [ ] **Resend**: C1 unassigned welcome email sent to customer
- [ ] **Attio note**: C1 on customer record
- [ ] **Slack**: Notification posted

---

## Test 5: Agent Onboarding Form → A2 Email

**Form:** `/get-listed-agents`
**Emails sent by:** Form handler code

### Steps
1. Navigate to `http://127.0.0.1:3000/get-listed-agents`
2. Fill out form with test data (email: `harper.e.foley+testagent2@gmail.com`)
3. Submit

### Verify
- [ ] Agent record created in Attio
- [ ] Agent added to Agent Onboarding pipeline (stage: "New Application")
- [ ] People record created with `person_type` = `[Agent]`
- [ ] **Resend**: A2 onboarding welcome email sent
- [ ] **Attio note**: A2 on agent record
- [ ] **Slack**: "New Agent Application" notification

---

## Test 6: Lender Onboarding Form → L2 Email

**Form:** `/get-listed-lenders`
**Emails sent by:** Form handler code

### Steps
1. Navigate to `http://127.0.0.1:3000/get-listed-lenders`
2. Fill out form with test data (email: `harper.e.foley+testlender2@gmail.com`)
3. Submit

### Verify
- [ ] Lender record created, added to Lender Onboarding pipeline
- [ ] **Resend**: L2 onboarding welcome email sent
- [ ] **Attio note**: L2 on lender record
- [ ] **Slack**: "New Lender Application" notification

---

## Test 7: Internship Form → I1 Email

**Form:** `/internship`
**Emails sent by:** Form handler code

### Steps
1. Navigate to `http://127.0.0.1:3000/internship`
2. Fill out form with test data (email: `harper.e.foley+testintern@gmail.com`)
3. Submit

### Verify
- [ ] Intern record created with all form fields
- [ ] Intern added to Intern Placements pipeline (stage: "New Application")
- [ ] People record created with `person_type` = `[Intern]`
- [ ] **Resend**: I1 onboarding welcome email with internship type, desired location, start date
- [ ] **Attio note**: I1 on intern record
- [ ] **Slack**: "New Intern Application" notification

---

## Test 8: Stage-Change Webhook → C4 Email (Under Contract)

**Trigger:** Move customer deal to "Under Contract" in Attio UI
**Emails sent by:** Webhook handler (`app/api/webhooks/attio/route.ts`)

### Steps
1. In Attio UI, find the test customer's deal (from Test 1)
2. Change stage to "Under Contract"
3. Wait for webhook to fire (check server logs for `[attio-webhook]` messages)

### Verify
- [ ] **Server logs**: Webhook received, list-entry event processed
- [ ] **Resend**: C4 "Under Contract" email sent to customer with agent name
- [ ] **Attio**: `stage_email_sent` field on deal contains "Under Contract"
- [ ] **Slack**: Deal stage change notification
- [ ] **Duplicate prevention**: Moving to "Under Contract" again should NOT send another C4

---

## Test 9: Stage-Change Webhook → C5 Email (Paid Complete + Bonus)

**Trigger:** Move customer deal to "Paid Complete" in Attio UI
**Emails sent by:** Webhook handler

### Steps
1. First, set `sale_price` on the deal (e.g., $350,000) in Attio UI
2. Change stage to "Paid Complete"

### Verify
- [ ] **Resend**: C5 "Transaction Closed" email sent with correct bonus amounts ($1,000 bonus, $100 charity for $350K)
- [ ] **Attio**: `stage_email_sent` field contains "Under Contract,Paid Complete"
- [ ] **Slack**: Deal closed notification

---

## Test 10: Stage-Change Webhook → A4/A5 Emails (Agent Onboarding)

**Trigger:** Move agent onboarding entry through stages in Attio UI
**Emails sent by:** Webhook handler

### Steps
1. Find the test agent's onboarding entry (from Test 5)
2. Move to "Contract Sent" → verify A4 email
3. Move to "Live on Website" → verify A5 email

### Verify
- [ ] **Resend**: A4 "Contract Ready" email sent to agent
- [ ] **Resend**: A5 "Live on Website" email sent to agent
- [ ] **Attio**: `stage_email_sent` tracks both stages

---

## Test 11: Stage-Change Webhook → L4/L5 Emails (Lender Onboarding)

**Trigger:** Move lender onboarding entry through stages in Attio UI
**Emails sent by:** Webhook handler

### Steps
1. Find the test lender's onboarding entry (from Test 6)
2. Move to "Contract Sent" → verify L4 email
3. Move to "Live on Website" → verify L5 email

### Verify
- [ ] **Resend**: L4 and L5 emails sent to lender
- [ ] **Attio**: `stage_email_sent` tracks both stages

---

## Test 12: Cron — Follow-Up Drip Emails

**Endpoint:** `GET /api/cron/follow-up-emails`
**Emails sent by:** Cron handler

### Steps
1. Create a test agent onboarding entry dated 7+ days ago (via Attio API or UI)
2. Ensure it's still in "New Application" stage
3. Hit `http://127.0.0.1:3000/api/cron/follow-up-emails` directly in browser (will fail auth without CRON_SECRET — use curl with header instead):
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/follow-up-emails
   ```

### Verify
- [ ] **Server logs**: Cron processed entries, sent follow-up emails
- [ ] **Resend**: A3 follow-up email sent to agent (or L3/I2 for lender/intern)
- [ ] **JSON response**: Processing stats returned

---

## Test 13: Cron — Stale Lead Re-routing

**Endpoint:** `GET /api/cron/stale-leads`
**Emails sent by:** Cron handler

### Steps
1. Create a test deal with `contact_confirmed = false` and `created_at` > 12 hours ago
2. Hit the endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron/stale-leads
   ```

### Verify
- [ ] Deal's `agent` field updated to next-highest AA_Score agent in area
- [ ] `reroute_count` incremented to 1
- [ ] **Resend**: A1 lead alert sent to new agent
- [ ] **SMS**: Sent to new agent
- [ ] **Slack**: Re-routing notification (if no agent available)

---

## Test 14: Dual-Role person_type Accumulation

### Steps
1. Submit get-listed-agents form with email `harper.e.foley+testdual@gmail.com`
2. Then submit contact-agent form with the **same email**

### Verify
- [ ] Single People record exists for that email
- [ ] `person_type` = `[Agent, Customer]` (both accumulated)

---

## Verification Quick Reference

| What to Check | Where to Check |
|---------------|----------------|
| Email sent | Resend dashboard (resend.com/emails) |
| Email received | Gmail inbox (check spam) |
| Email content correct | Open email, verify personalization (names, phone, brokerage, bonus amounts) |
| Attio record created | Attio UI → search by name or email |
| Attio note logged | Attio record → timeline/activity tab |
| Deal fields correct | Attio → Customer Deals pipeline → open entry |
| `contact_confirmed` set | Attio → deal entry → contact_confirmed checkbox |
| `stage_email_sent` set | Attio → deal/onboarding entry → stage_email_sent text field |
| Slack notification | `#general` channel in Slack |
| SMS delivered | Check phone, or OpenPhone dashboard |
| Server logs | Dev server terminal (`npm run dev`) |
| Webhook received | Server logs — look for `[attio-webhook]` prefix |

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No emails sent (no Resend log) | Static imports failed or `sendEmail` not awaited | Check server logs for error details |
| `render is not a function` | `@react-email/render` not installed | `npm install @react-email/render` |
| Attio phone validation error | Fake phone number (555) | Use real phone format (e.g., `4252246148`) |
| Form 500 error, no detail in browser | Server-side error | Check dev server terminal for full stack trace |
| Email sends but not received | Domain not verified in Resend | Check Resend dashboard → Domains |
| Portal shows "Objects are not valid as React child" | Validate endpoint returning raw Attio objects | Ensure `/api/magic-link/validate` uses `getListEntry()` (parsed) |
| Portal hidden behind nav bar | Fixed nav overlapping content | Ensure `pt-24 md:pt-28` on portal main element |
| Thank-you page 404 on ngrok | `NEXT_PUBLIC_API_BASE_URL` pointing to ngrok | Set to `http://127.0.0.1:3000`, use `MAGIC_LINK_BASE_URL` for SMS links |
| Magic link 404 on phone | ngrok interstitial page | Tap "Visit Site" on ngrok free tier warning |
| Stage-change email not sent | Webhook not subscribed to list-entry events | Check Attio webhook subscription settings |
| Duplicate stage emails | `stage_email_sent` field not created on list | Run `npx tsx scripts/add-stage-email-sent.ts` |
| Cron 401 error | Missing CRON_SECRET | Pass `Authorization: Bearer <secret>` header |
| SMS shows localhost URL | `MAGIC_LINK_BASE_URL` not set | Set to ngrok URL in `.env.local` |

---

## Cleanup

When all tests are complete:

```bash
npx tsx scripts/test-teardown.ts
```

This removes all test records (agent, lender, area assignment, customer, deals, etc.) and deletes `scripts/test-ids.json`.

**Also clean up manually in Attio:**
- Delete any test customer records created during form submissions
- Delete any test People records created during testing
- Delete any test onboarding entries

---

## Sign-Off

| # | Test | Status | Date | Notes |
|---|------|--------|------|-------|
| 1 | Contact Agent → C2 + A1 | **PASS** | 2026-03-16 | Emails delivered, records created, SMS sent |
| 2 | Agent Portal confirm | **PASS** | 2026-03-16 | Deal summary renders, confirm sets contact_confirmed=true |
| 3 | Contact Lender → C3 + L1 | **PASS** | 2026-04-11 | Re-verified: C3+L1 emails delivered (Resend confirmed), SMS sent, Slack received, Attio record created |
| 4 | General Contact → C1 | **PASS** | 2026-04-03 | Inquiry pipeline entry created, C1 email sent, WF6 Slack to #leads-unassigned |
| 5 | Agent Onboarding → A2 | **PASS** | 2026-04-03 | Agent record created, onboarding pipeline entry, A2 email delivered, People record with person_type=[Agent] |
| 6 | Lender Onboarding → L2 | **PASS** | 2026-04-03 | Lender record created, onboarding pipeline entry, L2 email delivered, Slack notification, People record with person_type=[Lender] |
| 7 | Internship → I1 | **PASS** | 2026-04-03 | Intern record created, placement pipeline entry, I1 email delivered, People record with person_type=[Intern] |
| 8 | Webhook: Under Contract → C4 | **PASS** | 2026-04-03 | C4 Under Contract email delivered to customer |
| 9 | Webhook: Paid Complete → C5 | **PASS** | 2026-04-03 | C5 email with correct bonus amounts, currency parsing fixed |
| 10 | Webhook: Agent A4 + A5 | **PASS** | 2026-04-03 | A4 Contract Ready + A5 Live on Website emails sent, stage_email_sent tracks both |
| 11 | Webhook: Lender L4 + L5 | **PASS** | 2026-04-03 | L4 Contract Ready + L5 Live on Website emails sent, stage_email_sent tracks both |
| 12 | Cron: Follow-up drips | **PARTIAL** | 2026-04-03 | Endpoint runs, authenticates, returns stats. No aged records to trigger emails. |
| 13 | Cron: Stale lead re-routing | **PARTIAL** | 2026-04-03 | Endpoint runs, authenticates, compiles. No stale leads to re-route. |
| 14 | Dual-role person_type | | | |
