import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildSnapshotForTarget } from '@/scripts/build-bah-snapshots.mjs';
import type { PostData } from '@/lib/bah-scraper';

const fixturesDir = path.join(__dirname, '..', '..', 'lib', '__tests__', 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

describe('build-bah-snapshots', () => {
  it('builds a multi-rank snapshot through the plain-ESM extractor', async () => {
    const fixture = loadFixture('bah-79918-e5-2025.html');
    const fetcher = vi.fn().mockResolvedValue(fixture);

    const snapshot = await buildSnapshotForTarget(
      {
        baseName: 'Fort Bliss',
        slug: 'fort-bliss',
        stateSlug: 'texas',
        primaryZip: '79918',
        expectedMha: 'TX279',
      },
      {
        year: '2025',
        rankIds: ['5', '6'],
        fetcher,
        generatedAt: '2026-06-19T00:00:00.000Z',
      },
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    const [, firstPostData] = fetcher.mock.calls[0] as [string, PostData];
    expect(firstPostData.YEAR).toBe('25');
    expect(firstPostData.Zipcode).toBe('79918');
    expect(snapshot.sourceYear).toBe('2025');
    expect(snapshot.generatedAt).toBe('2026-06-19T00:00:00.000Z');
    expect(snapshot.ranks.map((rank) => rank.rank)).toEqual(['E-5', 'E-6']);
    expect(snapshot.ranks[0].withDependents).toBe(1773);
  });

  it('rejects an unexpected MHA code before writing a snapshot', async () => {
    const fixture = loadFixture('bah-79918-e5-2025.html');
    const fetcher = vi.fn().mockResolvedValue(fixture);

    await expect(
      buildSnapshotForTarget(
        {
          baseName: 'Fort Bliss',
          slug: 'fort-bliss',
          stateSlug: 'texas',
          primaryZip: '79918',
          expectedMha: 'TX000',
        },
        { year: '2025', rankIds: ['5'], fetcher },
      ),
    ).rejects.toThrow(/expected MHA TX000/);
  });
});
