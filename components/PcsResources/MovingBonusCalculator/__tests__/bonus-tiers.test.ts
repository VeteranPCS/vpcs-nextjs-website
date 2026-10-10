import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// lib/content/how-it-works is server-only; stub the marker package so the
// loader can run under Vitest's Node environment (pattern: states.test.ts).
vi.mock('server-only', () => ({}));

import { MOVE_IN_BONUS } from '@/lib/content/how-it-works';
import { calculateMovingBonus } from '@/lib/bonus/calculate';

// Keep the published bonus table and the shared calculation consistent.
// Expected values come from content, independently of the implementation.

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
    for (const band of TABLE_BANDS) {
      expect(calculateMovingBonus(band.min)).toBe(band.bonus);
      if (Number.isFinite(band.max)) {
        expect(calculateMovingBonus(band.max)).toBe(band.bonus);
        expect(calculateMovingBonus((band.min + band.max) / 2)).toBe(band.bonus);
      } else {
        expect(calculateMovingBonus(band.min * 2)).toBe(band.bonus);
      }
    }
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
