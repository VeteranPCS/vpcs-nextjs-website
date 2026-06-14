import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

const COOKIE_NAME = 'vpcs_concierge_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// The id is server-minted via randomUUID() (always v4), so anything that isn't a
// v4 UUID was hand-crafted by the client. Reject it and mint a fresh one rather
// than trusting attacker-controlled cookie text downstream (e.g. as a Redis key).
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getOrCreateSessionId(): Promise<{ sessionId: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing && UUID_V4_RE.test(existing)) return { sessionId: existing, isNew: false };

  const sessionId = randomUUID();
  jar.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return { sessionId, isNew: true };
}
