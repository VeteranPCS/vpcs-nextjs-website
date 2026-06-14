import { describe, it, expect, vi, beforeEach } from 'vitest';

// Single fake cookie jar; each test drives jar.get's return value.
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => jar) }));

import { getOrCreateSessionId } from '@/lib/ai/session';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(() => {
  jar.get.mockReset();
  jar.set.mockReset();
});

describe('getOrCreateSessionId', () => {
  it('rejects a non-UUID cookie value and mints a fresh session', async () => {
    jar.get.mockReturnValue({ value: '../../etc/passwd' });

    const { sessionId, isNew } = await getOrCreateSessionId();

    expect(sessionId).not.toBe('../../etc/passwd');
    expect(sessionId).toMatch(UUID_V4_RE);
    expect(isNew).toBe(true);
    expect(jar.set).toHaveBeenCalledWith(
      'vpcs_concierge_sid',
      sessionId,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('accepts a valid UUID v4 cookie unchanged', async () => {
    const valid = '550e8400-e29b-41d4-a716-446655440000';
    jar.get.mockReturnValue({ value: valid });

    const { sessionId, isNew } = await getOrCreateSessionId();

    expect(sessionId).toBe(valid);
    expect(isNew).toBe(false);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('mints a fresh session when no cookie is present', async () => {
    jar.get.mockReturnValue(undefined);

    const { sessionId, isNew } = await getOrCreateSessionId();

    expect(sessionId).toMatch(UUID_V4_RE);
    expect(isNew).toBe(true);
  });
});
