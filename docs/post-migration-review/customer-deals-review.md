# Customer Deals - Post-Migration Review

**Migration Date:** 2026-01-12
**Script:** scripts/migrate-customer-deals.ts
**Total Records:** 1,021
**Successfully Created:** 975
**Errors:** 1
**Skipped:** 45

---

## Summary

The customer deals migration completed with 975 of 1,021 records (95.5%) successfully created.

### Issues Encountered

1. **API Errors (1 record):**
   - Salesforce ID: `006Rg000007YDreIAG`
   - Error: Attio API returned 500 Internal Server Error (transient)
   - Action: Retry this single record manually or re-run migration for just this ID

2. **Skipped - Missing Customer Mapping (45 records):**
   - These deals reference customers (AccountId) that were not migrated
   - Root cause: Parent customers were skipped due to phone errors or missing emails
   - These deals cannot be created until their parent customer records exist

---

## Records Needing Manual Attention

### API Error (1 record)

| Salesforce ID | Error | Recommended Action |
|---------------|-------|-------------------|
| 006Rg000007YDreIAG | 500 Internal Server Error | Retry migration for this ID |

### Skipped - No Customer Mapping (45 records)

These deals were skipped because their parent customer (AccountId) was not migrated.

| Salesforce Deal ID | Customer Account ID | Reason |
|-------------------|---------------------|--------|
| 0064x000007UNABAA4 | 0014x00000KAObBAAX | Customer not in mapping |
| 0064x000007ahdgAAA | 0014x00000KSLaeAAH | Customer not in mapping |
| 0064x000007awpsAAA | 0014x00000KSbIFAA1 | Customer not in mapping |
| 0064x000007axU6AAI | 0014x00000KSbxjAAD | Customer not in mapping |
| 0064x0000089PD1AAM | 0014x00000OtW5iAAF | Customer not in mapping |
| 0064x0000089PEiAAM | 0014x00000OtUi9AAF | Customer not in mapping |
| 0064x000009Jy4uAAC | 0014x00000W8w2cAAB | Customer not in mapping |
| 0064x000009MM3nAAG | 0014x00000rHfkFAAS | Customer not in mapping |
| 0064x000009N3JDAA0 | 0014x00000OtW5iAAF | Customer not in mapping |
| 0064x00000DvGvNAAV | 0014x0000103yN3AAI | Customer not in mapping |
| ... | ... | +35 more records |

**To get full list:** Check migration script output or re-run with verbose logging.

---

## Resolution Options

### Option 1: Fix Parent Customers First (Recommended)
1. Review `customers-review.md` for the 30 skipped customers
2. Manually create those customer records in Attio with corrected data
3. Update `data/mappings/customers.json` with new Attio IDs
4. Re-run customer deals migration for skipped records only

### Option 2: Create Deals Without Customers
- NOT recommended - deals require parent customer records in Attio's data model

### Option 3: Accept Data Loss
- Mark these 45 deals as intentionally excluded
- Document which deals were not migrated
- May be acceptable if these are old/inactive deals

---

## Verification Queries

To verify migrated deals in Attio:

```bash
# Count all customer deals
curl -X POST "https://api.attio.com/v2/lists/customer_deals/entries/query" \
  -H "Authorization: Bearer $ATTIO_API_KEY" \
  -d '{"limit": 1}' | jq '.pagination.total_count'

# Sample a Paid Complete deal with financial data
curl -X POST "https://api.attio.com/v2/lists/customer_deals/entries/query" \
  -H "Authorization: Bearer $ATTIO_API_KEY" \
  -d '{"limit": 1}' | jq '.data[0].entry_values | {deal_name: .deal_name[0].value, stage: .stage[0].status.title, sale_price: .sale_price[0].currency_value, charity_amount: .charity_amount[0].currency_value}'
```

---

## Notes

- The 45 skipped deals are a direct consequence of 30 skipped customers
- Some customers have multiple deals, hence 45 > 30
- Financial data (sale_price, payout_amount, charity_amount) verified as correctly migrated
- Stage assignments verified as correct (Paid Complete, Closed Lost, Tracking stages, etc.)
