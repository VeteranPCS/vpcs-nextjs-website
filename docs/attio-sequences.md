# VeteranPCS Attio Sequences

This document contains complete specifications for all Attio Sequences (email campaigns sent via synced Gmail/Microsoft accounts).

---

## Critical Architecture Note

**Attio Sequences ARE the email sending mechanism.** Per [Attio's sequence documentation](https://attio.com/help/reference/automations/sequences/create-a-sequence):
- Sequences send emails through synced Gmail/Microsoft accounts
- Can have multiple steps with delays (minimum 1 day between emails)
- Have built-in exit triggers (reply received, meeting booked)
- Are enrolled/exited via Workflows

**Workflows CANNOT send emails directly.** Every email, even "immediate" ones, must be wrapped in a Sequence.

---

## Architecture Overview

**Sequences vs Workflows:**
- **Sequences** = Email campaigns that send via synced email accounts
- **Workflows** = Event-driven automation that enrolls/exits from sequences

**Key Principle:** Workflows handle business logic; sequences send emails.

---

## Sequence Summary (14 Total)

| # | Sequence | Steps | Exit Triggers | Enrolled By |
|---|----------|-------|---------------|-------------|
| **Customer Sequences** |||||
| 1 | Customer Welcome - Unassigned | 1 (immediate) | Reply | WF1 |
| 2 | Customer Welcome - Agent | 1 (immediate) | Reply | WF1 |
| 3 | Customer Welcome - Lender | 1 (immediate) | Reply | WF1 |
| 4 | Customer Under Contract | 1 (immediate) | Reply | WF2 |
| 5 | Customer Closed | 1 (immediate) | Reply | WF2 |
| **Agent Sequences** |||||
| 6 | Agent Lead Alert | 1 (immediate) | Reply | WF1 |
| 7 | Agent Onboarding | 2 (immediate + 7 days) | Reply + WF3 exit | WF3 |
| 8 | Agent Contract Ready | 1 (immediate) | Reply | WF3 |
| 9 | Agent Live | 1 (immediate) | Reply | WF3 |
| **Lender Sequences** |||||
| 10 | Lender Lead Alert | 1 (immediate) | Reply | WF1 |
| 11 | Lender Onboarding | 2 (immediate + 7 days) | Reply + WF4 exit | WF4 |
| 12 | Lender Contract Ready | 1 (immediate) | Reply | WF4 |
| 13 | Lender Live | 1 (immediate) | Reply | WF4 |
| **Intern Sequences** |||||
| 14 | Intern Onboarding | 2 (immediate + 7 days) | Reply + WF5 exit | WF5 |

---

## Customer Sequences

### Sequence 1: Customer Welcome - Unassigned

**Purpose:** Welcome customers who submitted a contact form without selecting a specific agent or lender.

**Enrollment:** Workflow 1 (when neither agent nor lender is assigned)

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | C1 - Contact Form Confirmation | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Customer Welcome - Unassigned`
2. Object: `customers`
3. Exit conditions: Reply received
4. Step 1: Immediate, send C1 template

---

### Sequence 2: Customer Welcome - Agent

**Purpose:** Welcome customers who selected a specific agent, introducing them to their assigned agent.

**Enrollment:** Workflow 1 (when agent is assigned)

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | C2 - Lead Confirmation with Agent | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Customer Welcome - Agent`
2. Object: `customers`
3. Exit conditions: Reply received
4. Step 1: Immediate, send C2 template

---

### Sequence 3: Customer Welcome - Lender

**Purpose:** Welcome customers who selected a specific lender, introducing them to their assigned lender.

**Enrollment:** Workflow 1 (when lender is assigned)

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | C3 - Lead Confirmation with Lender | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Customer Welcome - Lender`
2. Object: `customers`
3. Exit conditions: Reply received
4. Step 1: Immediate, send C3 template

---

### Sequence 4: Customer Under Contract

**Purpose:** Congratulate customers when their deal goes under contract.

**Enrollment:** Workflow 2 (when deal stage changes to "Under Contract")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | C4 - Under Contract Congratulations | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Customer Under Contract`
2. Object: `customers`
3. Exit conditions: Reply received
4. Step 1: Immediate, send C4 template

---

### Sequence 5: Customer Closed

**Purpose:** Celebrate with customers when their deal closes, share bonus details, and request reviews.

**Enrollment:** Workflow 2 (when deal stage changes to "Paid Complete")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | C5 - Transaction Closed | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Customer Closed`
2. Object: `customers`
3. Exit conditions: Reply received
4. Step 1: Immediate, send C5 template

---

## Agent Sequences

### Sequence 6: Agent Lead Alert

**Purpose:** Notify agents immediately when they receive a new lead from VeteranPCS.

**Enrollment:** Workflow 1 (when deal is assigned to an agent)

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | A1 - New Lead Alert | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Agent Lead Alert`
2. Object: `agents`
3. Exit conditions: Reply received (confirms lead receipt)
4. Step 1: Immediate, send A1 template

---

### Sequence 7: Agent Onboarding

**Purpose:** Welcome new agent applicants and follow up if no response after 7 days.

**Enrollment:** Workflow 3 (when agent onboarding entry is created)
**Exit:** Workflow 3 (when stage leaves "New Application")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | A2 - Application Welcome | See `attio-email-templates.md` |
| 2 | 7 days | A3 - Application Follow-Up | See `attio-email-templates.md` |

**Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│          ENROLLED: Agent added to agent_onboarding          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  STEP 1: Immediate   │
              │  Send A2 Email       │
              │  "Welcome to VPCS"   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  WAIT: 7 Days        │
              │                      │
              │  [If WF3 exits or    │
              │   reply received     │
              │   → EXIT SEQUENCE]   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  STEP 2: After 7d    │
              │  Send A3 Email       │
              │  "Following Up"      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  SEQUENCE COMPLETE   │
              └──────────────────────┘
```

**Attio Configuration:**
1. Name: `Agent Onboarding`
2. Object: `agents`
3. Exit conditions: Reply received, OR exited by Workflow 3
4. Step 1: Immediate, send A2 template
5. Step 2: 7 days after Step 1, send A3 template

---

### Sequence 8: Agent Contract Ready

**Purpose:** Notify agents that their partnership agreement is ready to sign.

**Enrollment:** Workflow 3 (when stage changes to "Contract Sent")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | A4 - Contract Ready | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Agent Contract Ready`
2. Object: `agents`
3. Exit conditions: Reply received
4. Step 1: Immediate, send A4 template

---

### Sequence 9: Agent Live

**Purpose:** Welcome agents to the network when they go live on the website.

**Enrollment:** Workflow 3 (when stage changes to "Live on Website")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | A5 - Welcome to the Network | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Agent Live`
2. Object: `agents`
3. Exit conditions: Reply received
4. Step 1: Immediate, send A5 template

---

## Lender Sequences

### Sequence 10: Lender Lead Alert

**Purpose:** Notify lenders immediately when they receive a new lead from VeteranPCS.

**Enrollment:** Workflow 1 (when deal is assigned to a lender)

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | L1 - New Lead Alert | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Lender Lead Alert`
2. Object: `lenders`
3. Exit conditions: Reply received (confirms lead receipt)
4. Step 1: Immediate, send L1 template

---

### Sequence 11: Lender Onboarding

**Purpose:** Welcome new lender applicants and follow up if no response after 7 days.

**Enrollment:** Workflow 4 (when lender onboarding entry is created)
**Exit:** Workflow 4 (when stage leaves "New Application")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | L2 - Application Welcome | See `attio-email-templates.md` |
| 2 | 7 days | L3 - Application Follow-Up | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Lender Onboarding`
2. Object: `lenders`
3. Exit conditions: Reply received, OR exited by Workflow 4
4. Step 1: Immediate, send L2 template
5. Step 2: 7 days after Step 1, send L3 template

---

### Sequence 12: Lender Contract Ready

**Purpose:** Notify lenders that their partnership agreement is ready to sign.

**Enrollment:** Workflow 4 (when stage changes to "Contract Sent")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | L4 - Contract Ready | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Lender Contract Ready`
2. Object: `lenders`
3. Exit conditions: Reply received
4. Step 1: Immediate, send L4 template

---

### Sequence 13: Lender Live

**Purpose:** Welcome lenders to the network when they go live on the website.

**Enrollment:** Workflow 4 (when stage changes to "Live on Website")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | L5 - Welcome to the Network | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Lender Live`
2. Object: `lenders`
3. Exit conditions: Reply received
4. Step 1: Immediate, send L5 template

---

## Intern Sequences

### Sequence 14: Intern Onboarding

**Purpose:** Welcome new intern applicants and follow up if no response after 7 days.

**Enrollment:** Workflow 5 (when intern placement entry is created)
**Exit:** Workflow 5 (when stage leaves "New Application")

**Steps:**

| Step | Delay | Email | Template |
|------|-------|-------|----------|
| 1 | Immediate | I1 - Application Welcome | See `attio-email-templates.md` |
| 2 | 7 days | I2 - Application Follow-Up | See `attio-email-templates.md` |

**Attio Configuration:**
1. Name: `Intern Onboarding`
2. Object: `interns`
3. Exit conditions: Reply received, OR exited by Workflow 5
4. Step 1: Immediate, send I1 template
5. Step 2: 7 days after Step 1, send I2 template

---

## 7-Day Follow-Up Logic Explained

**Challenge:** Only send follow-up emails if the recipient hasn't progressed.

**Solution:** Workflows exit people from sequences when stage changes.

### Example Flow

```
Day 0: Agent applies
  → WF3 enrolls agent in "Agent Onboarding" sequence
  → Sequence sends A2 (immediate)
  → 7-day timer starts

Day 3: Admin interviews agent, moves to "Interviewing"
  → WF3 triggers (stage changed)
  → WF3 condition: "stage left New Application" = TRUE
  → WF3 action: Remove from "Agent Onboarding" sequence
  → Agent exits sequence before Day 7

Day 7: Timer would fire, but agent is no longer enrolled
  → A3 is NOT sent (correct behavior!)
```

### If Agent Never Progresses

```
Day 0: Agent applies
  → Sequence sends A2 (immediate)
  → 7-day timer starts

Day 7: Timer fires, agent still enrolled
  → Sequence sends A3 (follow-up)
  → Sequence complete
```

---

## Merge Field Reference

Attio sequences use merge fields to personalize emails. Use these field names:

### Agent Fields
| Display | Field |
|---------|-------|
| `{{first_name}}` | `agents.first_name` |
| `{{last_name}}` | `agents.last_name` |
| `{{email}}` | `agents.email` |
| `{{phone}}` | `agents.phone` |
| `{{brokerage_name}}` | `agents.brokerage_name` |

### Lender Fields
| Display | Field |
|---------|-------|
| `{{first_name}}` | `lenders.first_name` |
| `{{last_name}}` | `lenders.last_name` |
| `{{email}}` | `lenders.email` |
| `{{phone}}` | `lenders.phone` |
| `{{company_name}}` | `lenders.company_name` |
| `{{individual_nmls}}` | `lenders.individual_nmls` |

### Intern Fields
| Display | Field |
|---------|-------|
| `{{first_name}}` | `interns.first_name` |
| `{{last_name}}` | `interns.last_name` |
| `{{email}}` | `interns.email` |
| `{{internship_type}}` | `interns.internship_type` |
| `{{desired_city}}` | `interns.desired_city` |
| `{{desired_state}}` | `interns.desired_state` |
| `{{preferred_start_date}}` | `interns.preferred_start_date` |

### Customer Fields
| Display | Field |
|---------|-------|
| `{{first_name}}` | `customers.first_name` |
| `{{last_name}}` | `customers.last_name` |
| `{{email}}` | `customers.email` |

### Cross-Object Fields (for customer emails referencing agents/lenders)
| Display | Field |
|---------|-------|
| `{{agent.first_name}}` | Related agent's first_name |
| `{{agent.email}}` | Related agent's email |
| `{{lender.first_name}}` | Related lender's first_name |
| `{{lender.company_name}}` | Related lender's company |
| `{{deal.destination_city}}` | Deal's destination city |
| `{{deal.move_in_bonus}}` | Calculated bonus amount |

---

## Prerequisites

Before creating sequences:

1. **Email sync required** - Gmail or Microsoft account must be synced in Attio
2. **Sender assignment** - Each sequence needs a designated sender with delegated sending enabled
3. **Test mode** - Use Attio's test mode to verify sequences before going live
4. **Attio plan** - Confirm sequences are available on your Attio plan tier

---

## Credit Optimization

Attio sequences = **1 credit per enrollment** (regardless of number of steps).

**Tips:**
- Consolidate related emails into one sequence where timing allows
- Exit sequences early via workflows to avoid unnecessary sends
- Use reply detection to auto-exit engaged recipients

---

## Testing Checklist

- [ ] Create test customer (unassigned) → verify enrolled in "Customer Welcome - Unassigned", C1 sent
- [ ] Create test customer (agent assigned) → verify enrolled in "Customer Welcome - Agent", C2 sent
- [ ] Create test customer (lender assigned) → verify enrolled in "Customer Welcome - Lender", C3 sent
- [ ] Move deal to Under Contract → verify enrolled in "Customer Under Contract", C4 sent
- [ ] Move deal to Paid Complete → verify enrolled in "Customer Closed", C5 sent
- [ ] Create test agent → verify enrolled in "Agent Onboarding", A2 sent immediately
- [ ] Wait 7 days (or use test mode) → verify A3 sent
- [ ] Create agent, then change stage before Day 7 → verify A3 NOT sent (exited from sequence)
- [ ] Move agent to Contract Sent → verify enrolled in "Agent Contract Ready", A4 sent
- [ ] Move agent to Live → verify enrolled in "Agent Live", A5 sent
- [ ] Same tests for Lender sequences
- [ ] Same tests for Intern sequence

---

## Comparison to Original Plan

| Aspect | Original (Incorrect) | Revised (Correct) |
|--------|---------------------|-------------------|
| Sequences | 4 | 14 |
| Workflows "send emails" | 8 workflows sending directly | 0 (impossible) |
| Workflows enroll in sequences | Some | All 5 workflows |
| Email templates | 18 | 18 (same) |

**Why more sequences?** Every email must be in a sequence since workflows cannot send emails directly. Each "immediate" email needs its own sequence.

---

## Maintenance Notes

- **Delay changes:** Update wait times in Attio sequence builder
- **Email content changes:** Edit templates directly in sequence steps (or use `attio-email-templates.md` as reference)
- **New sequences:** Create in Attio, then add enrollment action in the relevant workflow
- **Exit conditions:** Handled both by built-in reply detection AND workflow exit actions
