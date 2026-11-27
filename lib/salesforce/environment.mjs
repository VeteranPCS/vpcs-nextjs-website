import { createHash } from 'node:crypto';
import productionMetadata from '../../config/salesforce/production.json' with { type: 'json' };
import mockMetadata from '../../config/salesforce/mock.json' with { type: 'json' };

const VERCEL_WORKFLOW_BRANCH = 'codex/salesforce-workflow-test';
const WEBDEV_ORIGIN = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
const PRODUCTION_ORIGIN = 'https://veteranpcs.my.salesforce.com';
const MOCK_ORIGIN = 'https://salesforce.mock.invalid';
const WEB_TO_LEAD_PATH = '/servlet/servlet.WebToLead';
const SALESFORCE_TIMEOUT_MS = 15_000;

export class SalesforceConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SalesforceConfigurationError';
  }
}

function requireValue(condition, message) {
  if (!condition) throw new SalesforceConfigurationError(message);
}

function isProductionDeployment(env) {
  return env.VERCEL === '1'
    && env.VERCEL_ENV === 'production'
    && env.VERCEL_GIT_COMMIT_REF === 'main';
}

export function isProductionSalesforceRuntime(env = process.env) {
  return env.VPCS_SALESFORCE_PROFILE === 'production' && isProductionDeployment(env);
}

export function getSalesforceProfile(env = process.env) {
  const profile = env.VPCS_SALESFORCE_PROFILE ?? 'webdev';
  requireValue(
    profile === 'production' || profile === 'webdev' || profile === 'mock',
    'VPCS_SALESFORCE_PROFILE must be production, webdev, or mock.',
  );
  if (profile === 'production' || (env.VERCEL === '1' && env.VERCEL_ENV === 'production')) {
    requireValue(
      isProductionSalesforceRuntime(env),
      'The production Salesforce profile requires an explicit production profile on Vercel production main.',
    );
  }
  return profile;
}

function parseHttpsUrl(value, setting) {
  // URL accepts and normalizes backslashes, control characters, and an empty userinfo.
  requireValue(
    typeof value === 'string' && /^https:\/\/[^\s\\]+$/.test(value),
    `${setting} must be an HTTPS URL.`,
  );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SalesforceConfigurationError(`${setting} must be an HTTPS URL.`);
  }
  const authority = /^https:\/\/([^/?#]+)/.exec(value)?.[1];
  requireValue(
    authority === url.hostname && !url.username && !url.password && !url.hash && !value.includes('#'),
    `${setting} must have a canonical host and no credentials or fragment.`,
  );
  return url;
}

function parseOrigin(value, allowed, setting) {
  const url = parseHttpsUrl(value, setting);
  requireValue(
    allowed.includes(url.origin) && (value === url.origin || value === `${url.origin}/`),
    `${setting} must be an approved origin for this Salesforce profile.`,
  );
  return url.origin;
}

function allowedLoginOrigins(profile, authGrant) {
  if (profile === 'production' && authGrant === 'password') {
    return [PRODUCTION_ORIGIN, 'https://login.salesforce.com'];
  }
  return [allowedRestOrigin(profile)];
}

function allowedRestOrigin(profile) {
  return profile === 'webdev' ? WEBDEV_ORIGIN : PRODUCTION_ORIGIN;
}

function isSalesforceId(value, prefix) {
  return typeof value === 'string' && value.startsWith(prefix) && /^(?:[A-Za-z0-9]{15}|[A-Za-z0-9]{18})$/.test(value);
}

function sameSalesforceId(left, right, prefix) {
  return isSalesforceId(left, prefix) && isSalesforceId(right, prefix) && left.slice(0, 15) === right.slice(0, 15);
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateIdMap(value, expected, prefix, label) {
  requireValue(isObject(value), `Salesforce metadata must contain ${label}.`);
  const keys = Object.keys(expected);
  requireValue(
    Object.keys(value).length === keys.length && keys.every((key) =>
      Object.hasOwn(value, key) && isSalesforceId(value[key], prefix)),
    `Salesforce metadata must contain a valid id for every ${label} key.`,
  );
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key]])));
}

function validateMetadata(value, expectedOrgId) {
  requireValue(
    isObject(value) && Object.keys(value).length === Object.keys(productionMetadata).length
      && value.schemaVersion === 1 && value.verified === true,
    'Salesforce metadata must be a verified schema version 1 manifest.',
  );
  requireValue(
    sameSalesforceId(value.orgId, expectedOrgId, '00D'),
    'The Salesforce metadata org ID must match VPCS_SALESFORCE_ORG_ID.',
  );
  const recordTypes = validateIdMap(value.recordTypes, productionMetadata.recordTypes, '012', 'recordTypes');
  requireValue(
    recordTypes.CUSTOMER_LEAD_15.length === 15
      && sameSalesforceId(recordTypes.CUSTOMER_LEAD_15, recordTypes.CUSTOMER_LEAD, '012'),
    'The Salesforce customer lead record types must refer to the same record.',
  );
  const leadOwners = validateIdMap(value.leadOwners, productionMetadata.leadOwners, '005', 'leadOwners');
  const fieldIds = validateIdMap(value.fieldIds, productionMetadata.fieldIds, '00N', 'fieldIds');
  requireValue(
    new Set(Object.values(fieldIds).map((id) => id.slice(0, 15))).size === Object.keys(fieldIds).length,
    'Salesforce Web-to-Lead fields must use unique field IDs.',
  );
  return { recordTypes, leadOwners, fieldIds };
}

function metadataFingerprint(ids) {
  // Validation reconstructs maps in manifest order, independent of input JSON key order.
  return createHash('sha256').update(JSON.stringify(ids)).digest('hex');
}

function validateAuthGrant(profile, authGrant) {
  requireValue(
    authGrant === 'client_credentials' || authGrant === 'password',
    'SALESFORCE_AUTH_GRANT must be client_credentials or password.',
  );
  requireValue(profile !== 'webdev' || authGrant === 'client_credentials',
    'The webdev Salesforce profile requires SALESFORCE_AUTH_GRANT=client_credentials.');
}

function parseWebdevMetadata(env) {
  try {
    return JSON.parse(env.VPCS_SALESFORCE_METADATA_JSON ?? '');
  } catch {
    throw new SalesforceConfigurationError('VPCS_SALESFORCE_METADATA_JSON must contain the verified webdev manifest.');
  }
}

function parseWebToLeadUrl(value, profile, orgId) {
  const url = parseHttpsUrl(value, 'VPCS_SALESFORCE_WEB_TO_LEAD_URL');
  const origins = profile === 'webdev'
    ? [WEBDEV_ORIGIN, 'https://test.salesforce.com']
    : ['https://webto.salesforce.com'];
  const orgIds = url.searchParams.getAll('orgId');
  requireValue(
    origins.includes(url.origin)
      && url.pathname === WEB_TO_LEAD_PATH
      && url.searchParams.getAll('encoding').length === 1
      && url.searchParams.get('encoding') === 'UTF-8'
      && orgIds.length <= 1
      && (orgIds.length === 0 || sameSalesforceId(orgIds[0], orgId, '00D'))
      && [...url.searchParams.keys()].every((key) => key === 'encoding' || key === 'orgId'),
    'VPCS_SALESFORCE_WEB_TO_LEAD_URL must use the approved endpoint and org for this Salesforce profile.',
  );
  return url.toString();
}

export function isProtectedSalesforceWebdevPreview(env = process.env) {
  return env.VERCEL === '1'
    && env.VERCEL_ENV === 'preview'
    && env.VERCEL_GIT_COMMIT_REF === VERCEL_WORKFLOW_BRANCH
    && env.VPCS_SANDBOX_PREVIEW_PROTECTED === '1';
}

function sandboxWritesAllowed(env) {
  const local = env.VERCEL !== '1' && env.VERCEL_ENV === undefined;
  return env.VPCS_SANDBOX_LEAD_WRITES === '1'
    && env.VPCS_WEBDEV_ISOLATION_ATTESTED === '1'
    && (local || isProtectedSalesforceWebdevPreview(env));
}

export function resolveSalesforceEnvironment(env = process.env, webdevManifest) {
  const profile = getSalesforceProfile(env);
  if (profile === 'mock') {
    const orgId = mockMetadata.orgId;
    const ids = validateMetadata(mockMetadata, orgId);
    return Object.freeze({
      profile,
      orgId,
      loginOrigin: MOCK_ORIGIN,
      restOrigin: MOCK_ORIGIN,
      apiVersion: 'v62.0',
      authGrant: 'client_credentials',
      webToLeadUrl: `${MOCK_ORIGIN}${WEB_TO_LEAD_PATH}?encoding=UTF-8`,
      ...ids,
      deliveryMode: 'capture',
      allowSandboxWrites: false,
      cacheKey: `mock:${orgId}:v62.0:${metadataFingerprint(ids)}`,
    });
  }

  const orgId = env.VPCS_SALESFORCE_ORG_ID;
  const metadata = profile === 'production' ? productionMetadata : webdevManifest ?? parseWebdevMetadata(env);
  const ids = validateMetadata(metadata, orgId);
  if (profile === 'webdev') {
    requireValue(
      !sameSalesforceId(orgId, productionMetadata.orgId, '00D') && !sameSalesforceId(orgId, mockMetadata.orgId, '00D'),
      'The webdev Salesforce org must have its own org ID.',
    );
  }

  const authGrant = env.SALESFORCE_AUTH_GRANT;
  validateAuthGrant(profile, authGrant);
  const loginOrigin = parseOrigin(env.SALESFORCE_LOGIN_BASE_URL, allowedLoginOrigins(profile, authGrant), 'SALESFORCE_LOGIN_BASE_URL');
  const restOrigin = parseOrigin(
    env.VPCS_SALESFORCE_BASE_URL,
    [allowedRestOrigin(profile)],
    'VPCS_SALESFORCE_BASE_URL',
  );
  const apiVersion = env.SALESFORCE_API_VERSION;
  requireValue(/^v[1-9][0-9]*\.[0-9]+$/.test(apiVersion ?? ''), 'SALESFORCE_API_VERSION must be a version such as v62.0.');
  const webToLeadUrl = parseWebToLeadUrl(env.VPCS_SALESFORCE_WEB_TO_LEAD_URL, profile, orgId);
  const allowSandboxWrites = profile === 'webdev' && sandboxWritesAllowed(env);
  const deliveryMode = env.VPCS_DELIVERY_MODE ?? 'capture';
  requireValue(
    profile === 'production'
      ? deliveryMode === 'live'
      : deliveryMode === 'capture' || (deliveryMode === 'allowlisted' && allowSandboxWrites),
    'VPCS_DELIVERY_MODE must be live on production and capture or protected allowlisted delivery in webdev.',
  );

  return Object.freeze({
    profile,
    orgId,
    loginOrigin,
    restOrigin,
    apiVersion,
    authGrant,
    webToLeadUrl,
    ...ids,
    deliveryMode,
    allowSandboxWrites,
    cacheKey: [profile, orgId.slice(0, 15), restOrigin, loginOrigin, apiVersion, authGrant, metadataFingerprint(ids)].join(':'),
  });
}

export function validateSalesforceRequestUrl(value, config, purpose = 'directory') {
  const url = parseHttpsUrl(value, 'Salesforce request URL');
  const dataPath = `/services/data/${config.apiVersion}/`;
  const isFilePath = url.pathname === '/servlet/servlet.FileDownload'
    || url.pathname.startsWith('/sfc/servlet.shepherd/');
  const isIntakePath = /^\/services\/apexrest\/vpcs\/intake\/v1\/(policy|inspect|claim|reconcile|notification)$/.test(url.pathname)
    && !url.search;
  requireValue(
    url.origin === config.restOrigin && (purpose === 'intake' ? isIntakePath : url.pathname.startsWith(dataPath) || isFilePath),
    'Salesforce requests must use the active org REST origin and a supported REST or file path.',
  );
  return url;
}

export function resolveSalesforceIntakeAuth(config, env = process.env) {
  const {
    VPCS_SALESFORCE_INTAKE_CLIENT_ID: clientId,
    VPCS_SALESFORCE_INTAKE_CLIENT_SECRET: clientSecret,
    VPCS_SALESFORCE_INTAKE_USER_ID: userId,
  } = env;
  requireValue(config.profile !== 'mock', 'Mock Salesforce does not authenticate externally.');
  requireValue(clientId && clientId.trim() === clientId && clientSecret && clientSecret.trim() === clientSecret
    && isSalesforceId(userId, '005'), 'The dedicated Salesforce intake client, secret and user ID are required.');
  requireValue(config.profile !== 'production' || clientId !== env.SALESFORCE_CLIENT_ID?.trim(),
    'Production Salesforce intake requires a separate OAuth client.');
  const loginOrigin = parseOrigin(config.restOrigin, allowedLoginOrigins(config.profile, 'client_credentials'), 'Salesforce intake OAuth origin');
  return {
    config: { ...config, loginOrigin, authGrant: 'client_credentials',
      cacheKey: JSON.stringify(['intake', config.cacheKey, clientId, userId.slice(0, 15)]) },
    request: {
      url: `${loginOrigin}/services/oauth2/token`,
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    },
    userId,
  };
}

export function assertSalesforceIntakeIdentity(value, config, userId) {
  const url = parseHttpsUrl(value, 'Salesforce intake identity URL');
  const approvedOrigins = [config.restOrigin, 'https://login.salesforce.com'];
  if (config.profile === 'webdev') approvedOrigins.push('https://test.salesforce.com');
  const identity = /^\/id\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)$/.exec(url.pathname);
  requireValue(approvedOrigins.includes(url.origin) && value === `${url.origin}${url.pathname}`
    && identity && sameSalesforceId(identity[1], config.orgId, '00D') && sameSalesforceId(identity[2], userId, '005'),
    'Salesforce OAuth identity does not match the configured intake principal.');
}

export function validateWebToLeadTarget(params, config) {
  requireValue(
    config.profile === 'production' || config.allowSandboxWrites,
    'Salesforce Web-to-Lead writes are disabled for this profile.',
  );
  const oids = params.getAll('oid');
  const recordTypes = params.getAll('recordType');
  const leadTypes = [
    config.recordTypes.CUSTOMER_LEAD_15,
    config.recordTypes.AGENT_LISTING_LEAD,
    config.recordTypes.LENDER_LISTING_LEAD,
    config.recordTypes.INTERNSHIP_LEAD,
  ];
  requireValue(
    oids.length === 1 && sameSalesforceId(oids[0], config.orgId, '00D')
      && recordTypes.length === 1
      && leadTypes.some((id) => sameSalesforceId(recordTypes[0], id, '012')),
    'The Web-to-Lead payload must use the active org and its lead record type.',
  );
  const fields = new Set(Object.values(config.fieldIds));
  requireValue(
    [...params.keys()].every((key) =>
      (!/^00n/i.test(key) || (fields.has(key) && params.getAll(key).length === 1))
      && (key.toLowerCase() !== 'orgid' || (params.getAll(key).length === 1
        && sameSalesforceId(params.get(key), config.orgId, '00D')))
      && (key.toLowerCase() !== 'oid' || key === 'oid')
      && (key.toLowerCase() !== 'recordtype' || key === 'recordType')),
    'The Web-to-Lead payload contains unexpected org or custom field identifiers.',
  );
  return parseWebToLeadUrl(config.webToLeadUrl, config.profile, config.orgId);
}

export function getSalesforceOAuthRequest(config, env = process.env) {
  requireValue(config.profile !== 'mock', 'Mock Salesforce does not authenticate externally.');
  validateAuthGrant(config.profile, config.authGrant);
  const loginOrigin = parseOrigin(config.loginOrigin, allowedLoginOrigins(config.profile, config.authGrant), 'Salesforce OAuth origin');
  const { SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET } = env;
  requireValue(SALESFORCE_CLIENT_ID && SALESFORCE_CLIENT_SECRET, 'Salesforce OAuth client credentials are missing.');
  const body = new URLSearchParams({
    grant_type: config.authGrant,
    client_id: SALESFORCE_CLIENT_ID,
    client_secret: SALESFORCE_CLIENT_SECRET,
  });
  if (config.authGrant === 'password') {
    const { SALESFORCE_USERNAME, SALESFORCE_PASSWORD, SALESFORCE_TOKEN } = env;
    requireValue(SALESFORCE_USERNAME && SALESFORCE_PASSWORD, 'Salesforce password-grant credentials are missing.');
    body.set('username', SALESFORCE_USERNAME);
    body.set('password', `${SALESFORCE_PASSWORD}${SALESFORCE_TOKEN ?? ''}`);
  }
  return { url: `${loginOrigin}/services/oauth2/token`, body };
}

export function assertSalesforceInstanceUrl(value, config) {
  return parseOrigin(value, [config.restOrigin], 'Salesforce OAuth instance_url');
}

export function getSalesforceOrganizationQueryUrl(config) {
  const url = new URL(`/services/data/${config.apiVersion}/query`, config.restOrigin);
  url.searchParams.set('q', 'SELECT Id, IsSandbox FROM Organization');
  return validateSalesforceRequestUrl(url.toString(), config).toString();
}

export function assertSalesforceOrganization(data, config) {
  const records = data?.records;
  requireValue(
    Array.isArray(records) && records.length === 1
      && sameSalesforceId(records[0]?.Id, config.orgId, '00D')
      && records[0]?.IsSandbox === (config.profile === 'webdev'),
    'Salesforce Organization identity does not match the active profile.',
  );
}

export async function authenticateSalesforce(config, env = process.env, fetcher = fetch) {
  const { url, body } = getSalesforceOAuthRequest(config, env);
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(SALESFORCE_TIMEOUT_MS),
    });
    requireValue(response.status === 200, 'Salesforce OAuth request failed.');
    const payload = await response.json();
    requireValue(typeof payload?.access_token === 'string' && payload.access_token, 'Salesforce OAuth response lacks an access token.');
    const token = payload.access_token;
    const instanceUrl = assertSalesforceInstanceUrl(payload.instance_url, config);
    const organization = await fetcher(getSalesforceOrganizationQueryUrl(config), {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(SALESFORCE_TIMEOUT_MS),
    });
    requireValue(organization.status === 200, 'Salesforce Organization verification request failed.');
    assertSalesforceOrganization(await organization.json(), config);
    return { token, instanceUrl };
  } catch (error) {
    if (error instanceof SalesforceConfigurationError) throw error;
    throw new SalesforceConfigurationError('Salesforce authentication or Organization verification failed.');
  }
}
