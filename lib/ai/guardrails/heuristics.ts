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
 */
export function runHeuristics(text: string): GuardrailDecision | null {
  if (text.length > MAX_INPUT_CHARS) {
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
