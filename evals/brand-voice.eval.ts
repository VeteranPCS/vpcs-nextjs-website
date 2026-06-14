import { describe, it, expect, afterAll } from 'vitest';
import { runConcierge } from './lib/run';
import { mockTools } from './lib/mock-tools';
import { judge } from './lib/judge';
import { recordSpend, spendSoFar } from './lib/report';

afterAll(() => console.log(`[brand-voice] token spend: ${spendSoFar()}`));

describe('brand voice', () => {
  it('replies in calm, plain, emoji-free language', async () => {
    const res = await runConcierge('Hi, I just got orders to Fort Hood. Where do I start?', {
      tools: mockTools(),
    });
    recordSpend(res.usage);

    // Deterministic, free check: no emoji.
    expect(/\p{Extended_Pictographic}/u.test(res.text), 'reply contains emoji').toBe(false);

    const verdict = await judge(
      res.text,
      'PASS if the tone is calm, plain (5th-7th grade reading level), and direct, with no hype, ' +
        'no exclamation-stacking, and no openers like "Absolutely!" or "Sure!". FAIL otherwise.',
    );
    recordSpend(verdict.usage);
    expect(verdict.pass, verdict.reason).toBe(true);
  });
});
