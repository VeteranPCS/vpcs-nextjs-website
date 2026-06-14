import { describe, it, expect } from 'vitest';
import { buildBlockedResponse } from '@/lib/ai/guardrails/responses';

describe('buildBlockedResponse', () => {
  it('returns a 200 streaming Response carrying the session header', () => {
    const res = buildBlockedResponse('No can do.', 'sid-123');
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Session-Id')).toBe('sid-123');
  });
});
