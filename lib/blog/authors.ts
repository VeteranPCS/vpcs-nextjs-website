import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { unstable_cache } from 'next/cache';
import { SALESFORCE_BASE_URL, SALESFORCE_API_VERSION } from '@/constants/api';
import { RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { stateSlugFromAbbr } from '@/lib/states';
import type { FrontmatterAuthor, ResolvedAuthor } from '@/lib/blog/types';

const AUTHOR_FIELDS = [
  'Id',
  'AccountId_15__c',
  'FirstName',
  'LastName',
  'Military_Status__pc',
  'Brokerage_Name__pc',
  'BillingStateCode',
  'BillingAddress',
  'isAgent__pc',
  'isLender__pc',
  'Active_on_Website__pc',
].join(', ');

type SfAccount = {
  Id: string;
  AccountId_15__c: string | null;
  FirstName: string | null;
  LastName: string | null;
  Military_Status__pc: string | null;
  Brokerage_Name__pc: string | null;
  BillingStateCode: string | null;
  BillingAddress: { city?: string | null; state?: string | null } | null;
  isAgent__pc: boolean | null;
  isLender__pc: boolean | null;
  Active_on_Website__pc: boolean | null;
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

function resolveHeadshotPath(salesforceId: string, isLender: boolean): string | null {
  const folders = isLender ? ['lenders', 'agents'] : ['agents', 'lenders'];
  for (const folder of folders) {
    for (const ext of IMAGE_EXTENSIONS) {
      const rel = `/images/${folder}/${salesforceId}.${ext}`;
      const abs = path.join(process.cwd(), 'public', rel);
      if (fs.existsSync(abs)) return rel;
    }
  }
  return null;
}

async function runQuery(soql: string): Promise<SfAccount | null> {
  const endpoint = `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  let response = await salesForceAPI({ endpoint, type: RequestType.GET });

  if (response?.status === 401) {
    await getSalesforceToken();
    response = await salesForceAPI({ endpoint, type: RequestType.GET });
  }

  if (response?.status !== 200) return null;
  const records: SfAccount[] = response.data?.records ?? [];
  return records[0] ?? null;
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function querySalesforceById(salesforceId: string): Promise<SfAccount | null> {
  const safe = escapeSoql(salesforceId);
  const soql = `SELECT ${AUTHOR_FIELDS} FROM Account WHERE (Id = '${safe}' OR AccountId_15__c = '${safe}') AND IsPersonAccount = true LIMIT 1`;
  return runQuery(soql);
}

async function querySalesforceByName(name: string): Promise<SfAccount | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) {
    const safe = escapeSoql(trimmed);
    const soql = `SELECT ${AUTHOR_FIELDS} FROM Account WHERE IsPersonAccount = true AND LastName = '${safe}' AND (isAgent__pc = true OR isLender__pc = true) LIMIT 1`;
    return runQuery(soql);
  }
  const first = escapeSoql(trimmed.slice(0, lastSpace));
  const last = escapeSoql(trimmed.slice(lastSpace + 1));
  const soql = `SELECT ${AUTHOR_FIELDS} FROM Account WHERE IsPersonAccount = true AND FirstName = '${first}' AND LastName = '${last}' AND (isAgent__pc = true OR isLender__pc = true) LIMIT 1`;
  return runQuery(soql);
}

const fetchById = unstable_cache(
  async (id: string) => querySalesforceById(id),
  ['blog-author-by-id'],
  { revalidate: 3600, tags: ['blog-author'] },
);

const fetchByName = unstable_cache(
  async (name: string) => querySalesforceByName(name),
  ['blog-author-by-name'],
  { revalidate: 3600, tags: ['blog-author'] },
);

function toResolved(
  record: SfAccount,
  matchKind: ResolvedAuthor['matchKind'],
): ResolvedAuthor {
  const firstName = record.FirstName ?? '';
  const lastName = record.LastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const stateAbbr = record.BillingStateCode ?? null;
  const isLender = record.isLender__pc === true;
  const salesforceId = record.AccountId_15__c ?? record.Id;

  return {
    salesforceId,
    firstName,
    lastName,
    fullName: fullName || 'VeteranPCS',
    city: record.BillingAddress?.city ?? null,
    state: stateAbbr,
    stateSlug: stateSlugFromAbbr(stateAbbr),
    militaryStatus: record.Military_Status__pc ?? null,
    brokerage: record.Brokerage_Name__pc ?? null,
    headshotPath: resolveHeadshotPath(salesforceId, isLender),
    isAgent: record.isAgent__pc === true,
    isLender,
    active: record.Active_on_Website__pc !== false,
    matchKind,
  };
}

export async function resolveAuthor(
  input: FrontmatterAuthor | undefined | null,
): Promise<ResolvedAuthor | null> {
  if (!input) return null;

  if (input.salesforceId) {
    try {
      const record = await fetchById(input.salesforceId);
      if (record) return toResolved(record, 'salesforceId');
    } catch (err) {
      console.error('[resolveAuthor] by-id lookup failed:', err);
    }
  }

  if (input.name) {
    try {
      const record = await fetchByName(input.name);
      if (record) return toResolved(record, 'name');
    } catch (err) {
      console.error('[resolveAuthor] by-name lookup failed:', err);
    }
  }

  return null;
}
