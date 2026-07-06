import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/services/loggingService', () => ({ logError: vi.fn() }));

import { mcpEnabled, mcpMisconfigured, verifyMcpToken, mcpErrorResult } from '@/lib/mcp/auth';
import { logError } from '@/services/loggingService';

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('mcpEnabled', () => {
  it('is off by default and for non-truthy values', () => {
    expect(mcpEnabled()).toBe(false);
    vi.stubEnv('MCP_ENABLED', '0');
    expect(mcpEnabled()).toBe(false);
    vi.stubEnv('MCP_ENABLED', 'yes');
    expect(mcpEnabled()).toBe(false);
  });

  it('is on only for "1" or "true"', () => {
    vi.stubEnv('MCP_ENABLED', '1');
    expect(mcpEnabled()).toBe(true);
    vi.stubEnv('MCP_ENABLED', 'true');
    expect(mcpEnabled()).toBe(true);
  });
});

describe('mcpMisconfigured (fail-closed guard)', () => {
  it('is true when enabled but MCP_AUTH_TOKEN is unset', () => {
    vi.stubEnv('MCP_ENABLED', '1');
    expect(mcpMisconfigured()).toBe(true);
  });

  it('is false when disabled', () => {
    expect(mcpMisconfigured()).toBe(false);
  });

  it('is false when enabled with a token configured', () => {
    vi.stubEnv('MCP_ENABLED', '1');
    vi.stubEnv('MCP_AUTH_TOKEN', 'super-secret-token');
    expect(mcpMisconfigured()).toBe(false);
  });
});

describe('verifyMcpToken (constant-time bearer check)', () => {
  it('returns undefined when the token env is unset (fail-closed)', () => {
    expect(verifyMcpToken('anything')).toBeUndefined();
  });

  it('returns undefined for a missing/empty bearer', () => {
    vi.stubEnv('MCP_AUTH_TOKEN', 'super-secret-token');
    expect(verifyMcpToken(undefined)).toBeUndefined();
    expect(verifyMcpToken('')).toBeUndefined();
  });

  it('returns undefined for a wrong bearer of equal length', () => {
    vi.stubEnv('MCP_AUTH_TOKEN', 'super-secret-token');
    expect(verifyMcpToken('super-secret-tokeX')).toBeUndefined();
  });

  it('returns undefined for a wrong bearer of different length', () => {
    vi.stubEnv('MCP_AUTH_TOKEN', 'super-secret-token');
    expect(verifyMcpToken('short')).toBeUndefined();
  });

  it('returns AuthInfo for the exact token', () => {
    vi.stubEnv('MCP_AUTH_TOKEN', 'super-secret-token');
    expect(verifyMcpToken('super-secret-token')).toEqual({
      token: 'super-secret-token',
      clientId: 'mcp-client',
      scopes: [],
    });
  });
});

describe('mcpErrorResult (no error.message passthrough)', () => {
  it('logs the real error server-side but returns a generic message', () => {
    const real = new Error('SOQL failed: SELECT Secret__c FROM Account WHERE Id=...');
    const result = mcpErrorResult(real);
    expect(result.content[0].text).toBe('Error: unable to complete the request.');
    expect(result.content[0].text).not.toContain('SOQL');
    expect(logError).toHaveBeenCalledWith('MCP tool error', undefined, real);
  });
});
