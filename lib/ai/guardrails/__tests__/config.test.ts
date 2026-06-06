import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  INJECTION_SIGNATURES,
  MAX_INPUT_CHARS,
  DAILY_TOKEN_CAP,
  REFUSAL_MESSAGE,
  guardrailsEnforced,
} from '@/lib/ai/guardrails/config';

describe('guardrail config', () => {
  beforeEach(() => vi.unstubAllEnvs());

  it('ships a non-empty injection signature list', () => {
    expect(INJECTION_SIGNATURES.length).toBeGreaterThan(0);
    expect(INJECTION_SIGNATURES.every((r) => r instanceof RegExp)).toBe(true);
  });

  it('caps input and budget at sane values', () => {
    expect(MAX_INPUT_CHARS).toBeGreaterThan(500);
    expect(DAILY_TOKEN_CAP).toBeGreaterThan(10_000);
  });

  it('has a non-empty brand-voice refusal message', () => {
    expect(REFUSAL_MESSAGE.length).toBeGreaterThan(20);
  });

  it('enforces by default; disables only on exact "0"', () => {
    expect(guardrailsEnforced()).toBe(true); // unset
    vi.stubEnv('GUARDRAILS_ENFORCED', '1');
    expect(guardrailsEnforced()).toBe(true);
    vi.stubEnv('GUARDRAILS_ENFORCED', 'true');
    expect(guardrailsEnforced()).toBe(true);
    vi.stubEnv('GUARDRAILS_ENFORCED', '0');
    expect(guardrailsEnforced()).toBe(false);
  });
});
