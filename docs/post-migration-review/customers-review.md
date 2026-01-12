# Customers Migration Review

**Migration Date:** 2026-01-11
**Script:** `scripts/migrate-customers.ts`
**Total Expected:** ~983 customer accounts
**Results:**
- Successfully created: 953
- Errors: 12
- Skipped: 18

---

## Errors (12) - Invalid Phone Numbers

These customers failed due to phone number format issues.

| Name | Error | Action Required |
|------|-------|-----------------|
| Jacob Nicholls | Invalid phone number, missing country info | Add manually with corrected phone |
| Dylan Galloway | Invalid phone number, missing country info | Add manually with corrected phone |
| Clarissa VanGelder | Invalid phone number, missing country info | Add manually with corrected phone |
| Spelman Myers | Invalid phone number, missing country info | Add manually with corrected phone |
| Test Lead | Invalid phone number, missing country info | **Skip - test data** |
| Michael Brown | Invalid phone number | Add manually with corrected phone |
| Baraka Gloire | Invalid phone number, missing country info | Add manually with corrected phone |
| Nicole Johnson | Invalid phone number, missing country info | Add manually with corrected phone |
| Christine Nautscher | Invalid phone number, missing country info | Add manually with corrected phone |
| Kaylee Whitney | Invalid phone number, missing country info | Add manually with corrected phone |
| Jason Steffen | Invalid phone number, missing country info | Add manually with corrected phone |
| Nick Braun | Invalid phone number, missing country info | Add manually with corrected phone |

### Root Cause
Phone numbers in Salesforce Contact records are not in E.164 format. The normalization function couldn't convert them (likely missing area code or country code).

### Recommended Fix
1. Look up each customer in Salesforce
2. Verify/correct their phone number
3. Add to Attio manually with valid phone or omit phone field

---

## Skipped (18) - Missing Email

These customers were skipped because no email was found in the Contact record.

| Name | Salesforce ID | Action Required |
|------|---------------|-----------------|
| Dan Barbian | 0014x00000rHfkFAAS | Add email to Salesforce then migrate |
| Tyler Elliot | 0014x0000103Q6XAAU | Add email to Salesforce then migrate |
| Bryan Del Real | 001Rg00000L9jhrIAB | Add email to Salesforce then migrate |
| Michelle Clark | 001Rg00000NSHwjIAH | Add email to Salesforce then migrate |
| Davian Bartley | 001Rg00000OGszaIAD | Add email to Salesforce then migrate |
| Justin Ledgerwood | 001Rg00000PAxOjIAL | Add email to Salesforce then migrate |
| Jacob Edwards | 001Rg00000RPCRUIA5 | Add email to Salesforce then migrate |
| Nam Dy | 001Rg00000RlsiMIAR | Add email to Salesforce then migrate |
| Samantha Mills | 001Rg00000T7Ad3IAF | Add email to Salesforce then migrate |
| Tyson Billingslea | 001Rg00000TDYclIAH | Add email to Salesforce then migrate |
| *... and 8 more* | | Check Salesforce export |

### Root Cause
Email is a required field for customers in Attio. These Salesforce Contact records have no email address.

### Recommended Fix
1. Review each customer in Salesforce
2. If email is available elsewhere (from deals, communication history), add it
3. If no email exists, add manually to Attio without email requirement or skip

---

## Notes

- **Test Records:** "Test Lead" appears to be test data and can be safely ignored
- **Email Required:** Attio requires email for customer records - this is intentional to ensure data quality
- **Phone Errors:** All phone errors are due to malformed phone numbers in source data

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| Phone format errors (real customers) | 11 | Medium - add manually |
| Phone format errors (test data) | 1 | Low - skip |
| Missing email | 18 | Medium - verify in Salesforce |

**Total requiring attention:** 29 records (11 real phone errors + 18 missing emails)
