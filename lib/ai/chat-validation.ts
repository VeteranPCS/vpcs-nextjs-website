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

// The AI SDK marks a UIMessage part as a tool part when its `type` starts with
// `tool-` (`tool-call`, `tool-result`, `tool-<name>`, ...) or equals `dynamic-tool`
// (see ai's `isToolUIPart`/`isDynamicToolUIPart`). A browser user turn never
// legitimately carries these — a client that sends one is trying to forge a tool
// call/result and smuggle fabricated data (e.g. a bogus BAH rate) into the model
// context — so we reject the whole request. Assistant turns are handled separately
// (stripped, not rejected) because `useChat` resends prior tool calls verbatim.
function isToolPartType(type: unknown): boolean {
  return typeof type === 'string' && (type.startsWith('tool-') || type === 'dynamic-tool');
}

function hasToolPart(message: unknown): boolean {
  const parts = (message as { parts?: unknown })?.parts;
  if (!Array.isArray(parts)) return false;
  return parts.some((p) => isToolPartType((p as { type?: unknown })?.type));
}

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
  .loose()
  .superRefine((message, ctx) => {
    if (message.role === 'user' && hasToolPart(message)) {
      ctx.addIssue({
        code: 'custom',
        message: 'user messages must not contain tool parts',
      });
    }
  });

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
  analyticsContext: z.unknown().optional(),
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

function sanitizeAttributionSnapshot(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const clean: Record<string, string> = {};
  for (const key of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'gbraid',
    'wbraid',
    'fbclid',
    'msclkid',
    'referrer_domain',
    'landing_page_path',
    'captured_at',
  ]) {
    const safe = sanitizeField(raw[key]);
    if (safe) clean[key] = safe;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export function sanitizeAnalyticsContext(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  const visitorId = sanitizeField(raw.vpcs_visitor_id);
  const sourcePagePath = sanitizeField(raw.source_page_path);
  const firstTouch = sanitizeAttributionSnapshot(raw.first_touch_attribution);
  const lastTouch = sanitizeAttributionSnapshot(raw.last_touch_attribution);

  if (visitorId?.startsWith('vpcs_')) clean.vpcs_visitor_id = visitorId;
  if (sourcePagePath?.startsWith('/')) clean.source_page_path = sourcePagePath;
  if (firstTouch) clean.first_touch_attribution = firstTouch;
  if (lastTouch) clean.last_touch_attribution = lastTouch;

  for (const key of [
    'pageview_count_before_conversion',
    'cta_click_count_before_conversion',
    'form_attempt_count_before_conversion',
  ]) {
    const numeric = Number(raw[key]);
    if (Number.isFinite(numeric) && numeric >= 0) clean[key] = Math.floor(numeric);
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

export interface ParsedChatRequest {
  messages: UIMessage[];
  pageContext?: PageContext;
  analyticsContext?: Record<string, unknown>;
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
      analyticsContext: sanitizeAnalyticsContext(result.data.analyticsContext),
    },
  };
}

// The AI SDK tool-approval flow (tools with `needsApproval: true`, e.g. the lead
// submit tools) round-trips the approval decision THROUGH the assistant transcript:
// after the user clicks "Yes, send it", `useChat` resends the assistant turn with
// its `tool-*` part in `approval-responded` state, and `convertToModelMessages` needs
// that part to emit the `tool-approval-response` that actually runs the tool
// server-side. These two handshake states carry only the approve/deny decision —
// never fabricated tool OUTPUT (the real output is produced server-side AFTER
// approval) — so preserving them cannot smuggle forged data into the model, unlike
// an `output-available` part. `input-*`/`output-*` states stay stripped.
const APPROVAL_HANDSHAKE_STATES = new Set(['approval-requested', 'approval-responded']);

function isApprovalHandshakePart(part: unknown): boolean {
  const p = part as { type?: unknown; state?: unknown };
  return (
    isToolPartType(p?.type)
    && typeof p?.state === 'string'
    && APPROVAL_HANDSHAKE_STATES.has(p.state)
  );
}

/**
 * Reduce every assistant message to its plain-text parts (plus the approval
 * handshake) before the model runs.
 *
 * `useChat` resends the full transcript from cookie-scoped memory, so the client
 * controls the assistant turns it echoes back. An attacker can forge assistant
 * content — tool-call / tool-result parts that fabricate data, reasoning blocks,
 * files — and the model would treat it as its own prior output. We cannot reject
 * assistant messages (the resent transcript is legitimate), so we strip them: only
 * `text` parts survive, PLUS `tool-*` parts in an approval-handshake state
 * (`approval-requested` / `approval-responded`) — those are required for
 * approval-gated tools (lead submission) to execute and carry no fabricated output.
 * Every other non-text part is dropped. An assistant turn that was nothing but a
 * forged tool result collapses to an empty `parts: []`, which
 * `convertToModelMessages` safely skips.
 *
 * TODO(security): the durable fix is a server-held / signed transcript so the client
 * can't author assistant history at all. This strip is the Phase-2 mitigation while
 * memory stays cookie-scoped; see remediation item 2.3.
 */
export function stripAssistantMessageParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== 'assistant') return message;
    const parts = (message as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) return message;
    const keptParts = parts.filter((p) => {
      const type = (p as { type?: unknown })?.type;
      if (type === 'text' && typeof (p as { text?: unknown }).text === 'string') {
        return true;
      }
      return isApprovalHandshakePart(p);
    });
    return { ...message, parts: keptParts } as UIMessage;
  });
}
