# VeteranPCS Attio Workflows

This document contains complete specifications for all Attio Workflows that power email automation and Slack notifications.

**Last Updated:** 2026-02-25 (reflects what was actually built in Attio)

---

## Architecture Note

**Email sending is handled by application code via Resend**, not by Attio workflows or sequences. Workflows are now Slack-only.

See `emails/templates/` for React Email templates and `services/salesForcePostFormsService.tsx` for email send integration.

---

## Architecture Overview

**Core Principle:** Workflows handle Slack notifications. Email sending is handled by application code (Resend).

- **Workflows** = Event-driven automation triggered by record/stage changes → Slack notifications
- **Emails** = Sent by application code via Resend (form handlers, webhook handler, cron jobs)

---

## Attio Platform Constraints (Confirmed)

These limitations were discovered during implementation and shaped the final architecture:

1. **No OR triggers** — A workflow can only have ONE trigger type. Cannot combine "Record added to list" and "List entry updated" in a single workflow. This is why the original 5 workflows became 8 (each onboarding pipeline needs separate Created and Stage Changed workflows).

2. **Two trigger types for pipelines:**
   - **"Record added to list"** — Fires when a new entry is created in a pipeline
   - **"List entry updated"** — Fires when an existing entry is modified (use with Stage attribute filter to only fire on stage changes)

3. **"Exit from sequence" block exists** — Confirmed available in the block picker (search "exit"). Allows workflows to remove people from active sequences.

4. **Nested IF/ELSE for multiple conditions** — Attio doesn't have switch/case. For checking multiple stage values, nest an IF/ELSE inside the "Is false" branch of another IF/ELSE.

5. **Grant access dialogs** — Appear when a workflow first references a new list or sequence. Must click "Yes" to grant access.

6. **Auto-generated descriptions** — Attio generates workflow descriptions automatically when you publish.

### Trigger → Sender/Recipient Mapping

Each trigger type determines the available variable paths:

| Trigger Type | Sender | Recipient |
|-------------|--------|-----------|
| Record added to list | **Added by** | **Created entry > Parent Record** |
| List entry updated | **Updated by** | **Updated entry > Parent Record** |

**Important:** For sequence enrollment, the recipient must be a **People** record. Use the `person` field on custom objects to traverse: `Parent Record > Person`.

---

## Workflow Summary (8 Total, All Live)

| # | Workflow | Trigger | Pipeline | Key Actions |
|---|----------|---------|----------|-------------|
| WF1 | New Customer Deal Created | Record added to list | `customer_deals` | Slack notification |
| WF2 | Customer Deal Stage Changed | List entry updated | `customer_deals` | Slack notification |
| WF3a | Agent Onboarding Created | Record added to list | `agent_onboarding` | Slack notification |
| WF3b | Agent Onboarding Stage Changed | List entry updated | `agent_onboarding` | Slack notification |
| WF4a | Lender Onboarding Created | Record added to list | `lender_onboarding` | Slack notification |
| WF4b | Lender Onboarding Stage Changed | List entry updated | `lender_onboarding` | Slack notification |
| WF5a | Intern Placement Created | Record added to list | `intern_placements` | Slack notification |
| WF5b | Intern Placement Stage Changed | List entry updated | `intern_placements` | (no action needed) |

### Slack Channel Note

All workflows currently post to **`#general`** — the only channel available in the VeteranPCS Slack workspace. The planned dedicated channels (`#new-leads`, `#deals`, `#agent-applications`, etc.) listed in the per-workflow specs below should be created when the team is ready, then the workflow Slack blocks updated.

---

## WF1: New Customer Deal Created

### Purpose
Route new customer leads to appropriate email sequences and Slack notifications based on agent/lender assignment.

### Trigger
- **Type:** Record added to list
- **List:** `customer_deals`
- **Recipient:** Created entry > Parent Record (customer)
- **Sender:** Added by

### Logic Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   TRIGGER: Deal Created                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │   Check Assignment    │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    Agent Set        Lender Set       Neither Set
         │                │                │
         ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │Enroll Cust. │  │Enroll Cust. │  │Enroll Cust. │
    │in "Customer │  │in "Customer │  │in "Customer │
    │Welcome -    │  │Welcome -    │  │Welcome -    │
    │Agent" seq   │  │Lender" seq  │  │Unassigned"  │
    └──────┬──────┘  └──────┬──────┘  │sequence     │
           │                │         └──────┬──────┘
           ▼                ▼                │
    ┌─────────────┐  ┌─────────────┐         │
    │Enroll Agent │  │Enroll Lender│         │
    │in "Agent    │  │in "Lender   │         │
    │Lead Alert"  │  │Lead Alert"  │         │
    │sequence     │  │sequence     │         │
    └──────┬──────┘  └──────┬──────┘         │
           │                │                │
           ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
    │Slack:       │  │Slack:       │  │Slack:        │
    │#general     │  │#general     │  │#general      │
    └─────────────┘  └─────────────┘  └──────────────┘
```

### Attio Configuration

**Step 1: Trigger**
1. Trigger: **Record added to list**
2. List: `customer_deals`

**Step 2: IF/ELSE — Check Agent Assignment**
1. Condition: `deal.agent` **is not empty**

**Step 3a: Is true — Agent Assigned**
1. **Enroll in sequence:** `Customer Welcome - Agent` (sends C2)
   - Recipient: Created entry > Parent Record > **Person** (People record)
   - Sender: Added by
2. **Enroll in sequence:** `Agent Lead Alert` (sends A1)
   - Recipient: Created entry > Parent Record > Agent > **Person** (People record)
   - Sender: Added by
3. **Slack:** Post to `#general`

**Step 3b: Is false — Nested IF/ELSE — Check Lender**
1. Condition: `deal.lender` **is not empty**

**Step 4a: Is true — Lender Assigned**
1. **Enroll in sequence:** `Customer Welcome - Lender` (sends C3)
   - Recipient: Created entry > Parent Record > **Person**
2. **Enroll in sequence:** `Lender Lead Alert` (sends L1)
   - Recipient: Created entry > Parent Record > Lender > **Person**
3. **Slack:** Post to `#general`

**Step 4b: Is false — Neither Assigned**
1. **Enroll in sequence:** `Customer Welcome - Unassigned` (sends C1)
   - Recipient: Created entry > Parent Record > **Person**
2. **Slack:** Post to `#general`

### Planned Slack Messages (for when dedicated channels exist)

**Assigned lead (`#new-leads`):**
```
:house: New Lead Assigned

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Email:* {{customer.email}}
*Phone:* {{customer.phone}}
*Destination:* {{deal.destination_city}}, {{deal.destination_state}}
*Type:* {{deal.deal_type}}

*Assigned Agent:* {{agent.first_name}} {{agent.last_name}}

<{{attio_record_url}}|View in Attio>
```

**Unassigned lead (`#leads-unassigned`):**
```
:warning: Unassigned Lead

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Email:* {{customer.email}}
*Phone:* {{customer.phone}}
*Destination:* {{deal.destination_city}}, {{deal.destination_state}}
*Type:* {{deal.deal_type}}

No agent or lender selected. Beth, please assign!

<{{attio_record_url}}|View in Attio>
```

---

## WF2: Customer Deal Stage Changed

### Purpose
Enroll customers in milestone sequences and send Slack notifications when deals progress.

### Trigger
- **Type:** List entry updated
- **List:** `customer_deals`
- **Attribute filter:** Stage
- **Recipient:** Updated entry > Parent Record (customer)
- **Sender:** Updated by

### Logic Flow

```
┌────────────────────────────────────────────────────────┐
│          TRIGGER: Customer Deal Stage Changed            │
└────────────────────────┬───────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
   "Under Contract"  "Paid Complete" "Closed Lost"  (Other)
         │               │               │               │
         ▼               ▼               ▼               │
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
   │Enroll in    │ │Enroll in    │ │(No sequence)│      │
   │"Customer    │ │"Customer    │ │             │      │
   │Under        │ │Closed"      │ │             │      │
   │Contract"    │ │sequence     │ │             │      │
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘      │
          │               │               │              │
          ▼               ▼               ▼              │
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
   │Slack:       │ │Slack:       │ │Slack:       │      │
   │#general     │ │#general     │ │#general     │      │
   └─────────────┘ └─────────────┘ └─────────────┘      │
```

### Attio Configuration

**Step 1: Trigger**
1. Trigger: **List entry updated**
2. List: `customer_deals`
3. Attribute filter: **Stage**

**Step 2: IF/ELSE — Under Contract**
1. Condition: **New value** is **Under Contract**

**Step 2a: Is true**
1. **Enroll in sequence:** `Customer Under Contract` (sends C4)
   - Recipient: Updated entry > Parent Record > **Person**
2. **Slack:** Post to `#general`

**Step 2b: Is false — Nested IF/ELSE — Paid Complete**
1. Condition: **New value** is **Paid Complete**

**Step 3a: Is true**
1. **Enroll in sequence:** `Customer Closed` (sends C5)
   - Recipient: Updated entry > Parent Record > **Person**
2. **Slack:** Post to `#general`

**Step 3b: Is false — Nested IF/ELSE — Closed Lost**
1. Condition: **New value** is **Closed Lost**

**Step 4a: Is true**
1. **Slack:** Post to `#general` (no sequence — no customer email for lost deals)

### Planned Slack Messages (for when dedicated channels exist)

**Under Contract (`#deals`):**
```
:memo: Deal Under Contract

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Agent:* {{agent.first_name}} {{agent.last_name}}
*Lender:* {{lender.first_name}} {{lender.last_name}}
*Expected Close:* {{deal.expected_close_date}}

<{{attio_record_url}}|View in Attio>
```

**Paid Complete (`#deals`):**
```
:tada: Deal Closed - WON!

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Agent:* {{agent.first_name}} {{agent.last_name}}
*Sale Price:* ${{deal.sale_price}}
*Move-In Bonus:* ${{deal.move_in_bonus}}
*Charity Donation:* ${{deal.charity_amount}}

Congratulations! :champagne:

<{{attio_record_url}}|View in Attio>
```

**Closed Lost (`#deals`):**
```
:x: Deal Closed - Lost

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Agent:* {{agent.first_name}} {{agent.last_name}}
*Reason:* {{deal.lost_reason}}

<{{attio_record_url}}|View in Attio>
```

---

## WF3a: Agent Onboarding Created

### Purpose
Welcome new agent applicants — enroll them in the onboarding sequence and send a Slack notification.

### Trigger
- **Type:** Record added to list
- **List:** `agent_onboarding`
- **Recipient:** Created entry > Parent Record (agent)
- **Sender:** Added by

### Actions (sequential)

1. **Enroll in sequence:** `Agent Onboarding` (sends A2 immediately, A3 after 7 days)
   - Recipient: Created entry > Parent Record > **Person** (People record)
   - Sender: Added by
2. **Slack:** Post `New Agent Application` to `#general`

### Planned Slack Message (for `#agent-applications`)
```
:house: New Agent Application

*Name:* {{agent.first_name}} {{agent.last_name}}
*Email:* {{agent.email}}
*Phone:* {{agent.phone}}
*Location:* {{agent.city}}, {{agent.state}}
*Brokerage:* {{agent.brokerage_name}}

<{{attio_record_url}}|View in Attio>
```

---

## WF3b: Agent Onboarding Stage Changed

### Purpose
Enroll agents in milestone sequences when their onboarding stage progresses to key stages.

### Trigger
- **Type:** List entry updated
- **List:** `agent_onboarding`
- **Attribute filter:** Stage
- **Recipient:** Updated entry > Parent Record (agent)
- **Sender:** Updated by

### What Was Built

```
┌─────────────────────────────────────────────────────────┐
│    TRIGGER: Agent Onboarding Stage Changed (any stage)   │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │ Exit from sequence: │
              │ "Agent Onboarding"  │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │ IF: Stage =         │
              │ "Contract Sent"     │
              └──────────┬──────────┘
                    ┌────┴────┐
                 True       False
                    │         │
                    ▼         ▼
         ┌──────────────┐  ┌──────────────────┐
         │ Enroll in    │  │ IF: Stage =      │
         │ "Agent       │  │ "Live on Website"│
         │ Contract     │  └────────┬─────────┘
         │ Ready" seq   │     ┌─────┴─────┐
         └──────────────┘   True        False
                              │           │
                              ▼           ▼
                   ┌──────────────┐   (nothing)
                   │ Enroll in    │
                   │ "Agent Live" │
                   │ sequence     │
                   ├──────────────┤
                   │ Slack:       │
                   │ #general     │
                   └──────────────┘
```

### Exit from Agent Onboarding ✅

The Exit block fires first on every stage change, removing the agent from the "Agent Onboarding" sequence before the IF/ELSE branching. This prevents the 7-day follow-up A3 from firing after the agent progresses past "New Application."

---

## WF4a: Lender Onboarding Created

### Purpose
Welcome new lender applicants — enroll them in the onboarding sequence and send a Slack notification.

### Trigger
- **Type:** Record added to list
- **List:** `lender_onboarding`
- **Recipient:** Created entry > Parent Record (lender)
- **Sender:** Added by

### Actions (sequential)

1. **Enroll in sequence:** `Lender Onboarding` (sends L2 immediately, L3 after 7 days)
   - Recipient: Created entry > Parent Record > **Person** (People record)
   - Sender: Added by
2. **Slack:** Post `New Lender Application` to `#general`

### Planned Slack Message (for `#lender-applications`)
```
:bank: New Lender Application

*Name:* {{lender.first_name}} {{lender.last_name}}
*Email:* {{lender.email}}
*Phone:* {{lender.phone}}
*Company:* {{lender.company_name}}
*NMLS:* {{lender.individual_nmls}}
*States:* {{lender.states}}

<{{attio_record_url}}|View in Attio>
```

---

## WF4b: Lender Onboarding Stage Changed

### Purpose
Enroll lenders in milestone sequences when their onboarding stage progresses to key stages.

### Trigger
- **Type:** List entry updated
- **List:** `lender_onboarding`
- **Attribute filter:** Stage
- **Recipient:** Updated entry > Parent Record (lender)
- **Sender:** Updated by

### What Was Built

```
┌─────────────────────────────────────────────────────────┐
│   TRIGGER: Lender Onboarding Stage Changed (any stage)   │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │ Exit from sequence: │
              │ "Lender Onboarding" │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │ IF: Stage =         │
              │ "Contract Sent"     │
              └──────────┬──────────┘
                    ┌────┴────┐
                 True       False
                    │         │
                    ▼         ▼
         ┌──────────────┐  ┌──────────────────┐
         │ Enroll in    │  │ IF: Stage =      │
         │ "Lender      │  │ "Live on Website"│
         │ Contract     │  └────────┬─────────┘
         │ Ready" seq   │     ┌─────┴─────┐
         └──────────────┘   True        False
                              │           │
                              ▼           ▼
                   ┌──────────────┐   (nothing)
                   │ Enroll in    │
                   │ "Lender Live"│
                   │ sequence     │
                   ├──────────────┤
                   │ Slack:       │
                   │ "Lender Live │
                   │ on Website"  │
                   │ to #general  │
                   └──────────────┘
```

### Exit from Lender Onboarding ✅

The Exit block fires first on every stage change, removing the lender from the "Lender Onboarding" sequence before the IF/ELSE branching. This prevents the 7-day follow-up L3 from firing after the lender progresses past "New Application."

---

## WF5a: Intern Placement Created

### Purpose
Welcome new intern applicants — enroll them in the onboarding sequence and send a Slack notification.

### Trigger
- **Type:** Record added to list
- **List:** `intern_placements`
- **Recipient:** Created entry > Parent Record (intern)
- **Sender:** Added by

### Actions (sequential)

1. **Enroll in sequence:** `Intern Onboarding` (sends I1 immediately, I2 after 7 days)
   - Recipient: Created entry > Parent Record > **Person** (People record)
   - Sender: Added by
2. **Slack:** Post `New Intern Application` to `#general`

### Planned Slack Message (for `#intern-applications`)
```
:mortar_board: New Intern Application

*Name:* {{intern.first_name}} {{intern.last_name}}
*Email:* {{intern.email}}
*Phone:* {{intern.phone}}
*Military Status:* {{intern.military_status}}
*Internship Type:* {{intern.internship_type}}
*Desired Location:* {{intern.desired_city}}, {{intern.desired_state}}
*Start Date:* {{intern.preferred_start_date}}

<{{attio_record_url}}|View in Attio>
```

---

## WF5b: Intern Placement Stage Changed

### Purpose
Exit interns from the onboarding sequence when their placement stage changes (preventing the 7-day follow-up from firing after progression).

### Trigger
- **Type:** List entry updated
- **List:** `intern_placements`
- **Attribute filter:** Stage
- **Recipient:** Updated entry > Parent Record (intern)
- **Sender:** Updated by

### What Was Built

```
┌─────────────────────────────────────────────────────────┐
│   TRIGGER: Intern Placement Stage Changed (any stage)    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Exit from sequence:  │
              │ "Intern Onboarding"  │
              └──────────────────────┘
```

This is the simplest workflow — any stage change exits the intern from the onboarding sequence. No branching needed since interns don't have Contract/Live milestone stages.

**Future Enhancement:** Add IF/ELSE branches to enroll in "Matched" or "Placement Complete" sequences if/when those are created.

---

## Slack Channel Summary

### Current State (all using `#general`)

| Workflow | Message |
|----------|---------|
| WF1 | New lead notifications |
| WF2 | Deal stage change notifications |
| WF3a | `New Agent Application` |
| WF3b | `Agent Live on Website` (only on Live stage) |
| WF4a | `New Lender Application` |
| WF4b | `Lender Live on Website` (only on Live stage) |
| WF5a | `New Intern Application` |
| WF5b | (no Slack message) |

### Planned Channels (create when ready)

| Channel | Workflows | Notification Type |
|---------|-----------|-------------------|
| `#new-leads` | WF1 | Assigned leads |
| `#leads-unassigned` | WF1 | Unassigned leads (Beth monitors) |
| `#agent-applications` | WF3a, WF3b | New apps, going live |
| `#lender-applications` | WF4a, WF4b | New apps, going live |
| `#intern-applications` | WF5a | New applications |
| `#deals` | WF2 | Under contract, won, lost |

---

## Sequence Reference

**All sequence enrollments target People records** via the `person` field on custom objects. Workflows traverse `Custom Record > Person` to enroll.

Workflows enroll/exit people from these sequences (see `attio-sequences.md` for full details):

| Sequence | Emails | Enrolled By | Exited By |
|----------|--------|-------------|-----------|
| Customer Welcome - Unassigned | C1 | WF1 | — |
| Customer Welcome - Agent | C2 | WF1 | — |
| Customer Welcome - Lender | C3 | WF1 | — |
| Customer Under Contract | C4 | WF2 | — |
| Customer Closed | C5 | WF2 | — |
| Agent Lead Alert | A1 | WF1 | — |
| Agent Onboarding | A2 → A3 | WF3a | WF3b ✅ |
| Agent Contract Ready | A4 | WF3b | — |
| Agent Live | A5 | WF3b | — |
| Lender Lead Alert | L1 | WF1 | — |
| Lender Onboarding | L2 → L3 | WF4a | WF4b ✅ |
| Lender Contract Ready | L4 | WF4b | — |
| Lender Live | L5 | WF4b | — |
| Intern Onboarding | I1 → I2 | WF5a | WF5b ✅ |

---

## Prerequisites

Before implementing workflows:

1. **Email sync required** - Gmail or Microsoft account must be synced in Attio for sequences to send emails
2. **Sender assignment** - Each sequence needs a designated sender with delegated sending enabled
3. **Create sequences first** - Workflows reference sequences, so create sequences before workflows
4. **Attio plan** - Confirm sequences and workflows are available on your Attio plan tier

---

## Testing Checklist

Before going live, test each workflow:

**WF1 — New Customer Deal Created:**
- [ ] Create deal with agent → verify customer enrolled in "Customer Welcome - Agent", agent enrolled in "Agent Lead Alert", Slack #general
- [ ] Create deal with lender → verify customer enrolled in "Customer Welcome - Lender", lender enrolled in "Lender Lead Alert", Slack #general
- [ ] Create deal with neither → verify customer enrolled in "Customer Welcome - Unassigned", Slack #general

**WF2 — Customer Deal Stage Changed:**
- [ ] Move deal to Under Contract → verify enrolled in "Customer Under Contract", Slack
- [ ] Move deal to Paid Complete → verify enrolled in "Customer Closed", Slack
- [ ] Move deal to Closed Lost → verify Slack only (no sequence enrollment)

**WF3a — Agent Onboarding Created:**
- [ ] Create agent onboarding entry → verify enrolled in "Agent Onboarding", Slack "New Agent Application"

**WF3b — Agent Onboarding Stage Changed:**
- [ ] Move agent to Contract Sent → verify enrolled in "Agent Contract Ready"
- [ ] Move agent to Live on Website → verify enrolled in "Agent Live", Slack
- [ ] Move agent from New Application to Interviewing within 7 days → verify A3 is NOT sent (Exit block prevents this)

**WF4a — Lender Onboarding Created:**
- [ ] Create lender onboarding entry → verify enrolled in "Lender Onboarding", Slack "New Lender Application"

**WF4b — Lender Onboarding Stage Changed:**
- [ ] Move lender to Contract Sent → verify enrolled in "Lender Contract Ready"
- [ ] Move lender to Live on Website → verify enrolled in "Lender Live", Slack "Lender Live on Website"
- [ ] Move lender from New Application within 7 days → verify L3 is NOT sent (Exit block prevents this)

**WF5a — Intern Placement Created:**
- [ ] Create intern placement entry → verify enrolled in "Intern Onboarding", Slack "New Intern Application"

**WF5b — Intern Placement Stage Changed:**
- [ ] Move intern from New Application to Under Review → verify exited from "Intern Onboarding", I2 NOT sent ✅

---

## Maintenance Notes

- **Stage name changes:** If you rename pipeline stages in Attio, update workflow conditions
- **New stages:** Add IF/ELSE branches for any new milestone stages
- **Sequence changes:** Update sequence names in workflow actions if renamed
- **Slack channel migration:** When dedicated channels are created, update channel selections in each workflow's Slack block
- **Exit from sequence:** WF3b, WF4b, and WF5b all exit from onboarding sequences on stage change ✅
