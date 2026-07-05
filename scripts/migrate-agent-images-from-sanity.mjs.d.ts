export type HeadshotClassification = {
  canonicalId: string | null;
  salesforceId18: string | null;
  name: string | null;
  isAgent: boolean;
  isLender: boolean;
  active: boolean;
};

export function salesforceIdsReferToSameRecord(a: unknown, b: unknown): boolean;
export function normalizeComparableName(value: unknown): string;
export function namesMatch(sanityName: unknown, salesforceName: unknown): boolean;
export function findFilenameCaseVariant(entries: string[], fileName: string): string | null;
export function classifyBulk(
  ids: string[],
  options?: {
    noSalesforce?: boolean;
    getSalesforceToken?: () => Promise<{ token: string; instanceUrl: string }>;
    sfQuery?: (
      token: string,
      instanceUrl: string,
      soql: string,
    ) => Promise<{ records?: Array<Record<string, unknown>> }>;
  },
): Promise<Map<string, HeadshotClassification>>;
