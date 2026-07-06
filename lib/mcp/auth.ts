import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { logError } from '@/services/loggingService';

/**
 * Structural subset of the MCP SDK's `AuthInfo` — the fields `withMcpAuth`
 * requires. Declared locally so we don't depend on the SDK's deep subpath export.
 */
interface McpAuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
}

/**
 * Server-side kill-switch for the MCP route. Defaults OFF: the route 404s unless
 * `MCP_ENABLED` is explicitly `'1'` or `'true'`. Deliberately NOT a
 * `NEXT_PUBLIC_` flag — the MCP surface must never be togglable from the client
 * bundle.
 */
export function mcpEnabled(): boolean {
  const flag = process.env.MCP_ENABLED;
  return flag === '1' || flag === 'true';
}

/**
 * Fail-closed guard: the route is enabled but no bearer token is configured. In
 * that state `withMcpAuth` would have nothing to verify against, so the route must
 * refuse (503) rather than serve traffic — the flag being on must never imply open.
 */
export function mcpMisconfigured(): boolean {
  return mcpEnabled() && !process.env.MCP_AUTH_TOKEN;
}

/**
 * Constant-time bearer check against `MCP_AUTH_TOKEN`.
 *
 * Returns an `AuthInfo` on an exact match and `undefined` otherwise. Paired with
 * `withMcpAuth(..., { required: true })`, an `undefined` return becomes a 401 — so
 * this both authenticates valid callers and rejects everyone else. Fails closed
 * when the token env is unset. The length pre-check is required because
 * `timingSafeEqual` throws on unequal-length buffers; the compare itself is
 * constant-time for equal lengths.
 */
export function verifyMcpToken(bearer?: string): McpAuthInfo | undefined {
  const expected = process.env.MCP_AUTH_TOKEN;
  if (!expected || !bearer) return undefined;

  const provided = Buffer.from(bearer);
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return undefined;
  if (!timingSafeEqual(provided, secret)) return undefined;

  return { token: bearer, clientId: 'mcp-client', scopes: [] };
}

/**
 * Tool-handler error result. Logs the real error server-side and returns a GENERIC
 * message to the client — the raw `error.message` (SOQL fragments, stack detail,
 * upstream URLs) must never reach an MCP caller.
 */
export function mcpErrorResult(error: unknown) {
  logError('MCP tool error', undefined, error);
  return { content: [{ type: 'text' as const, text: 'Error: unable to complete the request.' }] };
}
