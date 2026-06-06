import { describe, it, expect } from 'vitest';

import { escapeSoqlLiteral, isStateCode } from '@/services/soql';

describe('escapeSoqlLiteral', () => {
  it('escapes a single quote so it cannot close a SOQL string literal', () => {
    expect(escapeSoqlLiteral("O'Brien")).toBe("O\\'Brien");
  });

  it('escapes a backslash', () => {
    expect(escapeSoqlLiteral('a\\b')).toBe('a\\\\b');
  });

  it('escapes backslash before quote so escaping is not doubled', () => {
    // Input: backslash + single quote. Backslash must be escaped first.
    expect(escapeSoqlLiteral("\\'")).toBe("\\\\\\'");
  });

  it('neutralises a classic injection payload', () => {
    expect(escapeSoqlLiteral("TX' OR 1=1--")).toBe("TX\\' OR 1=1--");
  });

  it('escapes other reserved characters defensively', () => {
    expect(escapeSoqlLiteral('"')).toBe('\\"');
    expect(escapeSoqlLiteral('\n')).toBe('\\n');
    expect(escapeSoqlLiteral('\r')).toBe('\\r');
    expect(escapeSoqlLiteral('\t')).toBe('\\t');
  });

  it('leaves a plain state code untouched', () => {
    expect(escapeSoqlLiteral('TX')).toBe('TX');
  });
});

describe('isStateCode', () => {
  it('accepts a lowercase 2-letter code', () => {
    expect(isStateCode('tx')).toBe(true);
  });

  it('accepts an uppercase 2-letter code', () => {
    expect(isStateCode('TX')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isStateCode('')).toBe(false);
  });

  it('rejects a full state name', () => {
    expect(isStateCode('texas')).toBe(false);
  });

  it('rejects an injection payload', () => {
    expect(isStateCode("TX' OR 1=1")).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isStateCode(undefined)).toBe(false);
    expect(isStateCode(null)).toBe(false);
    expect(isStateCode(42)).toBe(false);
    expect(isStateCode(['TX'])).toBe(false);
  });
});
