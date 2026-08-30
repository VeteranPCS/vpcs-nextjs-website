import 'server-only';

/**
 * Lead-submit dry-run switch.
 *
 * The lead-submit path is deliberately non-idempotent and fires three real outbound
 * side effects (the Salesforce Web-to-Lead POST, the Slack webhook, and the partner
 * OpenPhone SMS), so it cannot be exercised end to end without creating a real Lead
 * and paging a real person. `LEAD_DRY_RUN=1` short-circuits those sinks while every
 * payload-construction, validation, spam, and routing step above them still runs.
 *
 * INVARIANT: this NEVER returns true when `NODE_ENV === 'production'`. The production
 * check lives here, inside the single helper every guard calls, so a guard added later
 * cannot forget it. Do not read `process.env.LEAD_DRY_RUN` anywhere else.
 *
 * Accepted truthy values match the repo's other boolean env flags: '1' or 'true'
 * (case-insensitive). Anything else, including unset, means "not a dry run".
 */
export function isLeadDryRun(): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  const value = process.env.LEAD_DRY_RUN;
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}
