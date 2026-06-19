import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

export type BahSnapshotRank = {
  rankId: string;
  rank: string;
  mha: string;
  withDependents: number;
  withoutDependents: number;
  difference: number;
};

export type BahSnapshot = {
  baseName: string;
  slug: string;
  stateSlug: string;
  primaryZip: string;
  expectedMha: string | null;
  year: string;
  sourceYear: string;
  source: 'travel.dod.mil/DTMO';
  generatedAt: string;
  ranks: BahSnapshotRank[];
};

const SNAPSHOT_ROOT = path.join(process.cwd(), 'content', '_data', 'bah-snapshots');

export function normalizeBahSnapshotSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSnapshotRank(value: unknown): value is BahSnapshotRank {
  if (!value || typeof value !== 'object') return false;
  const rank = value as Partial<BahSnapshotRank>;
  return (
    typeof rank.rankId === 'string' &&
    typeof rank.rank === 'string' &&
    typeof rank.mha === 'string' &&
    isFiniteNumber(rank.withDependents) &&
    isFiniteNumber(rank.withoutDependents) &&
    isFiniteNumber(rank.difference)
  );
}

function isBahSnapshot(value: unknown): value is BahSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<BahSnapshot>;
  return (
    typeof snapshot.baseName === 'string' &&
    typeof snapshot.slug === 'string' &&
    typeof snapshot.stateSlug === 'string' &&
    typeof snapshot.primaryZip === 'string' &&
    (typeof snapshot.expectedMha === 'string' || snapshot.expectedMha === null) &&
    typeof snapshot.year === 'string' &&
    typeof snapshot.sourceYear === 'string' &&
    snapshot.source === 'travel.dod.mil/DTMO' &&
    typeof snapshot.generatedAt === 'string' &&
    Array.isArray(snapshot.ranks) &&
    snapshot.ranks.length > 0 &&
    snapshot.ranks.every(isSnapshotRank)
  );
}

export function readBahSnapshot(
  base: string,
  year: string | number,
  rootDir = SNAPSHOT_ROOT,
): BahSnapshot | null {
  const slug = normalizeBahSnapshotSlug(base);
  if (!slug) return null;

  const filepath = path.join(rootDir, slug, `${year}.json`);
  try {
    const snapshot = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return isBahSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
