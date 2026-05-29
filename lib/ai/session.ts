import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

const COOKIE_NAME = 'vpcs_concierge_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getOrCreateSessionId(): Promise<{ sessionId: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return { sessionId: existing, isNew: false };

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
