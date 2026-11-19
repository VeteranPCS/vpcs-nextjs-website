import { timingSafeEqual } from 'node:crypto';
import { readIntakeReopeningFlag } from '@/lib/leads/intake-reopening-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      Vary: 'Authorization',
    },
  });
}

/** Operator-only observation: no caller-supplied Redis key, URL, command, or timeout. */
export async function GET(request: Request) {
  const token = process.env.INTAKE_REDIS_CHECK_TOKEN;
  // Fail closed before resolving Redis credentials. A dedicated random token is required.
  if (process.env.VERCEL_ENV !== 'production' || !token || token.length < 32) {
    return reply({ error: 'Not found' }, 404);
  }
  const supplied = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${token}`;
  const receivedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) {
    return reply({ error: 'Unauthorized' }, 401);
  }

  // Intentionally independent of scheduled mode/cutoff, so the exact read can be checked early.
  const result = await readIntakeReopeningFlag();
  const withinBudget = result.ok && result.elapsedMs < 1_000;
  return reply({ ...result, withinBudget, budgetMs: 1_000 }, withinBudget ? 200 : 503);
}
