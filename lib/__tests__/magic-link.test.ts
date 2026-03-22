import * as jwt from 'jsonwebtoken';
import { generateMagicLink, validateMagicLink, extractToken } from '../magic-link';

const SECRET = process.env.MAGIC_LINK_SECRET!;
const BASE_URL = process.env.MAGIC_LINK_BASE_URL!;

describe('generateMagicLink', () => {
  test('returns URL with /portal?token= path', () => {
    const url = generateMagicLink('agent-123', 'deal-456');
    expect(url).toMatch(/\/portal\?token=.+/);
  });

  test('uses MAGIC_LINK_BASE_URL from env', () => {
    const url = generateMagicLink('agent-123', 'deal-456');
    expect(url.startsWith(BASE_URL)).toBe(true);
  });

  test('embeds agent_id, deal_id, type in JWT payload', () => {
    const url = generateMagicLink('agent-123', 'deal-456', 'lender');
    const token = url.split('token=')[1];
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.agent_id).toBe('agent-123');
    expect(decoded.deal_id).toBe('deal-456');
    expect(decoded.type).toBe('lender');
  });

  test('defaults type to agent', () => {
    const url = generateMagicLink('agent-123', 'deal-456');
    const token = url.split('token=')[1];
    const decoded = jwt.verify(token, SECRET) as any;
    expect(decoded.type).toBe('agent');
  });
});

describe('validateMagicLink', () => {
  test('returns valid=true with payload for fresh token', () => {
    const token = jwt.sign(
      { agent_id: 'a1', deal_id: 'd1', type: 'agent' },
      SECRET,
      { expiresIn: '1h' },
    );
    const result = validateMagicLink(token);
    expect(result.valid).toBe(true);
    expect(result.agent_id).toBe('a1');
    expect(result.deal_id).toBe('d1');
    expect(result.type).toBe('agent');
  });

  test('returns valid=false for expired token', () => {
    const token = jwt.sign(
      { agent_id: 'a1', deal_id: 'd1', type: 'agent' },
      SECRET,
      { expiresIn: '0s' },
    );
    // Token is already expired at creation with expiresIn: '0s'
    const result = validateMagicLink(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  test('returns valid=false for tampered token', () => {
    const token = jwt.sign(
      { agent_id: 'a1', deal_id: 'd1', type: 'agent' },
      'wrong-secret',
    );
    const result = validateMagicLink(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  test('returns valid=false for random non-JWT string', () => {
    const result = validateMagicLink('not-a-jwt-at-all');
    expect(result.valid).toBe(false);
  });

  test('returns valid=false for empty string', () => {
    const result = validateMagicLink('');
    expect(result.valid).toBe(false);
  });
});

describe('extractToken', () => {
  test('extracts token from URLSearchParams', () => {
    const params = new URLSearchParams('token=abc123&other=xyz');
    expect(extractToken(params)).toBe('abc123');
  });

  test('returns null when token is missing', () => {
    const params = new URLSearchParams('other=xyz');
    expect(extractToken(params)).toBeNull();
  });
});
