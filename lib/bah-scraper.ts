import {
  RANK_MAPPING as CORE_RANK_MAPPING,
  extractBAHData as extractCoreBAHData,
  fetchPage as coreFetchPage,
} from './bah-scraper-core.mjs';

export interface BAHData {
  year: string;
  zipCode: string;
  rank: string;
  mha: string;
  withDependents: number;
  withoutDependents: number;
  difference: number;
  isValid: boolean;
}

export interface PostData extends Record<string, string> {
  report: string;
  YEAR: string;
  Zipcode: string;
  Rank: string;
}

export const RANK_MAPPING: Record<string, string> = CORE_RANK_MAPPING;

// Exposed via `__testables` below so unit tests can stub the network without
// monkey-patching node:https.
function fetchPage(url: string, postData: PostData | null = null): Promise<string> {
  const fetchCore = coreFetchPage as (
    requestUrl: string,
    requestPostData: PostData | null,
  ) => Promise<string>;
  return fetchCore(url, postData);
}

export async function extractBAHData(
  year: string,
  zipCode: string,
  rankId: string,
): Promise<BAHData> {
  const rankName = RANK_MAPPING[rankId];
  if (!rankName) {
    throw new Error('Invalid rank ID');
  }

  console.log(
    `Extracting BAH data: Year=${year}, ZIP=${zipCode}, Rank=${rankName} (ID=${rankId})`,
  );

  return extractCoreBAHData(year, zipCode, rankId, __testables.fetchPage) as Promise<BAHData>;
}

// Indirection object so tests can stub the network layer with vi.spyOn.
// Not part of the public contract - do not import outside of tests.
export const __testables = { fetchPage };
