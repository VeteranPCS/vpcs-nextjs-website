import { describe, expect, it } from 'vitest';
import { resolveDestinationLocation } from '@/lib/ai/routing/destination';

describe('resolveDestinationLocation', () => {
  it.each([
    ['Fort Carson', 'Colorado Springs'],
    ['Peterson SFB', 'Colorado Springs'],
    ['USAFA', 'Colorado Springs'],
  ])('resolves Colorado base alias %s', (input, coverageAreaOverride) => {
    const res = resolveDestinationLocation(input);

    expect(res).toMatchObject({
      type: 'military_base',
      stateName: 'Colorado',
      stateCode: 'CO',
      coverageAreaOverride,
      confidence: 'high',
    });
  });

  it('resolves a ZIP code to Boulder, CO', () => {
    const res = resolveDestinationLocation('80301');

    expect(res).toMatchObject({
      type: 'zip',
      normalizedName: 'Boulder, CO',
      stateName: 'Colorado',
      stateCode: 'CO',
      confidence: 'high',
    });
    expect(res.latitude).toBeCloseTo(40.0497, 3);
  });

  it('resolves city and state input', () => {
    const res = resolveDestinationLocation('Boulder, CO');

    expect(res).toMatchObject({
      type: 'city',
      normalizedName: 'Boulder, CO',
      stateName: 'Colorado',
      stateCode: 'CO',
      confidence: 'high',
    });
  });

  it('resolves state-only input', () => {
    const res = resolveDestinationLocation('Colorado');

    expect(res).toMatchObject({
      type: 'state',
      normalizedName: 'Colorado',
      stateCode: 'CO',
      confidence: 'high',
    });
    expect(res.caveat).toMatch(/State-only routing is broad/);
  });

  it('asks for clarification on Springfield without a state', () => {
    const res = resolveDestinationLocation('Springfield');

    expect(res.type).toBe('ambiguous');
    expect(res.candidates?.map((candidate) => candidate.stateCode)).toEqual(
      expect.arrayContaining(['MO', 'IL', 'MA', 'VA']),
    );
    expect(res.caveat).toMatch(/need the state/i);
  });

  it('does not guess for a city-only destination without a state', () => {
    const res = resolveDestinationLocation('Boulder');

    expect(res.type).toBe('ambiguous');
    expect(res.stateCode).toBeUndefined();
    expect(res.caveat).toMatch(/need the state/i);
  });
});
