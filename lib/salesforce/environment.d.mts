export type SalesforceProfile = 'webdev' | 'mock' | 'production';
export type SalesforceDeliveryMode = 'capture' | 'allowlisted' | 'live';
export type SalesforceAuthGrant = 'password' | 'client_credentials';

export interface SalesforceEnvironment {
  readonly profile: SalesforceProfile;
  readonly orgId: string;
  readonly loginOrigin: string;
  readonly restOrigin: string;
  readonly apiVersion: string;
  readonly authGrant: SalesforceAuthGrant;
  readonly webToLeadUrl: string;
  readonly recordTypes: Readonly<Record<
    'CUSTOMER_LEAD' | 'CUSTOMER_LEAD_15' | 'CUSTOMER_OPPORTUNITY' | 'AGENT_LISTING_LEAD'
    | 'LENDER_LISTING_LEAD' | 'INTERNSHIP_LEAD',
    string
  >>;
  readonly leadOwners: Readonly<Record<'BETH' | 'JESSICA' | 'STEPHANIE' | 'TARA', string>>;
  readonly fieldIds: Readonly<Record<string, string>>;
  readonly deliveryMode: SalesforceDeliveryMode;
  readonly allowSandboxWrites: boolean;
  readonly cacheKey: string;
}

type SalesforceEnv = Readonly<Record<string, string | undefined>>;

export class SalesforceConfigurationError extends Error {
  constructor(message: string);
}

export function getSalesforceProfile(env?: SalesforceEnv): SalesforceProfile;
export function isProductionSalesforceRuntime(env?: SalesforceEnv): boolean;
export function isProtectedSalesforceWebdevPreview(env?: SalesforceEnv): boolean;
export function resolveSalesforceEnvironment(env?: SalesforceEnv, webdevManifest?: unknown): SalesforceEnvironment;
export function validateSalesforceRequestUrl(value: string, config: SalesforceEnvironment, purpose?: 'directory' | 'intake'): URL;
export function resolveSalesforceIntakeAuth(config: SalesforceEnvironment, env?: SalesforceEnv): {
  config: SalesforceEnvironment;
  request: { url: string; body: URLSearchParams };
  userId: string;
};
export function assertSalesforceIntakeIdentity(value: unknown, config: SalesforceEnvironment, userId: string): void;
export function validateWebToLeadTarget(params: URLSearchParams, config: SalesforceEnvironment): string;
export function getSalesforceOAuthRequest(
  config: SalesforceEnvironment,
  env?: SalesforceEnv,
): { url: string; body: URLSearchParams };
export function assertSalesforceInstanceUrl(value: unknown, config: SalesforceEnvironment): string;
export function getSalesforceOrganizationQueryUrl(config: SalesforceEnvironment): string;
export function assertSalesforceOrganization(data: unknown, config: SalesforceEnvironment): void;
export function authenticateSalesforce(
  config: SalesforceEnvironment,
  env?: SalesforceEnv,
  fetcher?: typeof fetch,
): Promise<{ token: string; instanceUrl: string }>;
