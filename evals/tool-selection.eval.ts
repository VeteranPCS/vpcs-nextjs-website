import { describe, it, expect, afterAll } from 'vitest';
import { runConcierge } from './lib/run';
import { mockTools } from './lib/mock-tools';
import { recordSpend, spendSoFar } from './lib/report';

afterAll(() => console.log(`[tool-selection] token spend: ${spendSoFar()}`));

describe('tool-selection', () => {
  it('calls getAgentsForState when the user wants an agent', async () => {
    const res = await runConcierge('Can you help me find a real estate agent in Texas?', {
      tools: mockTools(),
    });
    recordSpend(res.usage);
    expect(res.toolNames, res.text).toContain('getAgentsForState');
  });

  it('does not call any submit tool before the user gives info or confirms', async () => {
    const res = await runConcierge('I might want to talk to an agent at some point.', {
      tools: mockTools(),
    });
    recordSpend(res.usage);
    const submitCalls = res.toolNames.filter((n) => n.startsWith('submit'));
    expect(submitCalls, res.text).toEqual([]);
  });
});
