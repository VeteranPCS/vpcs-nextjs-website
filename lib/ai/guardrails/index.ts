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
    // Leave a trace so flipping the kill-switch in production is visible in logs.
    logInfo('Guardrails disabled — GUARDRAILS_ENFORCED=0', { sessionId: ctx.sessionId });
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
  // Log the decision metadata, never the raw message body (privacy rule). The
  // `reason` is only safe for Tier 0, where it's a code-authored constant (matched
  // signature name / size limit). Tier-1 reasons are free text from the Haiku
  // classifier and frequently paraphrase or quote the user's input — so they're
  // omitted to avoid leaking user content (incl. PII) into the log stream.
  const payload: Record<string, unknown> = {
    action: decision.action,
    category: decision.category,
    tier: decision.tier,
    sessionId: ctx.sessionId,
  };
  if (decision.tier === 0) payload.reason = decision.reason;
  logInfo('Guardrail decision', payload);
  return decision;
}
