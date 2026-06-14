import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateObject } from 'ai';
import { classifyInput } from '@/lib/ai/guardrails/classifier';

vi.mock('ai', () => ({ generateObject: vi.fn() }));

const mockedGenerateObject = vi.mocked(generateObject);

describe('classifyInput', () => {
  beforeEach(() => { mockedGenerateObject.mockReset(); });

  it('allows on_topic', async () => {
    mockedGenerateObject.mockResolvedValue({ object: { category: 'on_topic', reason: 'ok' } } as never);
    const d = await classifyInput('find me an agent in Texas');
    expect(d.action).toBe('allow');
    expect(d.tier).toBe(1);
  });

  it('blocks off_topic, injection, and abusive', async () => {
    for (const category of ['off_topic', 'injection', 'abusive'] as const) {
      mockedGenerateObject.mockResolvedValue({ object: { category, reason: category } } as never);
      const d = await classifyInput('whatever');
      expect(d.action).toBe('block');
      expect(d.category).toBe(category);
    }
  });

  it('fails open (allow) when the classifier throws', async () => {
    mockedGenerateObject.mockRejectedValue(new Error('gateway down'));
    const d = await classifyInput('find me an agent');
    expect(d.action).toBe('allow');
    expect(d.reason).toContain('fail-open');
  });
});
