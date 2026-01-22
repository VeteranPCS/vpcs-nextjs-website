---
event: PreToolUse
tools:
  - Write
  - Edit
match_content:
  - "attio.queryRecords"
  - "filter:"
  - "$contains"
  - "$in: areaIds"
  - "$in: stateIds"
  - "id: {"
---

# Attio Query Validator Hook

Before writing or editing Attio query code, validate against these common mistakes:

## Check for These Anti-Patterns

### 1. $contains on Record-Reference Fields
**WRONG:** `{ lenders: { $contains: id } }` or `{ lenders: { target_record_id: { $contains: id } } }`
**FIX:** Use bidirectional references. Query `Lender.states` instead of trying to query "states containing lender X"

### 2. Filtering by Internal `id` Field  
**WRONG:** `{ id: { $in: recordIds } }`
**FIX:** Use `Promise.all(ids.map(id => attio.getRecord(...))`

### 3. Record-Reference Missing Nested Syntax
**WRONG:** `{ agent: agentId }`
**CORRECT:** `{ agent: { target_record_id: { $eq: agentId } } }`

### 4. Missing target_object in References
**WRONG:** `{ target_record_id: 'uuid' }`
**CORRECT:** `{ target_object: 'agents', target_record_id: 'uuid' }`

## If Writing a Query, Confirm:

1. Record-reference filters use `{ field: { target_record_id: { $eq: id } } }` syntax
2. Not using `$contains` on record-reference fields
3. Not filtering by `id` field directly
4. Reference values include `target_object`

## Recommendation

If the code contains any of the above anti-patterns, STOP and:
1. Explain the issue to the user
2. Refer to CLAUDE.md Attio API Notes (#17-19)
3. Suggest the correct approach
