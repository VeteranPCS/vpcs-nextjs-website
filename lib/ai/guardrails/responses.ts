import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

/**
 * Render a canned refusal as a UI message stream so the existing useChat widget
 * shows it as a normal assistant turn — same response shape as a real turn, but
 * with no model call.
 */
export function buildBlockedResponse(message: string, sessionId: string): Response {
  const stream = createUIMessageStream({
    execute({ writer }) {
      const id = 'guardrail-block';
      writer.write({ type: 'text-start', id });
      writer.write({ type: 'text-delta', id, delta: message });
      writer.write({ type: 'text-end', id });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { 'X-Session-Id': sessionId },
  });
}
