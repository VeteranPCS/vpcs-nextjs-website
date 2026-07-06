import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/rate-limit', () => ({
  mcpLimiter: { limit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: 0 })) },
}));
vi.mock('@/lib/spam-protection', () => ({ ipFromHeaders: vi.fn(() => '9.9.9.9') }));
vi.mock('@/services/loggingService', () => ({ logError: vi.fn(), logInfo: vi.fn() }));
// stateService + blog are imported at module top; stub them so no CMS/SF client loads.
vi.mock('@/services/stateService', () => ({
  default: {
    fetchStateList: vi.fn(),
    fetchStateDetails: vi.fn(),
    fetchAgentsListByState: vi.fn(),
    fetchLendersListByState: vi.fn(),
  },
}));
vi.mock('@/lib/blog/mdx', () => ({ getBlogBySlug: vi.fn(), searchBlogs: vi.fn() }));

import { GET, POST, DELETE } from '@/app/api/mcp/[transport]/route';
import { mcpLimiter } from '@/lib/rate-limit';

type Handler = (req: Request) => Promise<Response>;
const handlers: Record<string, Handler> = { GET, POST, DELETE };

const mcpReq = (method: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/mcp/mcp', { method, headers });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(mcpLimiter.limit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
});

describe('MCP route — flag gate', () => {
  it('404s when MCP_ENABLED is unset (default OFF)', async () => {
    const res = await POST(mcpReq('POST'));
    expect(res.status).toBe(404);
    expect(mcpLimiter.limit).not.toHaveBeenCalled();
  });

  it('404s when MCP_ENABLED is "0"', async () => {
    vi.stubEnv('MCP_ENABLED', '0');
    const res = await POST(mcpReq('POST'));
    expect(res.status).toBe(404);
  });
});

describe('MCP route — fail closed', () => {
  it('503s when enabled but MCP_AUTH_TOKEN is unset (flag on + no token, never open)', async () => {
    vi.stubEnv('MCP_ENABLED', '1');
    const res = await POST(mcpReq('POST', { Authorization: 'Bearer whatever' }));
    expect(res.status).toBe(503);
    expect(mcpLimiter.limit).not.toHaveBeenCalled();
  });
});

describe('MCP route — rate limit', () => {
  it('429s when over the IP rate limit', async () => {
    vi.stubEnv('MCP_ENABLED', '1');
    vi.stubEnv('MCP_AUTH_TOKEN', 'secret');
    vi.mocked(mcpLimiter.limit).mockResolvedValue({
      success: false, limit: 10, remaining: 0, reset: Date.now() + 1000,
    });
    const res = await POST(mcpReq('POST', { Authorization: 'Bearer secret' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('MCP route — auth (withMcpAuth required:true)', () => {
  it.each(['GET', 'POST', 'DELETE'])('401s a bad bearer on %s', async (method) => {
    vi.stubEnv('MCP_ENABLED', '1');
    vi.stubEnv('MCP_AUTH_TOKEN', 'secret');
    const res = await handlers[method]!(mcpReq(method, { Authorization: 'Bearer wrong-token' }));
    expect(res.status).toBe(401);
  });

  it.each(['GET', 'POST', 'DELETE'])('401s a missing bearer on %s (fail-closed, not open)', async (method) => {
    vi.stubEnv('MCP_ENABLED', '1');
    vi.stubEnv('MCP_AUTH_TOKEN', 'secret');
    const res = await handlers[method]!(mcpReq(method));
    expect(res.status).toBe(401);
  });
});
