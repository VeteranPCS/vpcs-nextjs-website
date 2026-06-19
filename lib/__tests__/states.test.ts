import { describe, expect, it } from 'vitest';
import { US_STATE_CODES, US_STATES } from '@/constants/usStates';
import {
  formatStateLabel,
  normalizeStateCode,
  normalizeStateSlug,
  STATE_ABBR_TO_SLUG,
  STATE_SLUG_TO_ABBR,
} from '@/lib/states';
import { ROUTING_STATES, findRoutingState } from '@/lib/ai/routing/states';

describe('shared state catalog', () => {
  it('keeps constants, normalizers, and routing states in parity', () => {
    expect(US_STATE_CODES).toContain('DC');
    expect(US_STATES.find((state) => state.code === 'DC')).toEqual({
      code: 'DC',
      name: 'District of Columbia',
      slug: 'washington-dc',
    });

    for (const state of US_STATES) {
      expect(STATE_ABBR_TO_SLUG[state.code]).toBe(state.slug);
      expect(STATE_SLUG_TO_ABBR[state.slug]).toBe(state.code);
      expect(ROUTING_STATES.find((routingState) => routingState.code === state.code)).toEqual(state);
    }
  });

  it('normalizes codes, slugs, and display names including DC variants', () => {
    expect(normalizeStateCode('North Carolina')).toBe('NC');
    expect(normalizeStateSlug('north carolina')).toBe('north-carolina');
    expect(normalizeStateCode('washington-dc')).toBe('DC');
    expect(normalizeStateSlug('Washington, DC')).toBe('washington-dc');
    expect(normalizeStateCode('D.C.')).toBe('DC');
    expect(normalizeStateSlug('District of Columbia')).toBe('washington-dc');
    expect(formatStateLabel('washington-dc')).toBe('District of Columbia');
  });

  it('lets routing consume the same DC catalog entry', () => {
    expect(findRoutingState('Washington, DC')).toEqual({
      code: 'DC',
      name: 'District of Columbia',
      slug: 'washington-dc',
    });
  });
});
