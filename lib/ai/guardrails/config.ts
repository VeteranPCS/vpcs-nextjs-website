/** Hard cap on a single user message (chars). Longer = blocked at Tier 0. */
export const MAX_INPUT_CHARS = 4000;

/** Per-session cumulative token budget per rolling day (LLM10 backstop). */
export const DAILY_TOKEN_CAP = 200_000;

/** Brand-voice refusal returned when input is blocked. Calm, plain, no emoji. */
export const REFUSAL_MESSAGE =
  "I can only help with PCS moves — finding a military-friendly real estate agent or VA-loan lender, BAH, VA loans, and getting settled at your next duty station. Tell me where you're headed and I'll help.";

/**
 * Unambiguous prompt-injection / jailbreak phrases. Tier 0 hard-blocks these
 * regardless of phrasing nuance; subtler cases fall through to the Tier-1 classifier.
 */
export const INJECTION_SIGNATURES: RegExp[] = [
  /ignore (?:all )?(?:your |the )?previous instructions/i,
  /disregard (?:all )?(?:your |the )?(?:previous|above) instructions/i,
  /reveal (?:your |the )?(?:system )?prompt/i,
  /show me (?:your |the )?(?:system )?prompt/i,
  /what (?:is|are) your (?:system )?(?:prompt|instructions)\b/i,
  /you are now (?:a |an )?[a-z]/i,
  /\bact as (?:a |an )?(?:dan|jailbreak|unrestricted)/i,
  /\bdeveloper mode\b/i,
  /override (?:your |the )?(?:safety|guardrails|rules)/i,
];

/** Kill-switch mirror of LEAD_SPAM_ENFORCED: any value but "0" = enforced. */
export function guardrailsEnforced(): boolean {
  return process.env.GUARDRAILS_ENFORCED !== '0';
}
