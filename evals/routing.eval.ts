import { afterAll, describe, expect, it } from 'vitest';
import { runConcierge, type RunResult } from './lib/run';
import { mockTools } from './lib/mock-tools';
import { recordSpend, spendSoFar } from './lib/report';

afterAll(() => console.log(`[routing] token spend: ${spendSoFar()}`));

const refusalPattern = /I can only help with PCS moves/i;

describe('routing', () => {
  it.each([
    ['Fort Carson', 'Colorado Springs', 'CO'],
    ['Peterson SFB', 'Colorado Springs', 'CO'],
    ['USAFA', 'Colorado Springs', 'CO'],
    ['Naval Station Norfolk', 'Norfolk', 'VA'],
    ['Fort Cavazos', 'Killeen - Fort Hood', 'TX'],
    ['Fort Hood', 'Killeen - Fort Hood', 'TX'],
  ])('routes base alias %s to %s', async (destination, expectedArea, expectedState) => {
    const res = await runConcierge(`I need a VeteranPCS agent near ${destination}.`, {
      tools: mockTools(),
    });
    recordSpend(res.usage);

    expectNoRefusal(res);
    expect(res.toolNames, res.text).toContain('resolveDestinationLocation');
    expect(res.toolNames, res.text).toContain('findCoverageAreas');
    expect(res.toolNames, res.text).toContain('getPartnersForCoverageArea');
    expectSelectedCoverage(res, expectedArea, expectedState, 'high');
    expectPartnerCall(res, expectedArea, 'agent');
    expectPartnerPayloadMax(res, 3);
  });

  it.each([
    ['Boulder, CO'],
    ['80301'],
  ])('routes %s to nearest active area with a caveat', async (destination) => {
    const res = await runConcierge(`Can you find me an agent in ${destination}?`, {
      tools: mockTools(),
    });
    recordSpend(res.usage);

    expectNoRefusal(res);
    expectSelectedCoverage(res, 'Denver', 'CO', 'high');
    expectPartnerCall(res, 'Denver', 'agent');
    expect(routeCaveat(res)).toMatch(/do not see .*specific VeteranPCS coverage area/i);
    expect(res.text).toMatch(/closest|do not see|don't see|don't have .*specific|don't have an exact|no .*specific|not .*exact/i);
    expectPartnerPayloadMax(res, 3);
  });

  it('asks for state when the destination is ambiguous', async () => {
    const res = await runConcierge('I need an agent in Springfield.', {
      tools: mockTools(),
    });
    recordSpend(res.usage);

    expectNoRefusal(res);
    expect(res.toolNames).not.toContain('getPartnersForCoverageArea');
    expect(res.text).toMatch(/which|what|state/i);
  });

  it('handles state-only routing without inventing city coverage', async () => {
    const res = await runConcierge('I am moving to Colorado and need an agent.', {
      tools: mockTools(),
    });
    recordSpend(res.usage);

    expectNoRefusal(res);
    expect(res.toolNames, res.text).toContain('findCoverageAreas');
    expectSelectedCoverage(res, 'Colorado Springs', 'CO', 'medium');
    expect(routeCaveat(res)).toMatch(/State-only routing is broad/i);
  });
});

function expectNoRefusal(res: RunResult): void {
  expect(res.text).not.toMatch(refusalPattern);
}

function expectSelectedCoverage(
  res: RunResult,
  expectedArea: string,
  expectedState: string,
  expectedConfidence: string,
): void {
  const selected = selectedCoverage(res);
  expect(selected?.areaName).toBe(expectedArea);
  expect(selected?.stateCode).toBe(expectedState);
  expect(selected?.confidence).toBe(expectedConfidence);
}

function expectPartnerCall(
  res: RunResult,
  expectedArea: string,
  expectedRole: string,
): void {
  const call = res.toolCalls.find((item) => item.toolName === 'getPartnersForCoverageArea');
  expect(call, res.text).toBeTruthy();
  const input = asRecord(call?.input);
  expect(input.areaName).toBe(expectedArea);
  expect(input.role).toBe(expectedRole);
}

function expectPartnerPayloadMax(res: RunResult, max: number): void {
  const result = res.toolResults.find((item) => item.toolName === 'getPartnersForCoverageArea');
  expect(result, res.text).toBeTruthy();
  const envelope = asRecord(result?.output);
  const data = asRecord(envelope.data);
  const partners = Array.isArray(data.partners) ? data.partners : [];
  expect(partners.length).toBeLessThanOrEqual(max);
}

function selectedCoverage(res: RunResult): Record<string, unknown> | undefined {
  const result = res.toolResults.find((item) => item.toolName === 'findCoverageAreas');
  const envelope = asRecord(result?.output);
  const data = asRecord(envelope.data);
  return asOptionalRecord(data.selectedCoverageArea);
}

function routeCaveat(res: RunResult): string {
  const result = res.toolResults.find((item) => item.toolName === 'findCoverageAreas');
  const envelope = asRecord(result?.output);
  const data = asRecord(envelope.data);
  return typeof data.caveat === 'string' ? data.caveat : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}
