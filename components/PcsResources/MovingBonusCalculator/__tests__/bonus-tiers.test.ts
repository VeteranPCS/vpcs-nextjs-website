import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// lib/content/how-it-works is server-only; stub the marker package so the
// loader can run under Vitest's Node environment (pattern: states.test.ts).
vi.mock('server-only', () => ({}));

import { MOVE_IN_BONUS } from '@/lib/content/how-it-works';

// Invariant: the bonus schedule in content/_data/site/moveInBonus.json
// (rendered as the How It Works bonus table) and the tiers hard-coded in
// MovingBonusCalculator.tsx must describe the same bands, so the table copy
// and the calculator cannot drift apart.
//
// MovingBonusCalculator exports only the client component; the tiers live in
// a function-scoped if/else chain, so we parse them out of the source text -
// there is no importable export to compare against instead.

const CALCULATOR_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../MovingBonusCalculator.tsx'),
  'utf8',
);

type Band = { min: number; max: number; bonus: number };

function parseDollars(raw: string): number {
  const match = /^\$([0-9,]+)$/.exec(raw.trim());
  if (!match) throw new Error(`unparseable dollar amount: ${JSON.stringify(raw)}`);
  return Number(match[1]!.replace(/,/g, '')); // mandatory capture group
}

/** Parses "Under $100,000", "$100,000 – $199,999" (en dash), "$1,000,000+". */
function parsePriceRange(raw: string): { min: number; max: number } {
  const range = raw.trim();
  const under = /^Under \$([0-9,]+)$/.exec(range);
  if (under) {
    return { min: 0, max: Number(under[1]!.replace(/,/g, '')) - 1 }; // mandatory capture group
  }
  const between = /^\$([0-9,]+) – \$([0-9,]+)$/.exec(range);
  if (between) {
    return {
      min: Number(between[1]!.replace(/,/g, '')), // mandatory capture groups
      max: Number(between[2]!.replace(/,/g, '')),
    };
  }
  const plus = /^\$([0-9,]+)\+$/.exec(range);
  if (plus) {
    return { min: Number(plus[1]!.replace(/,/g, '')), max: Infinity }; // mandatory capture group
  }
  throw new Error(`unparseable priceRange: ${JSON.stringify(raw)}`);
}

const TABLE_BANDS: Band[] = MOVE_IN_BONUS.bonusTable.map((row) => ({
  ...parsePriceRange(row.priceRange),
  bonus: parseDollars(row.moveInBonus),
}));

/** Returns the text between the marker's opening brace and its matching close. */
function extractFunctionBody(source: string, marker: string): string {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`marker not found in MovingBonusCalculator.tsx: ${marker}`);
  }
  let depth = 1;
  let index = start + marker.length;
  while (depth > 0) {
    if (index >= source.length) {
      throw new Error('unbalanced braces after calculateMovingBonus marker');
    }
    const char = source.charAt(index);
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    index += 1;
  }
  return source.slice(start + marker.length, index - 1);
}

function extractCalculatorTiers(source: string): Band[] {
  const body = extractFunctionBody(source, 'const calculateMovingBonus = (value: number) => {');
  const first = /if\s*\(\s*value\s*<\s*(\d+)\s*\)\s*\{\s*return\s+(\d+)\s*;/.exec(body);
  if (!first) throw new Error('calculateMovingBonus: opening "value < N" tier not found');
  const tiers: Band[] = [
    { min: 0, max: Number(first[1]!) - 1, bonus: Number(first[2]!) }, // mandatory capture groups
  ];
  const middle = /value\s*>=\s*(\d+)\s*&&\s*value\s*<=\s*(\d+)\s*\)\s*\{\s*return\s+(\d+)\s*;/g;
  for (const match of body.matchAll(middle)) {
    tiers.push({
      min: Number(match[1]!), // mandatory capture groups
      max: Number(match[2]!),
      bonus: Number(match[3]!),
    });
  }
  const last = /else\s*\{[^{}]*?return\s+(\d+)\s*;/.exec(body);
  if (!last) throw new Error('calculateMovingBonus: closing else tier not found');
  const previous = tiers[tiers.length - 1];
  if (!previous || !Number.isFinite(previous.max)) {
    throw new Error('calculateMovingBonus: no bounded tier before the closing else');
  }
  tiers.push({ min: previous.max + 1, max: Infinity, bonus: Number(last[1]!) }); // mandatory capture group
  return tiers;
}

const CALCULATOR_TIERS = extractCalculatorTiers(CALCULATOR_SOURCE);

describe('MovingBonusCalculator tiers vs moveInBonus.json bonus table', () => {
  it('table bands are ascending and contiguous from $0 with an open top band', () => {
    expect(TABLE_BANDS.length).toBeGreaterThan(1);
    expect(TABLE_BANDS[0]!.min).toBe(0); // length checked above
    for (let i = 1; i < TABLE_BANDS.length; i += 1) {
      const previous = TABLE_BANDS[i - 1]!; // bounded for loop
      const band = TABLE_BANDS[i]!; // bounded for loop
      expect(band.min).toBe(previous.max + 1);
    }
    expect(TABLE_BANDS[TABLE_BANDS.length - 1]!.max).toBe(Infinity); // length checked above
  });

  it('calculator tiers match the table bands exactly (boundaries and bonus amounts)', () => {
    expect(CALCULATOR_TIERS).toEqual(TABLE_BANDS);
  });

  it('charity donation is 10% of the bonus in every band', () => {
    // The calculator computes charity as Math.round(movingBonus * 0.1); pin
    // the source formula so this test tracks the same rate.
    expect(CALCULATOR_SOURCE).toMatch(/movingBonus\s*\*\s*0\.1/);
    for (const row of MOVE_IN_BONUS.bonusTable) {
      expect(parseDollars(row.charityDonation)).toBe(
        Math.round(parseDollars(row.moveInBonus) * 0.1),
      );
    }
  });
});
