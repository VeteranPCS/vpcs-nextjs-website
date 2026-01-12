# Agents Migration Review

**Migration Date:** 2026-01-11
**Script:** `scripts/migrate-agents.ts`
**Total Expected:** 1,039 agents
**Results:**
- Successfully created: 1,026
- Errors: 6
- Skipped: 7

---

## Errors (6) - Invalid Phone Numbers

These agents failed due to invalid phone number format. They need manual review and entry in Attio.

| Name | Issue | Action Required |
|------|-------|-----------------|
| Sharon Barnes | Invalid phone number (missing country info) | Manually add to Attio, fix phone format |
| AGENT SAMPLE | Invalid phone number (missing country info) | Test record - likely can ignore |
| Cherline Jeanty | Invalid phone number (missing country info) | Manually add to Attio, fix phone format |
| Test Agent | Invalid phone number (missing country info) | Test record - likely can ignore |
| Test Agent | Invalid phone number (missing country info) | Test record - likely can ignore |
| Reuben DZAANI Neequaye | Invalid phone number (missing country info) | Manually add to Attio, fix phone format |

### Root Cause
The Attio API requires phone numbers in E.164 format (e.g., `+15551234567`). These records likely have:
- International phone numbers without country codes
- Malformed phone numbers
- Non-standard formats the normalizer couldn't handle

### Recommended Fix
1. Look up these agents in Salesforce by name
2. Get their correct phone numbers
3. Manually create them in Attio with properly formatted phone numbers

---

## Skipped (7) - Missing Email or Duplicates

These agents were skipped during migration.

### No Email Found (1)

| Name | Salesforce ID | Issue | Action Required |
|------|---------------|-------|-----------------|
| Off-Site Agent | 0014x00000rHxyLAAS | No email in Contact record | Likely a placeholder record - verify if needed |

### Duplicate Emails (6)

These agents have the same email as another agent already in Attio. This could indicate:
- True duplicates in Salesforce
- Shared email addresses (e.g., team accounts)
- Data quality issues

| Name | Email | Action Required |
|------|-------|-----------------|
| Christian Duplechain | csdup7@gmail.com | Check if duplicate of existing agent |
| Janelle Venegas | jvenegas325@gmail.com | Check if duplicate of existing agent |
| Danny Watson | danny@316warrior.com | Check if duplicate of existing agent |
| Amanda Danley | amandadanley@outlook.com | Check if duplicate of existing agent |
| Donika Minick | donika.minick@gmail.com | Check if duplicate of existing agent |
| Jacob Carlson | jdcarlson307@gmail.com | Check if duplicate of existing agent |

### Recommended Fix
1. Search Attio for the existing agent with that email
2. Determine if the skipped record is:
   - A true duplicate (no action needed)
   - A different person sharing an email (merge records or use alternative email)
   - The same person with updated info (update existing record)

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Test/Sample records | 3 | Low - can ignore |
| Real agents with phone issues | 3 | Medium - manual entry |
| No email | 1 | Low - likely placeholder |
| Duplicate emails | 6 | Medium - verify duplicates |

**Total requiring attention:** ~9 records (excluding test records)
