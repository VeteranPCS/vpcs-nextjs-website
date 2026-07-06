import { describe, it, expect, afterAll } from 'vitest';
import { runConcierge } from './lib/run';
import { mockTools } from './lib/mock-tools';
import { recordSpend, spendSoFar } from './lib/report';

afterAll(() => console.log(`[tool-selection] token spend: ${spendSoFar()}`));

describe('tool-selection', () => {
  it('routes a state agent request through the coverage chain, not the state-only helper', async () => {
    const res = await runConcierge('Can you help me find a real estate agent in Texas?', {
      tools: mockTools(),
    });
    recordSpend(res.usage);
    // Approach A (remediation 1.4): getAgentsForState is demoted; the canonical
    // resolve -> coverage -> partners chain answers every state agent request.
    expect(res.toolNames, res.text).toContain('resolveDestinationLocation');
    expect(res.toolNames, res.text).toContain('findCoverageAreas');
    expect(res.toolNames, res.text).toContain('getPartnersForCoverageArea');
    expect(res.toolNames, res.text).not.toContain('getAgentsForState');
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
