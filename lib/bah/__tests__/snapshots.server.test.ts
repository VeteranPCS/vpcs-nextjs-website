import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readBahSnapshot } from '@/lib/bah/snapshots.server';

function writeJson(filepath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(value, null, 2));
}

function validSnapshot() {
  return {
    baseName: 'Fort Test',
    slug: 'fort-test',
    stateSlug: 'texas',
    primaryZip: '79918',
    expectedMha: 'TX279',
    year: '2025',
    sourceYear: '2025',
    source: 'travel.dod.mil/DTMO',
    generatedAt: '2026-06-19T00:00:00.000Z',
    ranks: [
      {
        rankId: '5',
        rank: 'E-5',
        mha: 'EL PASO, TX (TX279)',
        withDependents: 1773,
        withoutDependents: 1425,
        difference: 348,
      },
    ],
  };
}

describe('readBahSnapshot', () => {
  it('reads a valid committed snapshot shape', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bah-snapshots-'));
    writeJson(path.join(root, 'fort-test', '2025.json'), validSnapshot());

    const snapshot = readBahSnapshot('Fort Test', '2025', root);

    expect(snapshot?.baseName).toBe('Fort Test');
    expect(snapshot?.ranks[0].rank).toBe('E-5');
  });

  it('returns null for missing and malformed snapshots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bah-snapshots-'));
    writeJson(path.join(root, 'fort-test', '2025.json'), {
      ...validSnapshot(),
      ranks: [],
    });

    expect(readBahSnapshot('missing-base', '2025', root)).toBeNull();
    expect(readBahSnapshot('fort-test', '2025', root)).toBeNull();
  });
});
