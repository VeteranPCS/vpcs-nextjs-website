import 'server-only';
import { Redis } from '@upstash/redis';
import { resolveUpstashRedisEnv } from '@/lib/upstash-env';

export const INTAKE_REOPENING_KEY = 'vpcs:production:maintenance:2026-11-08:reopened';

export type IntakeRedisRead = {
  ok: true;
  flag: 'absent' | 'open' | 'closed';
  elapsedMs: number;
} | {
  ok: false;
  failure: 'missing_credentials' | 'read_failed' | 'timeout';
  elapsedMs: number;
};

/** Shared by the guard and authenticated diagnostic. Only a fixed-key GET is possible. */
export async function readIntakeReopeningFlag(): Promise<IntakeRedisRead> {
  const started = performance.now();
  const elapsedMs = () => Math.ceil(performance.now() - started);
  const env = resolveUpstashRedisEnv();
  if (!env) {
    return { ok: false, failure: 'missing_credentials', elapsedMs: elapsedMs() };
  }
  // Fresh for each read, including the second guard immediately before Web-to-Lead.
  const signal = AbortSignal.timeout(1_000);
  try {
    const redis = new Redis({
      url: env.url,
      token: env.token,
      // This SDK version maps retry:false to one retry. Explicit zero means one attempt.
      retry: { retries: 0 },
      cache: 'no-store',
      signal: () => signal,
      enableTelemetry: false,
      enableAutoPipelining: false,
      automaticDeserialization: false,
    });
    const value = await redis.get(INTAKE_REOPENING_KEY);
    return { ok: true, flag: value === null ? 'absent' : value === 'open' ? 'open' : 'closed', elapsedMs: elapsedMs() };
  } catch {
    // Provider errors can contain credential-bearing URLs. Never log the exception.
    return { ok: false, failure: signal.aborted ? 'timeout' : 'read_failed', elapsedMs: elapsedMs() };
  }
}

/** No cached decision or retries: every guard must observe the operator's current flag. */
export async function isIntakeExplicitlyReopened(): Promise<boolean> {
  const result = await readIntakeReopeningFlag();
  if (!result.ok) console.warn(`[intake-maintenance] ${result.failure}`);
  return result.ok && result.flag === 'open';
}
