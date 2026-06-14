import { describe, it, expect, vi } from 'vitest';

// buildTools() transitively imports lib/ai/tools/lead-tools, which begins with
// `import 'server-only'` and would throw under Vitest. Mock the module so the
// config builder still works without pulling the server-only graph.
vi.mock('@/lib/ai/tools', () => ({
  buildTools: () => ({
    getAgentsForState: { description: 'mock' },
    submitAgentRequest: { description: 'mock' },
  }),
}));

import { buildConciergeConfig, extractLatestUserText, extractAllUserText } from '@/lib/ai/run-concierge';
import type { UIMessage } from 'ai';

describe('buildConciergeConfig', () => {
  it('uses the chat model and brand-voice system prompt by default', () => {
    const config = buildConciergeConfig();
    expect(config.model).toBe('anthropic/claude-sonnet-4.6');
    expect(config.system).toContain('VeteranPCS Concierge');
    expect(config.tools).toHaveProperty('getAgentsForState');
    expect(config.stopWhen).toBeDefined();
  });

  it('accepts a tools override (used by evals)', () => {
    const fake = { onlyTool: { description: 'x' } } as never;
    const config = buildConciergeConfig({ tools: fake });
    expect(config.tools).toBe(fake);
  });

  it('threads pageContext into the system prompt', () => {
    const config = buildConciergeConfig({ pageContext: { state: 'Texas' } });
    expect(config.system).toContain('Texas');
  });
});

describe('extractLatestUserText', () => {
  const msg = (role: string, text: string): UIMessage =>
    ({ role, parts: [{ type: 'text', text }] }) as unknown as UIMessage;

  it('returns the text of the last user message', () => {
    const messages = [msg('user', 'first'), msg('assistant', 'reply'), msg('user', 'second')];
    expect(extractLatestUserText(messages)).toBe('second');
  });

  it('joins multiple text parts of the latest user message', () => {
    const m = { role: 'user', parts: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } as unknown as UIMessage;
    expect(extractLatestUserText([m])).toBe('a b');
  });

  it('returns empty string when there is no user text', () => {
    expect(extractLatestUserText([msg('assistant', 'hi')])).toBe('');
    expect(extractLatestUserText([])).toBe('');
  });
});

describe('extractAllUserText', () => {
  const msg = (role: string, text: string): UIMessage =>
    ({ role, parts: [{ type: 'text', text }] }) as unknown as UIMessage;

  it('returns the text of every user turn in order, skipping assistant turns', () => {
    const messages = [msg('user', 'first'), msg('assistant', 'reply'), msg('user', 'second')];
    expect(extractAllUserText(messages)).toEqual(['first', 'second']);
  });

  it('skips user turns that contain no text part', () => {
    const empty = { role: 'user', parts: [{ type: 'image' }] } as unknown as UIMessage;
    expect(extractAllUserText([msg('user', 'hello'), empty, msg('user', 'world')])).toEqual([
      'hello',
      'world',
    ]);
  });

  it('throws when a user message has non-array parts (so the route can 400 it)', () => {
    const malformed = { role: 'user', parts: 'not-an-array' } as unknown as UIMessage;
    expect(() => extractAllUserText([malformed])).toThrow();
  });
});
