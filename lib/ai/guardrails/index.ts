import { guardrailsEnforced } from '@/lib/ai/guardrails/config';
import { runHeuristics } from '@/lib/ai/guardrails/heuristics';
import { isOverBudget } from '@/lib/ai/guardrails/budget';
import { classifyInput } from '@/lib/ai/guardrails/classifier';
import { logInfo } from '@/services/loggingService';
import type { GuardrailDecision } from '@/lib/ai/guardrails/types';

export type { GuardrailDecision } from '@/lib/ai/guardrails/types';

export interface GuardrailContext {
  sessionId: string;
}

/**
 * Inspect a single user message before the model runs.
 * Order: kill-switch -> token budget (LLM10) -> Tier-0 heuristics -> Tier-1 classifier.
 * Logs decisions WITHOUT the raw message body (privacy).
 */
export async function evaluateInput(
  text: string,
  ctx: GuardrailContext,
): Promise<GuardrailDecision> {
  if (!guardrailsEnforced()) {
    return { action: 'allow', category: 'clean', tier: 0, reason: 'guardrails-disabled' };
  }

  if (await isOverBudget(ctx.sessionId)) {
    return log({ action: 'block', category: 'budget', tier: 0, reason: 'daily token budget exceeded' }, ctx);
  }

  const heuristic = runHeuristics(text);
  if (heuristic) return log(heuristic, ctx);

  return log(await classifyInput(text), ctx);
}

function log(decision: GuardrailDecision, ctx: GuardrailContext): GuardrailDecision {
  // Logs the decision + signature/reason (never the raw message body — privacy rule).
  // For Tier-0 injection this carries the matched signature name; for Tier 1 the
  // classifier's short explanation. Neither echoes the user's input verbatim.
  logInfo('Guardrail decision', {
    action: decision.action,
    category: decision.category,
    tier: decision.tier,
    reason: decision.reason,
    sessionId: ctx.sessionId,
  });
  return decision;
}
