# VeteranPCS Attio Workflows

This document contains complete specifications for all Attio Workflows that power email automation and Slack notifications.

---

## Critical Architecture Note

**Attio Workflows CANNOT send emails directly.** Based on [Attio's workflow block library](https://attio.com/help/reference/automations/workflows/workflows-block-library), workflows can only:
- Enroll/exit people from Sequences
- Send Slack messages
- Integrate with external ESPs (Mailchimp, Outreach, Mixmax)
- Update records, create tasks, use HTTP requests

**Attio Sequences ARE the email sending mechanism.** Each email (even "immediate" ones) must be wrapped in a Sequence. See `attio-sequences.md` for the full list of 14 sequences.

---

## Architecture Overview

**Core Principle:** Workflows handle business logic and control enrollment/exit from Sequences. Sequences send the actual emails.

- **Workflows** = Event-driven automation triggered by record/stage changes
- **Sequences** = Email campaigns sent via synced Gmail/Microsoft accounts (see `attio-sequences.md`)

Workflows are responsible for:
1. **Enrolling** records into sequences (which send the emails)
2. **Exiting** records from sequences when business logic requires
3. Sending Slack notifications

---

## Workflow Summary (5 Total)

| # | Workflow | Trigger | Pipeline |
|---|----------|---------|----------|
| 1 | New Customer Deal Created | Entry created | `customer_deals` |
| 2 | Customer Deal Stage Changed | Stage updated | `customer_deals` |
| 3 | Agent Onboarding Lifecycle | Entry created OR stage changed | `agent_onboarding` |
| 4 | Lender Onboarding Lifecycle | Entry created OR stage changed | `lender_onboarding` |
| 5 | Intern Placement Lifecycle | Entry created OR stage changed | `intern_placements` |

**Note:** We consolidated from 8 workflows to 5 by combining "Created" and "Stage Changed" triggers for onboarding pipelines.

---

## Workflow 1: New Customer Deal Created

### Purpose
Route new customer leads to appropriate email sequences and Slack notifications based on agent/lender assignment.

### Trigger
- **Event:** Record added to `customer_deals` pipeline
- **Object:** `customers` (parent record)

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
    │#new-leads   │  │#new-leads   │  │#leads-       │
    └─────────────┘  └─────────────┘  │unassigned    │
                                      └──────────────┘
```

### Attio Configuration

**Step 1: Create Workflow**
1. Go to **Automations** → **Workflows** → **Create workflow**
2. Name: `New Customer Deal Created`
3. Description: `Routes new customer leads to appropriate sequences and Slack`

**Step 2: Set Trigger**
1. Select trigger: **Record added to list**
2. List: `customer_deals` (pipeline)
3. Object: `customers`

**Step 3: Add Branch - Check Agent Assignment**
1. Add action: **Branch (IF/ELSE)**
2. Condition: `deal.agent` **is not empty**

**Step 4a: Agent Branch Actions**
1. **Add to sequence** - Enroll customer in "Customer Welcome - Agent" sequence
   - Sequence: `Customer Welcome - Agent` (sends C2 immediately)

2. **Add to sequence** - Enroll agent in "Agent Lead Alert" sequence
   - Sequence: `Agent Lead Alert` (sends A1 immediately)

3. **Send Slack message**
   - Channel: `#new-leads`
   - Message:
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

**Step 4b: No Agent Branch - Check Lender Assignment**
1. Add nested **Branch (IF/ELSE)**
2. Condition: `deal.lender` **is not empty**

**Step 5a: Lender Branch Actions**
1. **Add to sequence** - Enroll customer in "Customer Welcome - Lender" sequence
   - Sequence: `Customer Welcome - Lender` (sends C3 immediately)

2. **Add to sequence** - Enroll lender in "Lender Lead Alert" sequence
   - Sequence: `Lender Lead Alert` (sends L1 immediately)

3. **Send Slack message**
   - Channel: `#new-leads`
   - Message: (same format as agent, but with lender info)

**Step 5b: Neither Assigned Branch Actions**
1. **Add to sequence** - Enroll customer in "Customer Welcome - Unassigned" sequence
   - Sequence: `Customer Welcome - Unassigned` (sends C1 immediately)

2. **Send Slack message**
   - Channel: `#leads-unassigned`
   - Message:
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

## Workflow 2: Customer Deal Stage Changed

### Purpose
Enroll customers in milestone sequences and send Slack notifications when deals progress.

### Trigger
- **Event:** Stage changes on `customer_deals` pipeline
- **Object:** `customers`

### Logic Flow

```
┌────────────────────────────────────────────────────────┐
│          TRIGGER: Customer Deal Stage Changed          │
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
   │sequence     │ │             │ │             │      │
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘      │
          │               │               │              │
          ▼               ▼               ▼              │
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
   │Slack:       │ │Slack:       │ │Slack:       │      │
   │#deals       │ │#deals       │ │#deals       │      │
   │(Under       │ │(Won!)       │ │(Lost)       │      │
   │Contract)    │ │             │ │             │      │
   └─────────────┘ └─────────────┘ └─────────────┘      │
```

### Attio Configuration

**Step 1: Create Workflow**
1. Name: `Customer Deal Stage Changed`
2. Description: `Enrolls customers in milestone sequences and sends Slack notifications`

**Step 2: Set Trigger**
1. Trigger: **Stage changed**
2. List: `customer_deals`
3. Object: `customers`

**Step 3: Branch - Under Contract**
1. Add **Branch (IF/ELSE)**
2. Condition: `Current stage` **equals** `Under Contract`

**Step 3a: Under Contract Actions**
1. **Add to sequence** - Enroll customer in "Customer Under Contract" sequence
   - Sequence: `Customer Under Contract` (sends C4 immediately)

2. **Send Slack message**
   - Channel: `#deals`
   - Message:
```
:memo: Deal Under Contract

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Agent:* {{agent.first_name}} {{agent.last_name}}
*Lender:* {{lender.first_name}} {{lender.last_name}}
*Expected Close:* {{deal.expected_close_date}}

<{{attio_record_url}}|View in Attio>
```

**Step 4: Branch - Paid Complete**
1. Add **Branch (IF/ELSE)** (parallel)
2. Condition: `Current stage` **equals** `Paid Complete`

**Step 4a: Paid Complete Actions**
1. **Add to sequence** - Enroll customer in "Customer Closed" sequence
   - Sequence: `Customer Closed` (sends C5 immediately)

2. **Send Slack message**
   - Channel: `#deals`
   - Message:
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

**Step 5: Branch - Closed Lost**
1. Add **Branch (IF/ELSE)** (parallel)
2. Condition: `Current stage` **equals** `Closed Lost`

**Step 5a: Closed Lost Actions** (Slack only, no customer email)
1. **Send Slack message**
   - Channel: `#deals`
   - Message:
```
:x: Deal Closed - Lost

*Customer:* {{customer.first_name}} {{customer.last_name}}
*Agent:* {{agent.first_name}} {{agent.last_name}}
*Reason:* {{deal.lost_reason}}

<{{attio_record_url}}|View in Attio>
```

---

## Workflow 3: Agent Onboarding Lifecycle

### Purpose
Consolidated workflow that handles both new agent applications AND stage changes:
- Welcome new agent applicants and enroll them in the onboarding sequence
- Exit agents from onboarding sequence when they progress
- Enroll in milestone sequences (A4, A5) at key stages
- Celebrate when agents go live

### Trigger
- **Event:** Record added to list OR Stage changed on `agent_onboarding` pipeline
- **Object:** `agents`

**Note:** Attio may require two separate workflows if it doesn't support OR triggers. If so, create "Agent Onboarding Created" and "Agent Onboarding Stage Changed" as separate workflows.

### Logic Flow

```
┌────────────────────────────────────────────────────────────┐
│     TRIGGER: Agent Onboarding Entry Created OR Changed     │
└────────────────────────┬───────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    Entry Created?                  Stage Changed?
         │                               │
         ▼                               │
┌─────────────────────┐     ┌───────────┴───────────┐
│ Enroll in Sequence: │     │                       │
│ "Agent Onboarding"  │     │                       │
│ (sends A2 immediate,│  Left "New App"?    Stage = "Contract Sent"?
│  A3 after 7 days)   │     │                       │
└──────────┬──────────┘     ▼                       ▼
           │         ┌─────────────┐         ┌─────────────┐
           │         │ Exit from   │         │ Enroll in   │
           │         │ "Agent      │         │ "Agent      │
           │         │ Onboarding" │         │ Contract    │
           │         │ sequence    │         │ Ready" seq  │
           │         └─────────────┘         └─────────────┘
           │                                        │
           │                          Stage = "Live on Website"?
           │                                        │
           ▼                                        ▼
┌─────────────────────┐                  ┌─────────────────────┐
│ Slack:              │                  │ Enroll in "Agent    │
│ #agent-applications │                  │ Live" sequence      │
│ (New Application)   │                  └──────────┬──────────┘
└─────────────────────┘                             │
                                                    ▼
                                         ┌─────────────────────┐
                                         │ Slack:              │
                                         │ #agent-applications │
                                         │ (Celebration!)      │
                                         └─────────────────────┘
```

### Attio Configuration

**Step 1: Create Workflow**
1. Name: `Agent Onboarding Lifecycle`
2. Description: `Handles agent onboarding from application to going live`

**Step 2: Set Trigger**
1. Trigger: **Record added to list** (for entry created)
   - List: `agent_onboarding`
   - Object: `agents`

**Note:** You may need a second workflow for stage changes. Check if Attio supports multiple triggers.

**Step 3: Entry Created Branch**
1. Add **Branch (IF/ELSE)**
2. Condition: Trigger type = "Record added" (or skip if using separate workflows)

**Step 3a: Entry Created Actions**
1. **Add to sequence** - Enroll in "Agent Onboarding" sequence
   - Sequence: `Agent Onboarding` (sends A2 immediately, A3 after 7 days)

2. **Send Slack message**
   - Channel: `#agent-applications`
   - Message:
```
:house: New Agent Application

*Name:* {{agent.first_name}} {{agent.last_name}}
*Email:* {{agent.email}}
*Phone:* {{agent.phone}}
*Location:* {{agent.city}}, {{agent.state}}
*Brokerage:* {{agent.brokerage_name}}

<{{attio_record_url}}|View in Attio>
```

**Step 4: Branch - Stage Left "New Application"**
1. Add **Branch (IF/ELSE)** (parallel)
2. Condition: `Previous stage` **equals** `New Application` AND `Current stage` **does not equal** `New Application`

**Step 4a: Exit Sequence**
1. **Remove from sequence** - Exit from "Agent Onboarding" sequence
   - This prevents A3 from sending if agent has progressed

**Step 5: Branch - Contract Sent**
1. Add **Branch (IF/ELSE)** (parallel)
2. Condition: `Current stage` **equals** `Contract Sent`

**Step 5a: Enroll in Contract Ready Sequence**
1. **Add to sequence** - Enroll in "Agent Contract Ready" sequence
   - Sequence: `Agent Contract Ready` (sends A4 immediately)

**Step 6: Branch - Live on Website**
1. Add **Branch (IF/ELSE)** (parallel)
2. Condition: `Current stage` **equals** `Live on Website`

**Step 6a: Live Actions**
1. **Add to sequence** - Enroll in "Agent Live" sequence
   - Sequence: `Agent Live` (sends A5 immediately)

2. **Send Slack message**
   - Channel: `#agent-applications`
   - Message:
```
:tada: Agent Now Live on Website!

*Agent:* {{agent.first_name}} {{agent.last_name}}
*Location:* {{agent.city}}, {{agent.state}}
*Brokerage:* {{agent.brokerage_name}}

They're ready to receive leads! :champagne:

<{{attio_record_url}}|View in Attio>
```

---

## Workflow 4: Lender Onboarding Lifecycle

### Purpose
Consolidated workflow for lender onboarding (mirrors Agent Onboarding Lifecycle).

### Trigger
- **Event:** Record added to list OR Stage changed on `lender_onboarding` pipeline
- **Object:** `lenders`

### Attio Configuration

**Step 1: Create Workflow**
1. Name: `Lender Onboarding Lifecycle`
2. Description: `Handles lender onboarding from application to going live`

**Step 2: Set Trigger**
1. Trigger: **Record added to list**
2. List: `lender_onboarding`
3. Object: `lenders`

**Step 3: Entry Created Actions**
1. **Add to sequence** - Enroll in "Lender Onboarding" sequence
   - Sequence: `Lender Onboarding` (sends L2 immediately, L3 after 7 days)

2. **Send Slack message**
   - Channel: `#lender-applications`
   - Message:
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

**Step 4: Branch - Stage Left "New Application"**
1. Condition: Previous stage = "New Application" AND Current stage ≠ "New Application"
2. Action: **Remove from sequence** `Lender Onboarding`

**Step 5: Branch - Contract Sent**
1. Condition: Current stage = "Contract Sent"
2. Action: **Add to sequence** `Lender Contract Ready` (sends L4)

**Step 6: Branch - Live on Website**
1. Condition: Current stage = "Live on Website"
2. Actions:
   - **Add to sequence** `Lender Live` (sends L5)
   - **Send Slack message** to `#lender-applications`:
```
:tada: Lender Now Live on Website!

*Lender:* {{lender.first_name}} {{lender.last_name}}
*Company:* {{lender.company_name}}
*States:* {{lender.states}}

They're ready to receive leads! :champagne:

<{{attio_record_url}}|View in Attio>
```

---

## Workflow 5: Intern Placement Lifecycle

### Purpose
Consolidated workflow for intern placements (simpler than agent/lender - no Contract/Live stages).

### Trigger
- **Event:** Record added to list OR Stage changed on `intern_placements` pipeline
- **Object:** `interns`

### Attio Configuration

**Step 1: Create Workflow**
1. Name: `Intern Placement Lifecycle`
2. Description: `Handles intern applications and placement process`

**Step 2: Set Trigger**
1. Trigger: **Record added to list**
2. List: `intern_placements`
3. Object: `interns`

**Step 3: Entry Created Actions**
1. **Add to sequence** - Enroll in "Intern Onboarding" sequence
   - Sequence: `Intern Onboarding` (sends I1 immediately, I2 after 7 days)

2. **Send Slack message**
   - Channel: `#intern-applications`
   - Message:
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

**Step 4: Branch - Stage Left "New Application"**
1. Condition: Previous stage = "New Application" AND Current stage ≠ "New Application"
2. Action: **Remove from sequence** `Intern Onboarding`

**Future Enhancement:** Add sequences for "Matched" and "Placement Complete" stages as needed.

---

## Slack Channel Summary

| Channel | Workflow | Notification Type |
|---------|----------|-------------------|
| `#new-leads` | WF1 | New assigned leads |
| `#leads-unassigned` | WF1 | Unassigned leads (Beth monitors) |
| `#agent-applications` | WF3 | New apps, contract sent, going live |
| `#lender-applications` | WF4 | New apps, contract sent, going live |
| `#intern-applications` | WF5 | New applications |
| `#deals` | WF2 | Under contract, won, lost |

---

## Sequence Reference

Workflows enroll people in these sequences (see `attio-sequences.md` for full details):

| Sequence | Emails | Enrolled By |
|----------|--------|-------------|
| Customer Welcome - Unassigned | C1 | WF1 |
| Customer Welcome - Agent | C2 | WF1 |
| Customer Welcome - Lender | C3 | WF1 |
| Customer Under Contract | C4 | WF2 |
| Customer Closed | C5 | WF2 |
| Agent Lead Alert | A1 | WF1 |
| Agent Onboarding | A2 → A3 | WF3 |
| Agent Contract Ready | A4 | WF3 |
| Agent Live | A5 | WF3 |
| Lender Lead Alert | L1 | WF1 |
| Lender Onboarding | L2 → L3 | WF4 |
| Lender Contract Ready | L4 | WF4 |
| Lender Live | L5 | WF4 |
| Intern Onboarding | I1 → I2 | WF5 |

---

## Prerequisites

Before implementing workflows:

1. **Email sync required** - Gmail or Microsoft account must be synced in Attio for sequences to send emails
2. **Sender assignment** - Each sequence needs a designated sender with delegated sending enabled
3. **Create sequences first** - Workflows reference sequences, so create sequences before workflows
4. **Attio plan** - Confirm sequences and workflows are available on your Attio plan tier

---

## Credit Optimization

Attio charges per workflow run. To minimize costs:

1. **Consolidate branches** - Use one workflow with branches vs. multiple workflows
2. **Use native Slack integration** - Cheaper than HTTP webhooks
3. **Exit sequences early** - Don't send unnecessary follow-ups
4. **Avoid redundant workflows** - One workflow per trigger type

---

## Testing Checklist

Before going live, test each workflow:

- [ ] **WF1:** Create deal with agent → verify customer enrolled in "Customer Welcome - Agent" sequence, agent enrolled in "Agent Lead Alert" sequence, Slack #new-leads
- [ ] **WF1:** Create deal with lender → verify customer enrolled in "Customer Welcome - Lender" sequence, lender enrolled in "Lender Lead Alert" sequence, Slack #new-leads
- [ ] **WF1:** Create deal with neither → verify customer enrolled in "Customer Welcome - Unassigned" sequence, Slack #leads-unassigned
- [ ] **WF2:** Move deal to Under Contract → verify customer enrolled in "Customer Under Contract" sequence, Slack
- [ ] **WF2:** Move deal to Paid Complete → verify customer enrolled in "Customer Closed" sequence, Slack
- [ ] **WF2:** Move deal to Closed Lost → verify Slack only (no sequence enrollment)
- [ ] **WF3:** Create agent onboarding → verify agent enrolled in "Agent Onboarding" sequence, Slack
- [ ] **WF3:** Move agent from New Application to Interviewing → verify agent exited from "Agent Onboarding" sequence
- [ ] **WF3:** Move agent to Contract Sent → verify agent enrolled in "Agent Contract Ready" sequence
- [ ] **WF3:** Move agent to Live on Website → verify agent enrolled in "Agent Live" sequence, Slack celebration
- [ ] **WF4:** Same tests for lenders
- [ ] **WF5:** Same tests for interns

---

## Maintenance Notes

- **Stage name changes:** If you rename pipeline stages in Attio, update workflow conditions
- **New stages:** Add branches for any new milestone stages
- **Sequence changes:** Update sequence names in workflow actions if renamed
- **Slack channel changes:** Update channel selections in workflow actions
