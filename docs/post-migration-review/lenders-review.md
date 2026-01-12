# Lenders Migration Review

**Migration Date:** 2026-01-11
**Script:** `scripts/migrate-lenders.ts`
**Total Expected:** 141 lenders
**Results:**
- Successfully created: 139
- Errors: 2
- Skipped: 0

---

## Errors (2) - Invalid Phone Numbers

| Name | Issue | Action Required |
|------|-------|-----------------|
| LENDER SAMPLE | Invalid phone number (missing country info) | Test record - likely can ignore |
| Mark Ambrose | Invalid phone number (missing country info) | Manually add to Attio, fix phone format |

### Root Cause
Same as agents - phone numbers not in E.164 format.

### Recommended Fix
1. Look up Mark Ambrose in Salesforce
2. Get correct phone number
3. Manually create in Attio with properly formatted phone number

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Test/Sample records | 1 | Low - can ignore |
| Real lenders with phone issues | 1 | Medium - manual entry |

**Total requiring attention:** 1 real lender (Mark Ambrose)
