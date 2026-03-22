# Attio API Development Skill

Use when writing, editing, or debugging Attio CRM API code in this codebase.

## When to Use

- Writing Attio API queries or filters
- Creating or updating records, list entries, or pipelines
- Building webhook handlers
- Writing migration or setup scripts
- Debugging Attio API errors

## Before Writing Attio Code

**STOP and read `.claude/references/attio-api-reference.md` first.** It contains every API gotcha discovered during the migration.

The top 5 bugs to check for:

1. **Missing `target_object`** in record references → `{ target_object: 'agents', target_record_id: id }`
2. **Flat record-ref filters** → Must use `{ field: { target_record_id: { $eq: id } } }`
3. **Using `$contains`** on record-reference fields → Not supported, use bidirectional refs
4. **Filtering by `id` field** → Not queryable, use `Promise.all(ids.map(getRecord))`
5. **Wrong stage syntax** → Must be `entry_values.stage = { status: 'Stage Name' }`

## Key Files

- `lib/attio.ts` — API client with all methods
- `lib/attio-people.ts` — People record upsert (dedup by email)
- `lib/attio-schema.ts` — Schema type definitions
- `lib/attio-data-loader.ts` — Cached data loader
- `app/api/webhooks/attio/route.ts` — Webhook handler

## Script Environment

Scripts that import from `lib/attio.ts` must use dynamic imports after `dotenv.config()`. Static imports are hoisted before env vars load. See reference file for pattern.
