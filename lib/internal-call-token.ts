import { randomUUID } from 'node:crypto';

/**
 * A secret generated once per server process, used to mark *trusted server-internal*
 * callers of the `'use server'` lead-capture actions in
 * `services/salesForcePostFormsService.tsx`.
 *
 * Why this exists: those form functions are server actions, so the browser can invoke
 * them across the RPC boundary with arbitrary arguments. A plain boolean "skip captcha"
 * flag or a `formData` field would therefore be forgeable by a hostile client. This
 * token is NEVER serialized to the client (it lives only in server memory), so a forged
 * server-action call cannot supply it — making it a safe trust signal.
 *
 * The only legitimate user is the AI concierge lead tools (`lib/ai/tools/lead-tools.ts`),
 * which call the form functions as a direct in-process import (server → server) and are
 * themselves protected by BotID + rate limiting + the `needsApproval` human-in-the-loop
 * confirmation, so the browser-only reCAPTCHA gate is redundant there.
 *
 * Stored on `globalThis` (not just a module-level const) so the value is stable even if
 * the bundler emits more than one copy of this module across server chunks.
 */
const TOKEN_KEY = '__vpcsInternalCallToken__';

const globalWithToken = globalThis as unknown as Record<string, string | undefined>;

if (!globalWithToken[TOKEN_KEY]) {
  globalWithToken[TOKEN_KEY] = randomUUID();
}

export const INTERNAL_CALL_TOKEN: string = globalWithToken[TOKEN_KEY] as string;

export interface InternalCallOptions {
  /** Pass `INTERNAL_CALL_TOKEN` to mark a trusted server-internal call (bypasses the browser captcha gate). */
  internalCallToken?: string;
}

/** True only for a server-internal caller holding the process secret. */
export function isTrustedInternalCall(options?: InternalCallOptions): boolean {
  return options?.internalCallToken === INTERNAL_CALL_TOKEN;
}
