import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parse as parseDotenv } from 'dotenv';
import { resolveSalesforceEnvironment } from '../../lib/salesforce/environment.mjs';

const require = createRequire(import.meta.url);
export const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
export const nextBin = require.resolve('next/dist/bin/next');
const nextEnvModule = require.resolve('@next/env', { paths: [nextBin] });
const dotenvPreload = fileURLToPath(new URL('./next-environment-preload.cjs', import.meta.url));
const mockFontResponses = fileURLToPath(new URL('../fixtures/google-fonts-mock.json', import.meta.url));
const vercelContextKeys = ['VERCEL', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF'];
const salesforceTargetKeys = [
    'VPCS_SALESFORCE_PROFILE', 'VPCS_SALESFORCE_ORG_ID', 'SALESFORCE_LOGIN_BASE_URL',
    'VPCS_SALESFORCE_BASE_URL', 'VPCS_SALESFORCE_WEB_TO_LEAD_URL', 'SALESFORCE_AUTH_GRANT',
];
const mockSystemKeys = [
    'PATH', 'HOME', 'USER', 'TMPDIR', 'TMP', 'TEMP', 'TERM', 'LANG', 'LC_ALL',
    'CI', 'FORCE_COLOR', 'SystemRoot', 'WINDIR',
];

export const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

const previewDeploymentHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/;
const localWebsiteOrigin = /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::(\d{1,5}))?\/?$/;

function checkedLoopbackOrigin(value) {
    const match = localWebsiteOrigin.exec(value);
    const port = Number(match?.[1] ?? '80');
    if (!match || match[0] !== value || port < 1 || port > 65535) {
        throw new Error('NEXT_PUBLIC_API_BASE_URL must be an HTTP loopback origin for local Next.js.');
    }
    return new URL(value).origin;
}

function canonicalTargetSetting(key, value) {
    if (key === 'VPCS_SALESFORCE_ORG_ID' && /^(00D[A-Za-z0-9]{12})([A-Za-z0-9]{3})?$/.test(value ?? '')) {
        return value.slice(0, 15);
    }
    return key.endsWith('BASE_URL') ? value?.replace(/\/$/, '') : value;
}

/**
 * Use Next's pinned dotenv implementation, including expansion and file ordering.
 * Give each read a fresh module instance because @next/env caches its first input.
 * @param {string} directory
 * @param {'development' | 'production'} nodeEnv
 * @param {Record<string, string | undefined>} inherited
 * @param {string[]} auditedKeys
 * @returns {Record<string, string | undefined>}
 */
export function readNextEnvironment(directory, nodeEnv, inherited = process.env, auditedKeys = []) {
    const previous = process.env;
    const log = {
        info: () => {},
        error: () => { throw new Error('Next.js could not load the environment files.'); },
    };
    try {
        process.env = { ...inherited, NODE_ENV: nodeEnv };
        delete process.env.__NEXT_PROCESSED_ENV;
        delete require.cache[nextEnvModule];
        const { loadEnvConfig } = require(nextEnvModule);
        const { combinedEnv, loadedEnvFiles } = loadEnvConfig(directory, nodeEnv === 'development', log);
        const env = { ...combinedEnv };
        delete env.__NEXT_PROCESSED_ENV;

        for (const file of loadedEnvFiles) {
            const declarations = parseDotenv(file.contents);
            const declaredTargets = auditedKeys.filter(key => Object.hasOwn(declarations, key));
            if (declaredTargets.length === 0) continue;

            // Next's normal expansion overwrites lower-priority declarations
            // with inherited values. Isolate each file so a stale target is visible.
            process.env = { ...env };
            for (const key of Object.keys(declarations)) delete process.env[key];
            delete require.cache[nextEnvModule];
            const { processEnv } = require(nextEnvModule);
            const [expanded] = processEnv([{ ...file, env: {} }], directory, log, true);
            for (const key of declaredTargets) {
                if (key === 'NEXT_PUBLIC_API_BASE_URL') {
                    checkedLoopbackOrigin(expanded[key]);
                    continue;
                }
                if (canonicalTargetSetting(key, expanded[key]) !== canonicalTargetSetting(key, env[key])) {
                    throw new Error(`${file.path} declares a conflicting Salesforce target setting (${key}).`);
                }
            }
        }
        return env;
    } finally {
        process.env = previous;
        delete require.cache[nextEnvModule];
    }
}

/**
 * @param {{ command: string, requestedProfile?: string, directory?: string, inherited?: Record<string, string | undefined> }} options
 */
export function resolveLaunchEnvironment({ command, requestedProfile, directory = projectRoot, inherited = process.env }) {
    const nodeEnv = command === 'dev' ? 'development' : 'production';
    const hosted = inherited.VERCEL === '1';
    const hostedProduction = hosted && inherited.VERCEL_ENV === 'production';
    const hostedPreview = hosted && inherited.VERCEL_ENV === 'preview';
    const expectedProfile = hostedProduction ? 'production' : 'webdev';
    const profile = requestedProfile ?? expectedProfile;
    if (hosted && profile !== expectedProfile) {
        throw new Error(`This Vercel environment requires the ${expectedProfile} Salesforce profile.`);
    }
    if (hosted && !['production', 'preview', 'development'].includes(inherited.VERCEL_ENV)) {
        throw new Error('Vercel did not provide a recognized deployment environment.');
    }
    if (hostedProduction && inherited.VPCS_SALESFORCE_PROFILE !== 'production') {
        throw new Error('Vercel production requires an explicit production Salesforce profile.');
    }
    const previewHost = inherited.VERCEL_URL ?? '';
    if (hostedPreview && (previewHost !== previewHost.trim() || !previewDeploymentHost.test(previewHost) ||
        previewHost === 'veteranpcs.vercel.app' || previewHost === inherited.VERCEL_PROJECT_PRODUCTION_URL)) {
        throw new Error('Vercel Preview requires its generated deployment hostname in VERCEL_URL.');
    }

    const auditedKeys = hosted ? salesforceTargetKeys : [...salesforceTargetKeys, 'NEXT_PUBLIC_API_BASE_URL'];
    const loadedEnv = profile === 'mock'
        ? Object.fromEntries(mockSystemKeys.filter(key => inherited[key] !== undefined).map(key => [key, inherited[key]]))
        : readNextEnvironment(directory, nodeEnv, inherited, auditedKeys);
    /** @type {Record<string, string | undefined> & { NODE_ENV: 'development' | 'production' }} */
    const env = { ...loadedEnv, NODE_ENV: nodeEnv };
    if (profile !== 'mock') {
        for (const key of vercelContextKeys) {
            if (env[key] !== inherited[key]) throw new Error(`${key} must come from the hosting environment.`);
        }
        if (env.VPCS_SALESFORCE_PROFILE !== undefined && env.VPCS_SALESFORCE_PROFILE !== profile) {
            throw new Error(`VPCS_SALESFORCE_PROFILE conflicts with the requested ${profile} profile.`);
        }
    }

    if (hostedPreview) {
        if (env.VERCEL_URL !== previewHost) throw new Error('VERCEL_URL must come from the Vercel Preview environment.');
        // Use the same deployment-specific host as the WebDev form return URL.
        const origin = `https://${previewHost}`;
        if (env.NEXT_PUBLIC_API_BASE_URL && env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '') !== origin) {
            throw new Error('NEXT_PUBLIC_API_BASE_URL must match the current Vercel Preview deployment origin.');
        }
        env.NEXT_PUBLIC_API_BASE_URL = origin;
    } else if (!hosted) {
        if (env.NEXT_PUBLIC_API_BASE_URL !== undefined) {
            env.NEXT_PUBLIC_API_BASE_URL = checkedLoopbackOrigin(env.NEXT_PUBLIC_API_BASE_URL);
        } else if (command === 'build') {
            env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3000';
        }
    }

    // Vercel controls the production and preview artifact directory. Local
    // builds and development caches have separate directories per profile.
    const distDir = hosted ? '.next' : profile === 'mock' ? '.next-mock' : '.next-sandbox';
    env.VPCS_NEXT_DIST_DIR = distDir;
    env.VPCS_SALESFORCE_PROFILE = profile;
    if (profile !== 'production') env.NEXT_TELEMETRY_DISABLED = '1';
    if (profile === 'mock') env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = mockFontResponses;

    const config = resolveSalesforceEnvironment(env);
    // Use the resolved snapshot throughout Next and its workers. This also
    // prevents a dotenv edit after preflight from changing the target in dev.
    env.NODE_OPTIONS = [env.NODE_OPTIONS, `--require ${JSON.stringify(dotenvPreload)}`].filter(Boolean).join(' ');
    return { config, distDir, env, hosted };
}

export function salesforceTargetFingerprint({ profile, orgId, restOrigin, cacheKey }) {
    return createHash('sha256').update(JSON.stringify({ profile, orgId: orgId.slice(0, 15), restOrigin, cacheKey })).digest('hex');
}
