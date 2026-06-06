import { describe, it, expect } from 'vitest';
import { MODELS } from '@/lib/ai/models';

describe('MODELS', () => {
  it('exposes chat, guardrail, and judge model ids', () => {
    expect(MODELS.chat).toBe('anthropic/claude-sonnet-4-6');
    expect(MODELS.guardrail).toBe('anthropic/claude-haiku-4-5');
    expect(MODELS.judge).toBe('anthropic/claude-haiku-4-5');
  });
});
