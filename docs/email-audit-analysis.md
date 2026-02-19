# VeteranPCS Email Automation Audit & Recommendations

**Analysis Date:** 2026-01-29
**Current State:** Salesforce Email Templates (122 files, 54 unique templates)
**Target State:** Attio Workflows + Slack Notifications

---

## Executive Summary

The current Salesforce email system has **significant duplication and complexity**:
- 54 unique email templates across 5 folders
- Many emails serve nearly identical purposes with arbitrary differences
- Admin notification emails that would be better as Slack alerts
- Inconsistent naming and organization makes maintenance difficult

**Recommended Consolidation:** From 54 templates → **18 core templates** + **8 Slack notifications**

---

## Part 1: Identified Duplication & Friction Points

### 1.1 Duplicate Emails (Same Purpose, Different Folders)

| Email Purpose | Duplicates Found | Recommendation |
|--------------|------------------|----------------|
| **1-Week Reminder** | 4 copies: `W2L Agent:Lender:Intern Reminder 1 Week Alert` in agent-alert, intern-alert, lead-alerts, lender-alerts | **CONSOLIDATE** to 1 template with dynamic content |
| **Welcome to Agent** | 2 copies: `Welcome to new AGENT Lead` (agent-alert) + `Email Alert Welcome to new AGENT Lead` (lead-alerts) | **CONSOLIDATE** to 1 |
| **Welcome to Lender** | 2 copies: `Welcome Alert to Lender` in lead-alerts + lender-alerts | **CONSOLIDATE** to 1 |
| **Welcome to Intern** | 2 copies: `Welcome Alert to Intern` in intern-alert + lead-alerts | **CONSOLIDATE** to 1 |
| **New Agent Lead to Admin** | 2 copies: `New AGENT Lead alert to ISA-Admin` in agent-alert + lead-alerts | **CONSOLIDATE** to 1 |
| **No Contract 2nd Reminder** | 2 copies: in agent-alert + lender-alerts | **CONSOLIDATE** to 1 |
| **Customer Without Agent** | 2 copies: in agent-alert + lead-alerts | **CONSOLIDATE** to 1 |

**Total Duplicates Identified: 14 emails → 7 consolidated**

### 1.2 Arbitrarily Different Emails (Same Concept, Different Wording)

| Scenario | Current Emails | Issue |
|----------|---------------|-------|
| **Agent Reminders** | `Agent-reminder-1-week`, `Agent:Lender Reminder #2`, `agent-no-contact-reminder-1` | All are "please respond" reminders with different tones |
| **Lender Reminders** | `No App. 1 Week Reminder. Lender`, `No App. 2nd Reminder. Agent:Lender`, `No Contract. 1st Reminder. Lender`, `No Contract. 2nd Reminder. Agent:Lender` | 4 separate templates for "we haven't heard from you" |
| **Customer Confirmation** | `New Lead Alert to Customer w Assigned Agent`, `New Lead Alert to Customer WITHOUT agent`, `Web-to-Lead response to Assigned Customer` | Should be 1 template with conditional content |

### 1.3 Admin Emails → Should Be Slack

| Current Email | Purpose | Slack Benefit |
|--------------|---------|---------------|
| `New AGENT Lead alert to ISA-Admin` | New agent signup | Real-time notification, interactive buttons |
| `New Lead Alert Unassigned Customer` | Unassigned lead | Immediate action, can include "Assign" button |
| `New Agent:Lender Form Created Alert` | Form submitted | Immediate notification |
| `New Closing Disclosure Form Created Alert` | Compliance | Audit trail in Slack channel |
| `New Closing Info Form Created Alert` | Ops tracking | Workflow visibility |
| `Lender Opp Ready for Invoicing Alert` | Finance ops | Channel for billing team |
| `Lender Opp Ready for Upload Alert` | Ops tracking | Channel for upload queue |

**Total: 7 admin emails → Slack notifications**

---

## Part 2: Email Sequence Mapping by Event

### Event 1: Customer Submits Contact Form / Unassigned Lead

**Important Context:** When a customer submits a form without selecting a specific agent or lender, they also do NOT select a state or area. This means:
- These leads cannot be auto-routed by geography
- They go directly to Beth (primary admin) for manual handling
- Beth personally reaches out to understand the customer's needs and location

**Current Flow (4 emails):**
1. `New Lead Alert Unassigned Customer` → Admin
2. `New Lead Alert to Customer WITHOUT agent` → Customer
3. (Later) `W2L Agent:Lender:Intern Reminder 1 Week Alert` → (not applicable)
4. `Welcome Video Alert to Customer` → Customer (drip)

**Recommended Flow (1 email + 1 Slack):**
1. **SLACK** → `#leads-unassigned` - "New contact form from: [Name] - [Email] - [Phone]" (Beth monitors this channel)
2. **EMAIL → Customer** - "Thank you for contacting VeteranPCS" (confirms receipt, sets expectation that Beth will reach out personally)

**Note:** No area-based auto-routing exists for unassigned leads. Beth handles all manual assignment after personal conversation with the customer.

---

### Event 2: Customer Submits Form to Specific Agent

**Current Flow (3 emails):**
1. `New Lead Alert to Customer w Assigned Agent` → Customer
2. `New Lead Alert to assigned Agent` → Agent
3. (No admin notification in current flow?)

**Recommended Flow (2 emails + 1 Slack):**
1. **EMAIL → Customer** - "Your VeteranPCS Agent: [Agent Name]" (immediate)
2. **EMAIL → Agent** - "New Lead from VeteranPCS" (immediate)
3. **SLACK** → `#new-leads` - "New lead for [Agent Name]: [Customer Name]"

---

### Event 3: Customer Submits Form to Specific Lender

**Current Flow (3+ emails):**
1. `New Lead Alert to Customer w Assigned Lender` → Customer
2. `New Lead Alert to Lender` → Lender
3. (No explicit admin notification)

**Recommended Flow (2 emails + 1 Slack):**
1. **EMAIL → Customer** - "Your VeteranPCS Lender: [Lender Name]" (immediate)
2. **EMAIL → Lender** - "New Lead from VeteranPCS" (immediate)
3. **SLACK** → `#new-leads` - "New lender lead for [Lender Name]: [Customer Name]"

---

### Event 4: Agent Registers to Be Listed on Site

**Current Flow (6+ emails):**
1. `Welcome to new AGENT Lead` → Agent (immediate)
2. `New AGENT Lead alert to ISA-Admin` → Admin
3. (7 days no response) `Agent-reminder-1-week` or `W2L Agent:Lender:Intern Reminder 1 Week Alert`
4. (14 days) `Agent:Lender Reminder #2`
5. (After interview) `41 to Agent-Referral Agreement-DocuSign-Coming`
6. (Contract not received) `agent-no-contact-reminder-1`
7. (2nd reminder) `No Contract. 2nd Reminder. Agent:Lender`
8. (Approved) `Closed-Won-Agent`
9. (Post-onboarding drip) `Social Media - Closed-Won Agent Email Drip #1`
10. (Drip #2) `to agents Blog Posts`
11. (Drip #3) `to Agent- RE Featured Agent`
12. (Drip #4) `to Agent- RE Get New Clients`

**Issues:**
- Too many reminder variants
- Post-onboarding drip emails may be outdated
- Admin notification should be Slack

**Recommended Flow (4 emails + 1 Slack):**
1. **EMAIL → Agent** - "Welcome to VeteranPCS" (immediate)
2. **SLACK** → `#agent-applications` - "New agent application: [Name] - [State]"
3. (7 days no response) **EMAIL → Agent** - "Following up on your VeteranPCS application"
4. (Contract sent) **EMAIL → Agent** - "Your VeteranPCS Agreement is Ready to Sign"
5. (Approved/Closed-Won) **EMAIL → Agent** - "Welcome to the VeteranPCS Network!"

**Post-onboarding drip emails (optional, separate marketing sequence):**
- Consider moving to a marketing automation tool or keeping as manual outreach

---

### Event 5: Lender Registers to Be Listed on Site

**Current Flow (7+ emails):**
1. `Welcome Alert to Lender` → Lender (immediate)
2. (Admin notification - none found, should exist)
3. (7 days) `No App. 1 Week Reminder. Lender`
4. (14 days) `No App. 2nd Reminder. Agent:Lender`
5. (Contract sent) `No Contract. 1st Reminder. Lender`
6. (Contract reminder) `No Contract. 2nd Reminder. Agent:Lender`
7. (Approved) `Closed-Won Congrats to Lender`

**Recommended Flow (4 emails + 1 Slack):**
1. **EMAIL → Lender** - "Welcome to VeteranPCS" (immediate)
2. **SLACK** → `#lender-applications` - "New lender application: [Name] - [States]"
3. (7 days no response) **EMAIL → Lender** - "Following up on your VeteranPCS application"
4. (Contract sent) **EMAIL → Lender** - "Your VeteranPCS Agreement is Ready to Sign"
5. (Approved/Closed-Won) **EMAIL → Lender** - "Welcome to the VeteranPCS Network!"

---

## Part 3: Complete Email Consolidation Plan

### Customer-Facing Emails (5 templates)

| # | Email Name | Trigger | Recipients |
|---|-----------|---------|------------|
| C1 | **Customer Lead Confirmation with Agent** | New lead + agent assigned | Customer |
| C2 | **Customer Lead Confirmation with Lender** | New lead + lender assigned | Customer |
| C3 | **Customer Under Contract Congratulations** | Deal moves to Under Contract | Customer |
| C4 | **Customer Transaction Closed** | Deal closes successfully | Customer |
| C5 | **Welcome Video / About VeteranPCS** | 24h after lead (optional nurture) | Customer |

### Agent-Facing Emails (5 templates)

| # | Email Name | Trigger | Recipients |
|---|-----------|---------|------------|
| A1 | **New Lead Alert to Agent** | New lead assigned | Agent |
| A2 | **Agent Application Welcome** | New agent registration | Agent |
| A3 | **Agent Application Follow-Up** | 7 days no response | Agent |
| A4 | **Agent Contract Ready** | Contract sent for signature | Agent |
| A5 | **Agent Onboarding Complete** | Agent approved/Closed-Won | Agent |

### Lender-Facing Emails (5 templates)

| # | Email Name | Trigger | Recipients |
|---|-----------|---------|------------|
| L1 | **New Lead Alert to Lender** | New lead assigned | Lender |
| L2 | **Lender Application Welcome** | New lender registration | Lender |
| L3 | **Lender Application Follow-Up** | 7 days no response | Lender |
| L4 | **Lender Contract Ready** | Contract sent for signature | Lender |
| L5 | **Lender Onboarding Complete** | Lender approved/Closed-Won | Lender |

### Intern-Facing Emails (2 templates)

| # | Email Name | Trigger | Recipients |
|---|-----------|---------|------------|
| I1 | **Intern Application Welcome** | New intern application | Intern |
| I2 | **Intern Application Follow-Up** | 7 days no response | Intern |

### Referral Emails (1 template)

| # | Email Name | Trigger | Recipients |
|---|-----------|---------|------------|
| R1 | **Agent Referral Thank You** | Referral submitted | Referrer |

**Total: 18 email templates** (down from 54)

---

## Part 4: Slack Notification Plan

### Slack Channels to Create

| Channel | Purpose | Notifications |
|---------|---------|---------------|
| `#new-leads` | All new customer leads | New lead alerts with routing info |
| `#agent-applications` | Agent onboarding pipeline | New applications, stage changes |
| `#lender-applications` | Lender onboarding pipeline | New applications, stage changes |
| `#intern-applications` | Intern placement pipeline | New applications, stage changes |
| `#deals` | Active deal tracking | Under contract, closed won/lost |
| `#billing` | Finance operations | Invoicing alerts, payment reminders |

### Slack Notifications (Replace Admin Emails)

| # | Notification | Channel | Trigger | Content |
|---|-------------|---------|---------|---------|
| S1 | New Customer Lead | `#new-leads` | Customer form submission | Lead name, state, assigned agent/lender, link to Attio |
| S2 | Unassigned Lead Alert | `#new-leads` | Lead without assignment | Lead details + "Assign" action |
| S3 | New Agent Application | `#agent-applications` | Agent registration | Name, state, contact info, link to Attio |
| S4 | New Lender Application | `#lender-applications` | Lender registration | Name, states, contact info, link to Attio |
| S5 | New Intern Application | `#intern-applications` | Intern application | Name, desired location, link to Attio |
| S6 | Deal Under Contract | `#deals` | Deal stage change | Customer, agent, expected close date |
| S7 | Deal Closed | `#deals` | Deal closes | Customer, agent, outcome (won/lost) |
| S8 | Invoice Ready | `#billing` | Deal ready for invoicing | Deal details, amount, link to record |

---

## Part 5: Attio Workflow Configuration

### Recommended Attio Workflows

#### Workflow 1: New Customer Lead
**Trigger:** Record created in Customers object
**Actions:**
1. IF agent assigned → Send C1 email to customer, A1 email to agent
2. IF lender assigned → Send C2 email to customer, L1 email to lender
3. IF neither assigned → Slack S2 to #new-leads
4. Always → Slack S1 to #new-leads

#### Workflow 2: Agent Onboarding
**Trigger:** Record created in Agent Onboarding pipeline
**Actions:**
1. Send A2 email to agent
2. Slack S3 to #agent-applications
3. Wait 7 days → IF no response → Send A3 email
4. ON stage = "Contract Sent" → Send A4 email
5. ON stage = "Closed Won" → Send A5 email

#### Workflow 3: Lender Onboarding
**Trigger:** Record created in Lender Onboarding pipeline
**Actions:**
1. Send L2 email to lender
2. Slack S4 to #lender-applications
3. Wait 7 days → IF no response → Send L3 email
4. ON stage = "Contract Sent" → Send L4 email
5. ON stage = "Closed Won" → Send L5 email

#### Workflow 4: Intern Placement
**Trigger:** Record created in Intern Placements pipeline
**Actions:**
1. Send I1 email to intern
2. Slack S5 to #intern-applications
3. Wait 7 days → IF no response → Send I2 email

#### Workflow 5: Customer Deal Lifecycle
**Trigger:** Stage change in Customer Deal pipeline
**Actions:**
1. ON "Under Contract" → Send C3 to customer, Slack S6 to #deals
2. ON "Closed Won" → Send C4 to customer, Slack S7 to #deals
3. ON "Closed Lost" → Slack S7 to #deals (no customer email)

---

## Part 6: Migration Checklist

### Phase 1: Email Template Creation (in Attio or Email Provider)
- [ ] Create 18 consolidated email templates
- [ ] Design responsive HTML templates
- [ ] Set up merge field mappings from Attio attributes
- [ ] Test email rendering

### Phase 2: Slack Integration
- [ ] Create 6 Slack channels
- [ ] Configure Attio → Slack webhook
- [ ] Test S1-S8 notifications
- [ ] Set up channel permissions

### Phase 3: Attio Workflow Configuration
- [ ] Build Workflow 1: New Customer Lead
- [ ] Build Workflow 2: Agent Onboarding
- [ ] Build Workflow 3: Lender Onboarding
- [ ] Build Workflow 4: Intern Placement
- [ ] Build Workflow 5: Customer Deal Lifecycle
- [ ] Test each workflow with sample data

### Phase 4: Decommission Salesforce Emails
- [ ] Disable Salesforce email alerts
- [ ] Monitor for any missed triggers
- [ ] Archive Salesforce email templates

---

## Part 7: Emails Recommended for Removal

These emails should be **deprecated** and not migrated:

| Email | Reason for Removal |
|-------|-------------------|
| `to Agent- RE Featured Agent` | Marketing drip - move to dedicated marketing tool or manual |
| `to Agent- RE Get New Clients` | Marketing drip - move to dedicated marketing tool or manual |
| `to agents Blog Posts` | Marketing drip - move to dedicated marketing tool or manual |
| `Social Media - Closed-Won Agent Email Drip #1` | Marketing drip - move to dedicated marketing tool or manual |
| `57. Auto Email Alert to Customer RE Squared Away` | Third-party promotion - consider if still relevant |
| `Customer Opp TXN Closed Alert to Agent REMINDER` | Daily reminders → replace with single Slack channel alert |
| `Customer Opp Under Contract Alert to Agent REMINDER` | Daily reminders → consolidate with workflow timing |
| `Invoice Reminder Alert to Lender` | Finance ops → move to Slack #billing with manual follow-up |
| `Customer Opp - Transaction Closed to Client (No agent; Lender only)` | Edge case - consolidate into C4 with conditional content |
| `Converted Agent. TO Agent` | Redundant with A4 contract email |
| `Converted Lender. TO Lender` | Redundant with L4 contract email |
| `Converted Agent-Intern. Welcome to Intern` | Edge case - handle manually |
| `Converted Customer with Lender Alert (to Customer)` | Covered by C2 |
| `Converted Customer with Lender Alert (to Lender)` | Covered by L1 |

**Total Removed: 14 emails**

---

## Summary

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Email Templates | 54 | 18 | 67% |
| Admin Email Notifications | 8 | 0 | 100% → Slack |
| Slack Notifications | 0 | 8 | (new) |
| Duplicate Templates | 14 | 0 | 100% |

### Key Benefits
1. **Simpler maintenance** - 18 templates vs 54
2. **Real-time admin awareness** - Slack instead of email inbox
3. **Consistent customer experience** - No duplicate/confusing emails
4. **Better tracking** - Attio native workflows with full audit trail
5. **Scalable** - Easy to add new triggers without email sprawl

---

## Appendix: Attio-Slack Integration

You're correct that Attio has native Slack integration capabilities. Here's how to set it up:

### Option 1: Attio Native Slack Integration
- Attio offers built-in Slack notifications for workflow triggers
- Configure in Attio Settings → Integrations → Slack
- Supports channel posting and direct messages

### Option 2: Webhook-Based Integration
- Create Slack Incoming Webhooks for each channel
- Configure Attio workflows to POST to webhook URLs
- More flexible for custom message formatting

### Recommended Approach
Use **Attio's native Slack integration** where possible for standard notifications, and **webhook-based** for complex message formatting (like including action buttons).

The first-class integration means you can:
- Click Attio record links directly in Slack
- Use Slack buttons to trigger Attio actions
- See real-time updates without checking email
