import { stepCountIs, type ToolSet, type UIMessage } from 'ai';
import { buildTools } from '@/lib/ai/tools';
import { buildSystemPrompt, type PageContext } from '@/lib/ai/system-prompt';
import { MODELS } from '@/lib/ai/models';

export interface ConciergeConfigOpts {
  pageContext?: PageContext;
  /** Override the tool set (evals inject deterministic mock tools). */
  tools?: ToolSet;
}

export interface ConciergeConfig {
  model: string;
  system: string;
  tools: ToolSet;
  stopWhen: ReturnType<typeof stepCountIs>;
}

/**
 * Build the shared model-invocation config for the concierge. Both the streaming
 * route and the (non-streaming) eval driver consume this so they exercise the
 * exact same model, prompt, tools, and step cap.
 */
export function buildConciergeConfig(opts: ConciergeConfigOpts = {}): ConciergeConfig {
  return {
    model: MODELS.chat,
    system: buildSystemPrompt(opts.pageContext),
    tools: opts.tools ?? (buildTools() as ToolSet),
    stopWhen: stepCountIs(12),
  };
}

interface TextPart {
  type: string;
  text?: string;
}

/** Concatenate the text parts of a single message into one trimmed string. */
function joinTextParts(m: UIMessage): string {
  const parts = ((m as { parts?: TextPart[] }).parts ?? []);
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join(' ')
    .trim();
}

/** Concatenate the text parts of the most recent user message. */
export function extractLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const text = joinTextParts(m);
    if (text) return text;
  }
  return '';
}

/**
 * Text of EVERY user turn, in order, dropping turns with no text. Tier-0 guardrail
 * heuristics scan all of these so a multi-turn injection can't hide its payload in
 * an earlier message (the Tier-1 classifier still inspects only the latest turn).
 * Throws on a message whose `parts` isn't an array — callers treat that as a 400.
 */
export function extractAllUserText(messages: UIMessage[]): string[] {
  const out: string[] = [];
  for (const m of messages) {
    if (m.role !== 'user') continue;
    const text = joinTextParts(m);
    if (text) out.push(text);
  }
  return out;
}
