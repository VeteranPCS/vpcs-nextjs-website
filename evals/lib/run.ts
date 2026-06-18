import {
  generateText,
  convertToModelMessages,
  type ToolSet,
  type UIMessage,
} from 'ai';
import { buildConciergeConfig } from '@/lib/ai/run-concierge';
import type { PageContext } from '@/lib/ai/system-prompt';

export interface RunOptions {
  pageContext?: PageContext;
  /** Inject deterministic mock tools to keep the inner loop free + reproducible. */
  tools?: ToolSet;
}

export interface RunResult {
  text: string;
  /** Names of every tool the model called across all steps. */
  toolNames: string[];
  /** Every tool call with the model-provided input. */
  toolCalls: Array<{ toolName: string; input: unknown }>;
  /** Every tool result with the tool output. */
  toolResults: Array<{ toolName: string; output: unknown }>;
  usage: { totalTokens?: number } | undefined;
}

/**
 * Drive the real concierge config with a single user turn (non-streaming).
 * NOTE: in AI SDK v6, result.toolCalls is FINAL-STEP only, so aggregate across
 * result.steps to capture every tool the model called.
 */
export async function runConcierge(userText: string, opts: RunOptions = {}): Promise<RunResult> {
  const config = buildConciergeConfig({ pageContext: opts.pageContext, tools: opts.tools });
  const messages = [
    { role: 'user', parts: [{ type: 'text', text: userText }] },
  ] as unknown as UIMessage[];

  const result = await generateText({
    ...config,
    messages: await convertToModelMessages(messages),
  });

  const toolNames = result.steps.flatMap((step) => step.toolCalls.map((c) => c.toolName));
  const toolCalls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => ({ toolName: call.toolName, input: call.input })),
  );
  const toolResults = result.steps.flatMap((step) =>
    step.toolResults.map((toolResult) => ({
      toolName: toolResult.toolName,
      output: toolResult.output,
    })),
  );
  return { text: result.text, toolNames, toolCalls, toolResults, usage: result.usage };
}
