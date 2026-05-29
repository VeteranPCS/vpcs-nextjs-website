import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { extractBAHData, __testables, type PostData } from '@/lib/bah-scraper';

const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractBAHData', () => {
  it('parses a successful DTMO response (79918 / E-5 / 2025)', async () => {
    const fixture = loadFixture('bah-79918-e5-2025.html');
    const spy = vi
      .spyOn(__testables, 'fetchPage')
      .mockResolvedValue(fixture);

    const result = await extractBAHData('2025', '79918', '5');

    expect(spy).toHaveBeenCalledOnce();
    const [, postData] = spy.mock.calls[0] as [string, PostData];
    expect(postData.YEAR).toBe('25');
    expect(postData.Zipcode).toBe('79918');
    expect(postData.Rank).toBe('5');

    expect(result.isValid).toBe(true);
    expect(result.mha).toMatch(/EL PASO/);
    expect(result.rank).toBe('E-5');
    expect(result.year).toBe('2025');
    expect(result.withDependents).toBeGreaterThan(0);
    expect(result.withoutDependents).toBeGreaterThan(0);
    expect(result.withDependents).toBeGreaterThan(result.withoutDependents);
  });

  it('sends YEAR=26 on the wire when given "2026" (4-digit → 2-digit)', async () => {
    const fixture = loadFixture('bah-79918-e5-2025.html');
    const spy = vi
      .spyOn(__testables, 'fetchPage')
      .mockResolvedValue(fixture);

    await extractBAHData('2026', '79918', '5');

    const [, postData] = spy.mock.calls[0] as [string, PostData];
    expect(postData.YEAR).toBe('26');
  });

  it('passes through a 2-digit year unchanged ("25" → "25")', async () => {
    const fixture = loadFixture('bah-79918-e5-2025.html');
    const spy = vi
      .spyOn(__testables, 'fetchPage')
      .mockResolvedValue(fixture);

    await extractBAHData('25', '79918', '5');

    const [, postData] = spy.mock.calls[0] as [string, PostData];
    expect(postData.YEAR).toBe('25');
  });

  it('throws when DTMO returns a not-found page (no #ImportDiv2)', async () => {
    const fixture = loadFixture('bah-99999-notfound.html');
    vi.spyOn(__testables, 'fetchPage').mockResolvedValue(fixture);

    await expect(extractBAHData('2025', '99999', '5')).rejects.toThrow(
      /Could not find BAH data container/,
    );
  });

  it('rejects unknown rank ids before hitting the network', async () => {
    const spy = vi.spyOn(__testables, 'fetchPage');
    await expect(extractBAHData('2025', '79918', '999')).rejects.toThrow(
      /Invalid rank ID/,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
