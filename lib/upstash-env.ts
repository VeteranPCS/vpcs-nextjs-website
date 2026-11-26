import { isProductionSalesforceRuntime } from '@/lib/salesforce/environment.mjs';

const REST_URL_ENV_NAMES = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_KV_REST_API_URL',
] as const;

const REST_TOKEN_ENV_NAMES = [
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_REST_KV_REST_API_TOKEN',
] as const;

export type UpstashEnvVarName =
  | (typeof REST_URL_ENV_NAMES)[number]
  | (typeof REST_TOKEN_ENV_NAMES)[number];

export interface UpstashRedisEnv {
  url: string;
  token: string;
  urlEnvName: (typeof REST_URL_ENV_NAMES)[number];
  tokenEnvName: (typeof REST_TOKEN_ENV_NAMES)[number];
}

function firstPresent<const T extends readonly string[]>(
  names: T,
): { name: T[number]; value: string } | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

export function resolveUpstashRedisEnv(): UpstashRedisEnv | null {
  if (!isProductionSalesforceRuntime()) return null;
  const url = firstPresent(REST_URL_ENV_NAMES);
  const token = firstPresent(REST_TOKEN_ENV_NAMES);

  if (!url || !token) return null;

  return {
    url: url.value,
    token: token.value,
    urlEnvName: url.name,
    tokenEnvName: token.name,
  };
}

/** The WebDev notification budget has its own database and credentials. */
export function resolveWebdevNotificationRedisEnv(): { url: string; token: string } | null {
  if (process.env.VPCS_SALESFORCE_PROFILE !== 'webdev') return null;

  const url = process.env.VPCS_WEBDEV_UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, '') ?? '';
  const token = process.env.VPCS_WEBDEV_UPSTASH_REDIS_REST_TOKEN?.trim() ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.upstash\.io$/.test(url) || !/^\S+$/.test(token)) return null;
  if (REST_URL_ENV_NAMES.some(name => process.env[name]?.trim().toLowerCase().replace(/\/$/, '') === url) ||
      REST_TOKEN_ENV_NAMES.some(name => process.env[name]?.trim() === token)) return null;

  return { url, token };
}

export function missingUpstashEnvVars(): string[] {
  const missing: string[] = [];
  if (!firstPresent(REST_URL_ENV_NAMES)) {
    missing.push(REST_URL_ENV_NAMES.join(' or '));
  }
  if (!firstPresent(REST_TOKEN_ENV_NAMES)) {
    missing.push(REST_TOKEN_ENV_NAMES.join(' or '));
  }
  return missing;
}

export function hasUpstashEnv(): boolean {
  return resolveUpstashRedisEnv() !== null;
}

export function deployedConciergeRequiresUpstash(): boolean {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'development';
}
