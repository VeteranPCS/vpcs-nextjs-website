import { INJECTION_SIGNATURES, MAX_INPUT_CHARS } from '@/lib/ai/guardrails/config';
import type { GuardrailDecision } from '@/lib/ai/guardrails/types';

/** Returns the source of the first matching injection signature, or null. */
export function matchInjectionSignature(text: string): string | null {
  for (const re of INJECTION_SIGNATURES) {
    if (re.test(text)) return re.source;
  }
  return null;
}

/**
 * Deterministic Tier-0 checks. Returns a blocking decision for unambiguous abuse,
 * or null to defer the (fuzzy) judgment to the Tier-1 classifier.
 *
 * `enforceSizeLimit` (default true) gates the `MAX_INPUT_CHARS` cap. That cap bounds
 * the size of *user* input; it must NOT be applied to assistant history, which the
 * model legitimately produces longer than the cap and which `useChat` resends on the
 * next turn — capping it there would refuse an otherwise-valid follow-up. Assistant
 * turns still get the injection-signature scan (a forged assistant turn could carry a
 * jailbreak), just not the size gate.
 */
export function runHeuristics(
  text: string,
  options?: { enforceSizeLimit?: boolean },
): GuardrailDecision | null {
  const enforceSizeLimit = options?.enforceSizeLimit ?? true;
  if (enforceSizeLimit && text.length > MAX_INPUT_CHARS) {
    return {
      action: 'block',
      category: 'oversize',
      tier: 0,
      reason: `input exceeds ${MAX_INPUT_CHARS} chars`,
    };
  }

  const signature = matchInjectionSignature(text);
  if (signature) {
    return {
      action: 'block',
      category: 'injection',
      tier: 0,
      reason: `matched signature: ${signature}`,
    };
  }

  return null;
}
