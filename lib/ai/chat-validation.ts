import { z } from 'zod';
import type { UIMessage } from 'ai';
import type { PageContext } from '@/lib/ai/system-prompt';

/**
 * Runtime validation + sanitization for the concierge chat endpoint.
 *
 * Goals:
 * - Bound the request envelope (message count) to limit token-cost / DoS abuse.
 * - Validate each message LOOSELY (object with a string `role`) so genuine
 *   `UIMessage[]` payloads from `@ai-sdk/react` still pass and remain consumable
 *   by `convertToModelMessages` (we do NOT deep-validate message parts).
 * - Neutralize client-supplied `pageContext` strings as a prompt-injection
 *   channel by stripping control chars / newlines and clamping length.
 */

/** Cap on conversation length to bound token cost. */
export const MAX_MESSAGES = 50;
/** Cap on each sanitized page-context string field. */
export const MAX_PAGE_CONTEXT_FIELD_LENGTH = 200;

// Matches C0 control chars (U+0000-U+001F), DEL (U+007F) and C1 control
// chars (U+0080-U+009F). This covers newlines, carriage returns and tabs —
// the characters an attacker would use to break out of the prompt context.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]+/g;

// Zero-width and BOM characters: invisible, and they survive both the control-char
// filter and the whitespace collapse (none are JS `\s`). Strip them outright so they
// can't pad/obfuscate or smuggle content into the system prompt.
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

// Per-message schema. `role` is restricted to the values a browser chat client may
// legitimately send. The system prompt is set server-side via `buildSystemPrompt`, so a
// client-supplied `system` (or any other) role is a prompt-injection vector — and the AI
// SDK's `convertToModelMessages` would faithfully forward it to the model — so we reject
// it at the boundary with a 400. Everything else (id, parts, content, ...) passes through
// untouched via `.loose()` so the SDK still receives the full UIMessage shape.
const messageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
  })
  .loose();

const pageContextSchema = z
  .object({
    path: z.string().optional(),
    state: z.string().optional(),
    topic: z.string().optional(),
  })
  .loose()
  .optional();

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  pageContext: pageContextSchema,
});

/**
 * Strip control characters and newlines, collapse runs of whitespace, trim, and
 * clamp length. Returns `undefined` when the field is missing or sanitizes to
 * an empty string so the prompt builder can skip it cleanly.
 */
function sanitizeField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(CONTROL_CHARS, ' ')
    .replace(ZERO_WIDTH_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PAGE_CONTEXT_FIELD_LENGTH)
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Produce a clean `PageContext` from untrusted client input. Only the known
 * fields are carried through, each sanitized; unknown fields are dropped.
 */
export function sanitizePageContext(pc: unknown): PageContext | undefined {
  if (!pc || typeof pc !== 'object') return undefined;
  const raw = pc as Record<string, unknown>;
  const clean: PageContext = {};
  const path = sanitizeField(raw.path);
  const state = sanitizeField(raw.state);
  const topic = sanitizeField(raw.topic);
  if (path) clean.path = path;
  if (state) clean.state = state;
  if (topic) clean.topic = topic;
  return clean.path || clean.state || clean.topic ? clean : undefined;
}

export interface ParsedChatRequest {
  messages: UIMessage[];
  pageContext?: PageContext;
}

export type ParseChatRequestResult =
  | { ok: true; data: ParsedChatRequest }
  | { ok: false; error: string };

/**
 * Validate a raw (already JSON-parsed) request body and sanitize its
 * `pageContext`. On success the messages are returned unchanged (cast back to
 * `UIMessage[]` for the AI SDK) and `pageContext` is the sanitized value.
 */
export function parseChatRequest(raw: unknown): ParseChatRequestResult {
  const result = chatRequestSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const error = first
      ? `${first.path.join('.') || 'body'}: ${first.message}`
      : 'Invalid request body';
    return { ok: false, error };
  }

  return {
    ok: true,
    data: {
      messages: result.data.messages as unknown as UIMessage[],
      pageContext: sanitizePageContext(result.data.pageContext),
    },
  };
}
