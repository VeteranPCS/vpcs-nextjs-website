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

export const RANK_MAPPING: Record<string, string>;
export function fetchPage(url: string, postData?: PostData | null): Promise<string>;
export function toDtmoYear(year: string): string;
export function toFourDigitYear(year: string): string;
export function extractDataFromHtml(html: string, rankName: string): BAHData;
export function extractBAHData(
  year: string,
  zipCode: string,
  rankId: string,
  fetcher?: typeof fetchPage,
): Promise<BAHData>;
