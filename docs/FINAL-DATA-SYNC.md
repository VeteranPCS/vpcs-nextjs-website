# Final Data Sync: Salesforce → Attio

**Last Updated:** 2026-01-25
**Status:** Pending (waiting on Attio email sequences and automations)

---

## Overview

Before the final cutover to Attio, you'll need to sync any new records created in Salesforce since the initial migration (approximately 30-40 records across customers, agent onboarding, lender onboarding, and internships).

**Prerequisites before running this sync:**
- [ ] Email sequences configured in Attio
- [ ] Workflow automations configured in Attio (see CUTOVER-PLAN.md Section 3)
- [ ] Time set aside for cutover (recommend low-traffic period)

---

## Current State

| Object | In Attio | In Cleaned CSV | Notes |
|--------|----------|----------------|-------|
| Agents | 1,026 | 1,033 | 7 duplicates skipped |
| Lenders | 138 | ~141 | 2-3 phone errors |
| Customers | 944 | ~983 | Some missing emails |
| States | 52 | 52 | Complete |
| Areas | 272 | 271 | Complete |

**Data source used:** `data/cleaned/` (not raw Salesforce exports)

The V2 migration scripts read from cleaned CSVs which have:
- Account + Contact data merged
- Phone numbers normalized to E.164 format
- Records filtered by RecordTypeId
- Duplicates removed

---

## Sync Workflow

### Step 1: Export from Salesforce (Last 60 Days)

In Salesforce Data Export or Reports, export these objects with filter:

```
CreatedDate >= LAST_N_DAYS:60
```

**Required files:**
| File | Contains | RecordTypeId Filter |
|------|----------|---------------------|
| `Account.csv` | Agents, Lenders, Customers | See below |
| `Contact.csv` | Contact details (emails, phones) | Join via PersonContactId |
| `Opportunity.csv` | Deals, Onboarding records | See below |
| `Area_Assignment__c.csv` | New area assignments | None needed |

**RecordTypeId Reference:**
| Type | RecordTypeId (18-char) |
|------|------------------------|
| Person Account Agent | `0124x000000YzFsAAK` |
| Person Account Lender | `0124x000000ZGGZAA4` |
| Person Account Customer | `0124x000000Z83FAAS` |
| Customer Deal | `0124x000000Z7G3AAK` |
| Agent Onboarding | `0124x000000Z7FyAAK` |
| Lender Onboarding | `0124x000000ZGHrAAO` |

### Step 2: Data Cleaning (Claude Cowork)

Give Claude Cowork the exported files with these instructions:

```
I need to clean these Salesforce exports for migration to Attio.
Please apply the same transformations used to create the files in data/cleaned/:

1. Join Account + Contact data via PersonContactId
2. Normalize phone numbers to E.164 format (+1XXXXXXXXXX)
3. Use Contact fields for: Email, Agent_Bio__c, Military_Service__c, Military_Status__c
4. Use Account.BillingStateCode for State (2-letter code)
5. Filter by RecordTypeId to separate agents, lenders, customers
6. Remove duplicates (by email)
7. Output as delta files (only records not already in Attio)

Existing Attio salesforce_ids to exclude:
[Run scripts/export-attio-ids.ts to generate this list]

Output files needed:
- data-cleaned-agents-delta.csv
- data-cleaned-lenders-delta.csv  
- data-cleaned-customers-delta.csv
- data-cleaned-relationships-delta.csv
```

**Cleaned CSV Schema Reference:**

```
# Agents
SalesforceId,FirstName,LastName,Email,Phone,State,City,State_s_Licensed_in__c,
License_Number__c,Brokerage_Name__c,Agent_Bio__c,Military_Service__c,
Military_Status__c,Active_on_Website__c,Cities_Serviced__c,Bases_Serviced__c,
Real_Estate_Expertise__c,Managing_Broker_Name__c,Managing_Broker_Email__c,
Date_Active__c,Referral_Contract_2024_Date__c,CreatedDate,LastModifiedDate,
Source,ContactId

# Lenders
SalesforceId,FirstName,LastName,Email,Phone,State,City,Individual_NMLS_ID__c,
Company_NMLS_ID__c,Brokerage_Name__c,State_s_Licensed_in__c,Military_Service__c,
Military_Status__c,Active_on_Website__c,Date_Active__c,Agent_Bio__c,
CreatedDate,LastModifiedDate,Source,ContactId

# Customers
SalesforceId,FirstName,LastName,Email,Phone,State,City,Military_Service__c,
Military_Status__c,Are_you_pre_approved_for_a_mortgage__c,
How_Did_You_Hear_About_Us__c,CreatedDate,LastModifiedDate,Source,ContactId

# Relationships (Deals/Onboarding)
OpportunityId,OpportunityName,OpportunityType,Stage,IsClosed,IsWon,
CustomerContactId,CustomerName,CustomerEmail,AgentAccountId,AgentName,
AgentEmail,LenderAccountId,LenderName,LenderEmail,SalePrice,Commission,
PayoutAmount,PropertyAddress,DestinationCity,DestinationState,TransactionType,
CloseDate,IsDeleted,CreatedDate,LastModifiedDate
```

### Step 3: Review Delta Files

Before running migrations, review the delta files:

```bash
# Count new records
wc -l data/cleaned/*-delta.csv

# Spot check a few records
head -5 data/cleaned/data-cleaned-agents-delta.csv
```

Expected: ~30-40 total new records across all types.

### Step 4: Run Migrations

**Option A: Append to existing cleaned files**

```bash
# Append delta records to existing files (skip header)
tail -n +2 data/cleaned/data-cleaned-agents-delta.csv >> data/cleaned/data-cleaned-agents.csv
tail -n +2 data/cleaned/data-cleaned-lenders-delta.csv >> data/cleaned/data-cleaned-lenders.csv
tail -n +2 data/cleaned/data-cleaned-customers-delta.csv >> data/cleaned/data-cleaned-customers.csv
tail -n +2 data/cleaned/data-cleaned-relationships-delta.csv >> data/cleaned/data-cleaned-relationships.csv

# Run V2 migrations (they skip existing salesforce_ids)
npx tsx scripts/migrate-agents-v2.ts
npx tsx scripts/migrate-lenders-v2.ts
npx tsx scripts/migrate-customers-v2.ts
npx tsx scripts/migrate-customer-deals-v2.ts
npx tsx scripts/migrate-agent-onboarding-v2.ts
npx tsx scripts/migrate-lender-onboarding-v2.ts
```

**Option B: Temporarily replace files**

```bash
# Backup existing
cp data/cleaned/data-cleaned-agents.csv data/cleaned/data-cleaned-agents.csv.bak

# Replace with delta only
cp data/cleaned/data-cleaned-agents-delta.csv data/cleaned/data-cleaned-agents.csv

# Run migration
npx tsx scripts/migrate-agents-v2.ts

# Restore backup + append new records
mv data/cleaned/data-cleaned-agents.csv.bak data/cleaned/data-cleaned-agents.csv
tail -n +2 data/cleaned/data-cleaned-agents-delta.csv >> data/cleaned/data-cleaned-agents.csv
```

### Step 5: Verify

```bash
# Check new totals
npx tsx scripts/check-attio-data.ts
```

---

## Helper Script: Export Existing Attio IDs

Create this script to get IDs for exclusion:

```typescript
// scripts/export-attio-ids.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const { attio } = await import('../lib/attio');
  
  const objects = ['agents', 'lenders', 'customers'];
  
  for (const obj of objects) {
    let allRecords: any[] = [];
    let offset = 0;
    const limit = 500;
    
    while (true) {
      const batch = await attio.queryRecords(obj, { limit, offset });
      allRecords = allRecords.concat(batch);
      if (batch.length < limit) break;
      offset += limit;
    }
    
    const ids = allRecords
      .map(r => r.salesforce_id)
      .filter(Boolean);
    
    fs.writeFileSync(
      `data/attio-${obj}-ids.txt`,
      ids.join('\n')
    );
    
    console.log(`Exported ${ids.length} ${obj} IDs`);
  }
}

main().catch(console.error);
```

Run with: `npx tsx scripts/export-attio-ids.ts`

---

## Troubleshooting

### Duplicate Email Errors

If migration fails with duplicate email:
1. Check `data-cleaned-duplicates.csv` from cleaning process
2. Decide which record to keep
3. Remove duplicate from delta file

### Phone Format Errors

Attio requires E.164 format. If you see phone errors:
1. Check the phone value in delta CSV
2. Ensure format is `+1XXXXXXXXXX` (no spaces, dashes, parentheses)
3. Fix in CSV and re-run

### Missing References

If deals fail due to missing agent/customer:
1. Ensure agents/lenders/customers are migrated first
2. Check that the referenced `salesforce_id` exists in Attio
3. May need to manually add the missing record

---

## Timeline Estimate

| Step | Time |
|------|------|
| Salesforce export | 10 min |
| Claude Cowork cleaning | 15-30 min |
| Review delta files | 5 min |
| Run migrations | 10-15 min |
| Verify | 5 min |
| **Total** | **~1 hour** |

---

## Related Documents

- [CUTOVER-PLAN.md](./CUTOVER-PLAN.md) - Full cutover checklist including Attio workflows
- [migration/LLD.md](./migration/LLD.md) - Technical details on data model and scripts
- [migration/PRD.md](./migration/PRD.md) - Business requirements and success metrics
