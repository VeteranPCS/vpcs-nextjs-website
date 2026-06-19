import type { BAHData, PostData } from '../lib/bah-scraper';

export type BahBaseTarget = {
  baseName: string;
  slug: string;
  stateSlug: string;
  primaryZip: string;
  expectedMha?: string;
};

export type BahSnapshotRank = Pick<
  BAHData,
  'rank' | 'mha' | 'withDependents' | 'withoutDependents' | 'difference'
> & {
  rankId: string;
};

export type BahSnapshot = BahBaseTarget & {
  expectedMha: string | null;
  year: string;
  sourceYear: string;
  source: 'travel.dod.mil/DTMO';
  generatedAt: string;
  ranks: BahSnapshotRank[];
};

export const DEFAULT_RANK_IDS: string[];
export function buildSnapshotForTarget(
  target: BahBaseTarget,
  options: {
    year: string;
    rankIds?: string[];
    fetcher?: (url: string, postData?: PostData | null) => Promise<string>;
    generatedAt?: string;
  },
): Promise<BahSnapshot>;
