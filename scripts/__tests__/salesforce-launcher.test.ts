import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mockMetadata from '../../config/salesforce/mock.json';
import productionMetadata from '../../config/salesforce/production.json';
import { authenticateSalesforce } from '../../lib/salesforce/environment.mjs';
import { readNextEnvironment, resolveLaunchEnvironment, salesforceTargetFingerprint } from '../lib/next-environment.mjs';
import { nextOptions, verifyBuildStamp } from '../next-with-salesforce.mjs';

const sandbox = 'https://veteranpcs--webdev.sandbox.my.salesforce.com';
const production = 'https://veteranpcs.my.salesforce.com';
const orgId = '00DTESTORG00001';
const syntheticToken = 'local-synthetic-token';
const sandboxEnv = {
    VPCS_SALESFORCE_ORG_ID: orgId,
    VPCS_SALESFORCE_METADATA_JSON: JSON.stringify({ ...mockMetadata, orgId }),
    SALESFORCE_LOGIN_BASE_URL: sandbox,
    VPCS_SALESFORCE_BASE_URL: sandbox,
    VPCS_SALESFORCE_WEB_TO_LEAD_URL: 'https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
    SALESFORCE_API_VERSION: 'v62.0',
    SALESFORCE_AUTH_GRANT: 'client_credentials',
    SALESFORCE_CLIENT_ID: 'synthetic-client',
    SALESFORCE_CLIENT_SECRET: 'synthetic-secret',
};
const productionEnv = {
    VERCEL: '1',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: 'main',
    VPCS_SALESFORCE_PROFILE: 'production',
    VPCS_DELIVERY_MODE: 'live',
    VPCS_SALESFORCE_ORG_ID: productionMetadata.orgId,
    SALESFORCE_LOGIN_BASE_URL: production,
    VPCS_SALESFORCE_BASE_URL: production,
    VPCS_SALESFORCE_WEB_TO_LEAD_URL: 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8',
    SALESFORCE_API_VERSION: 'v62.0',
    SALESFORCE_AUTH_GRANT: 'client_credentials',
};
const previewEnv = {
    ...sandboxEnv,
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'codex/salesforce-workflow-test',
    VERCEL_URL: 'veteranpcs-abc123-webdev-team.vercel.app',
    VERCEL_BRANCH_URL: 'veteranpcs-git-workflow-test-webdev-team.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'www.veteranpcs.com',
};
let directory: string;

beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'vpcs-launcher-test-')); });
afterEach(() => { rmSync(directory, { force: true, recursive: true }); });

describe('Next Salesforce launcher', () => {
    it('uses inherited, mode-local, local, mode and generic files in Next precedence order', () => {
        writeFileSync(join(directory, '.env'), 'GENERAL=base\nPRECEDENCE=base\n');
        writeFileSync(join(directory, '.env.local'), 'LOCAL=local\nPRECEDENCE=local\n');
        writeFileSync(join(directory, '.env.production'), 'MODE=production\nPRECEDENCE=mode\n');
        writeFileSync(join(directory, '.env.production.local'), 'PRECEDENCE=production-local\n');
        writeFileSync(join(directory, '.env.development.local'), 'PRECEDENCE=development-local\n');
        expect(readNextEnvironment(directory, 'production', { PRECEDENCE: 'inherited' })).toMatchObject({
            GENERAL: 'base', LOCAL: 'local', MODE: 'production', PRECEDENCE: 'inherited', NODE_ENV: 'production',
        });
        expect(readNextEnvironment(directory, 'production', {}).PRECEDENCE).toBe('production-local');
        expect(readNextEnvironment(directory, 'development', {}).PRECEDENCE).toBe('development-local');
    });

    it('refuses inherited or mode-local production Salesforce keys in a local Next production-mode build', () => {
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, VPCS_SALESFORCE_BASE_URL: production, NODE_ENV: 'production',
        } })).toThrow('VPCS_SALESFORCE_BASE_URL');
        const { VPCS_SALESFORCE_BASE_URL, ...inherited } = sandboxEnv;
        writeFileSync(join(directory, '.env.production.local'), `VPCS_SALESFORCE_BASE_URL=${production}\n`);
        writeFileSync(join(directory, '.env.development.local'), `VPCS_SALESFORCE_BASE_URL=${VPCS_SALESFORCE_BASE_URL}\n`);
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited })).toThrow('VPCS_SALESFORCE_BASE_URL');
        expect(resolveLaunchEnvironment({ command: 'dev', directory, inherited }).config.profile).toBe('webdev');
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: sandboxEnv }))
            .toThrow('.env.production.local declares a conflicting Salesforce target setting (VPCS_SALESFORCE_BASE_URL)');
    });

    it('rejects a stale production origin hidden below a valid sandbox dotenv entry', () => {
        const { VPCS_SALESFORCE_BASE_URL, ...inherited } = sandboxEnv;
        writeFileSync(join(directory, '.env.local'), `VPCS_SALESFORCE_BASE_URL=${VPCS_SALESFORCE_BASE_URL}\n`);
        writeFileSync(join(directory, '.env.production'), `VPCS_SALESFORCE_BASE_URL=${production}\n`);
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited }))
            .toThrow('.env.production declares a conflicting Salesforce target setting (VPCS_SALESFORCE_BASE_URL)');
        expect(resolveLaunchEnvironment({ command: 'dev', directory, inherited }).config.profile).toBe('webdev');
    });

    it('audits expanded settings without mistaking an equivalent org origin for a conflict', () => {
        writeFileSync(join(directory, '.env.local'), `SANDBOX_ORIGIN=${sandbox}\nSALESFORCE_LOGIN_BASE_URL=$SANDBOX_ORIGIN/\n`);
        expect(resolveLaunchEnvironment({ command: 'dev', directory, inherited: sandboxEnv }).config.loginOrigin).toBe(sandbox);
    });

    it('blocks an actual external socket in the Vitest worker', () => {
        const socket = new Socket();
        expect(() => socket.connect({ host: 'external.invalid', port: 443 }))
            .toThrow('External network connections are disabled in mock mode');
    });

    it('rejects conflicting profiles and hosting context from dotenv files', () => {
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, VPCS_SALESFORCE_PROFILE: 'production',
        } })).toThrow('conflicts');
        writeFileSync(join(directory, '.env.local'), 'VERCEL=1\nVERCEL_ENV=production\nVERCEL_GIT_COMMIT_REF=main\n');
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: sandboxEnv })).toThrow('hosting environment');
    });

    it('allows explicit production on hosted main and webdev on Vercel previews', () => {
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: productionEnv })).toMatchObject({
            config: { profile: 'production', restOrigin: production }, distDir: '.next', hosted: true,
        });
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...productionEnv, VPCS_SALESFORCE_PROFILE: undefined,
        } })).toThrow('explicit production');
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...productionEnv, VERCEL_GIT_COMMIT_REF: 'feature-branch',
        } })).toThrow('Vercel production main');
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, VERCEL_GIT_COMMIT_REF: 'feature-branch',
            VPCS_SANDBOX_LEAD_WRITES: '1', VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
        } })).toMatchObject({ config: { profile: 'webdev', allowSandboxWrites: false }, distDir: '.next' });
    });

    it('uses the generated deployment origin for protected Preview links and callback context', () => {
        const expected = `https://${previewEnv.VERCEL_URL}`;
        const { env, config } = resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, VPCS_SANDBOX_PREVIEW_PROTECTED: '1', VPCS_SANDBOX_LEAD_WRITES: '1', VPCS_WEBDEV_ISOLATION_ATTESTED: '1',
        } });
        expect(config.allowSandboxWrites).toBe(true);
        expect(env.VERCEL_URL).toBe(previewEnv.VERCEL_URL);
        expect(env.NEXT_PUBLIC_API_BASE_URL).toBe(expected);
        expect(env.NEXT_PUBLIC_API_BASE_URL).not.toContain(previewEnv.VERCEL_BRANCH_URL);
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, NEXT_PUBLIC_API_BASE_URL: `${expected}/`,
        } }).env.NEXT_PUBLIC_API_BASE_URL).toBe(expected);
    });

    it.each([
        'https://www.veteranpcs.com',
        'https://veteranpcs.vercel.app',
        `https://${previewEnv.VERCEL_BRANCH_URL}`,
        `https://${previewEnv.VERCEL_URL}/another-path`,
    ])('rejects a Preview base URL outside the generated origin (%s)', (value) => {
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, NEXT_PUBLIC_API_BASE_URL: value,
        } })).toThrow('NEXT_PUBLIC_API_BASE_URL must match the current Vercel Preview deployment origin');
    });

    it.each([undefined, 'veteranpcs.vercel.app', 'https://not-a-host.vercel.app', 'preview.vercel.app:443', 'a.vercel.app.attacker.invalid', 'preview.vercel.app\n'])(
        'requires a non-production generated Preview hostname (%s)', (host) => {
            expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
                ...previewEnv, VERCEL_URL: host,
            } })).toThrow('generated deployment hostname');
        },
    );

    it('does not accept a production alias supplied as the Preview deployment URL', () => {
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, VERCEL_PROJECT_PRODUCTION_URL: previewEnv.VERCEL_URL,
        } })).toThrow('generated deployment hostname');
    });

    it('does not take VERCEL_URL from dotenv if the hosting environment omitted it', () => {
        writeFileSync(join(directory, '.env.local'), `VERCEL_URL=${previewEnv.VERCEL_URL}\n`);
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...previewEnv, VERCEL_URL: undefined,
        } })).toThrow('generated deployment hostname');
    });

    it('preserves the configured production and local build origins and defaults local links to loopback', () => {
        const productionOrigin = 'https://www.veteranpcs.com';
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...productionEnv, VERCEL_URL: 'veteranpcs-prod-example.vercel.app', NEXT_PUBLIC_API_BASE_URL: productionOrigin,
        } }).env.NEXT_PUBLIC_API_BASE_URL).toBe(productionOrigin);
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: productionEnv }).env.NEXT_PUBLIC_API_BASE_URL).toBeUndefined();
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: sandboxEnv }).env.NEXT_PUBLIC_API_BASE_URL).toBe('http://127.0.0.1:3000');
        expect(resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3210/',
        } }).env.NEXT_PUBLIC_API_BASE_URL).toBe('http://localhost:3210');
    });

    it.each(['dev', 'build', 'start'])('rejects the production website origin before local %s', command => {
        expect(() => resolveLaunchEnvironment({ command, directory, inherited: {
            ...sandboxEnv, NEXT_PUBLIC_API_BASE_URL: 'https://www.veteranpcs.com',
        } })).toThrow('NEXT_PUBLIC_API_BASE_URL must be an HTTP loopback origin');
    });

    it.each([
        'http://localhost.example.com:3100',
        'https://127.0.0.1:3100',
        'http://localhost@127.0.0.1:3100',
        'http://127.0.0.1:3100/thank-you',
        'http://127.0.0.1:3100/?code=test',
        'http://127.0.0.1:3100/#test',
        'http://127.0.0.1:0',
        'http://[::1]:65536',
        'http://127.0.0.1:3100\n',
    ])('rejects an invalid local website origin (%s)', value => {
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, NEXT_PUBLIC_API_BASE_URL: value,
        } })).toThrow('NEXT_PUBLIC_API_BASE_URL must be an HTTP loopback origin');
    });

    it('rejects a hidden production website origin from a lower-priority dotenv file', () => {
        writeFileSync(join(directory, '.env.local'), 'NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3100\n');
        writeFileSync(join(directory, '.env.production'), 'NEXT_PUBLIC_API_BASE_URL=https://www.veteranpcs.com\n');
        expect(() => resolveLaunchEnvironment({ command: 'build', directory, inherited: sandboxEnv }))
            .toThrow('NEXT_PUBLIC_API_BASE_URL must be an HTTP loopback origin');
    });

    it('uses normal Next precedence among safe loopback origins', () => {
        writeFileSync(join(directory, '.env.local'), 'NEXT_PUBLIC_API_BASE_URL=http://localhost:3000\n');
        writeFileSync(join(directory, '.env.production'), 'NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3200\n');
        const { env } = resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3100',
        } });
        expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('http://127.0.0.1:3100');
    });

    it('requires a configured WebDev origin to match the actual listener', () => {
        const settings = resolveLaunchEnvironment({ command: 'dev', directory, inherited: {
            ...sandboxEnv, PORT: '3210', NEXT_PUBLIC_API_BASE_URL: 'http://[::1]:3210/',
        } });
        expect(nextOptions('dev', [], settings)).toEqual(['--hostname', '::1', '--port', '3210']);
        expect(settings.env).toMatchObject({
            NEXT_PUBLIC_API_BASE_URL: 'http://[::1]:3210', VPCS_WEBDEV_SITE_ORIGIN: 'http://[::1]:3210',
        });
        expect(() => nextOptions('dev', ['--port', '3211'], settings)).toThrow('must match the local Next.js hostname and port');
        expect(() => nextOptions('dev', ['--hostname', 'localhost'], settings)).toThrow('must match the local Next.js hostname and port');
    });

    it('gives a mock child an offline profile with no inherited or dotenv secrets', () => {
        writeFileSync(join(directory, '.env.production.local'), 'SALESFORCE_CLIENT_SECRET=dotenv-secret\n');
        const { env, config, distDir } = resolveLaunchEnvironment({ command: 'build', requestedProfile: 'mock', directory,
            inherited: { ...sandboxEnv, OPEN_PHONE_API_KEY: 'synthetic-phone-credential', VPCS_SALESFORCE_PROFILE: 'webdev',
                NEXT_PUBLIC_API_BASE_URL: 'https://www.veteranpcs.com' },
        });
        expect(config.profile).toBe('mock');
        expect(config.allowSandboxWrites).toBe(false);
        expect(distDir).toBe('.next-mock');
        expect(env.SALESFORCE_CLIENT_SECRET).toBeUndefined();
        expect(env.OPEN_PHONE_API_KEY).toBeUndefined();
        expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('http://127.0.0.1:3000');
        const child = spawnSync(process.execPath, ['-e', `
            const dotenv = require('@next/env');
            dotenv.loadEnvConfig(${JSON.stringify(directory)}, false, console, true);
            if (process.env.SALESFORCE_CLIENT_SECRET) process.exit(81);
            require('node:https').get('https://external.invalid/', () => process.exit(82));
        `], { env, encoding: 'utf8', timeout: 5_000 });
        expect(child.status).toBe(1);
        expect(child.stderr).toContain('External network connections are disabled in mock mode');
        expect(child.stderr).not.toContain('dotenv-secret');
    });

    it('refuses missing, stale and mismatched build stamps', () => {
        const { config } = resolveLaunchEnvironment({ command: 'build', requestedProfile: 'mock', directory, inherited: {} });
        writeFileSync(join(directory, 'BUILD_ID'), 'actual-id');
        expect(() => verifyBuildStamp(directory, config)).toThrow('Build artifact does not match');
        const stamp = { buildId: 'actual-id', profile: 'mock', target: salesforceTargetFingerprint(config) };
        const stampPath = join(directory, 'vpcs-salesforce-target.json');
        writeFileSync(stampPath, JSON.stringify(stamp));
        expect(() => verifyBuildStamp(directory, config)).not.toThrow();
        expect(() => verifyBuildStamp(directory, { ...config, orgId })).toThrow('Build artifact does not match');
        expect(() => verifyBuildStamp(directory, { ...config, cacheKey: 'changed-metadata' })).toThrow('Build artifact does not match');
        writeFileSync(stampPath, JSON.stringify({ ...stamp, buildId: 'stale-id' }));
        expect(() => verifyBuildStamp(directory, config)).toThrow('Build artifact does not match');
    });

    it('refuses a WebDev artifact built for a different loopback hostname or port', () => {
        const build = resolveLaunchEnvironment({ command: 'build', directory, inherited: {
            ...sandboxEnv, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3100',
        } });
        writeFileSync(join(directory, 'BUILD_ID'), 'site-build');
        const stampPath = join(directory, 'vpcs-salesforce-target.json');
        const stamp = { buildId: 'site-build', profile: 'webdev', target: salesforceTargetFingerprint(build.config) };
        const start = (args: string[]) => {
            const settings = resolveLaunchEnvironment({ command: 'start', directory, inherited: sandboxEnv });
            nextOptions('start', args, settings);
            return verifyBuildStamp(directory, settings.config, settings.env.NEXT_PUBLIC_API_BASE_URL);
        };
        writeFileSync(stampPath, JSON.stringify(stamp));
        expect(() => start(['--port', '3100'])).toThrow('local website origin');
        writeFileSync(stampPath, JSON.stringify({ ...stamp, localSiteOrigin: build.env.NEXT_PUBLIC_API_BASE_URL }));
        expect(() => start(['--port', '3100'])).not.toThrow();
        expect(() => start(['--port', '3101'])).toThrow('local website origin');
        expect(() => start(['--hostname', 'localhost', '--port', '3100'])).toThrow('local website origin');
    });
});

describe('standalone Salesforce OAuth preflight', () => {
    it('rejects a cross-host OAuth redirect without making a second request', async () => {
        const { config } = resolveLaunchEnvironment({ command: 'dev', directory, inherited: sandboxEnv });
        const fetcher = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
            expect(options?.redirect).toBe('error');
            return new Response(null, { status: 307, headers: { Location: `${production}/services/oauth2/token` } });
        });
        await expect(authenticateSalesforce(config, sandboxEnv, fetcher)).rejects.toThrow('OAuth request failed');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('rejects an instance mismatch before passing the token to REST', async () => {
        const { config } = resolveLaunchEnvironment({ command: 'dev', directory, inherited: sandboxEnv });
        const fetcher = vi.fn(async () => Response.json({ access_token: syntheticToken, instance_url: production }));
        await expect(authenticateSalesforce(config, sandboxEnv, fetcher)).rejects.toThrow('instance_url');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('requires the verified Salesforce Organization ID and sandbox status before returning a token', async () => {
        const { config } = resolveLaunchEnvironment({ command: 'dev', directory, inherited: sandboxEnv });
        const fetcher = vi.fn(async () => Response.json({ records: [{ Id: orgId, IsSandbox: false }] }))
            .mockResolvedValueOnce(Response.json({ access_token: syntheticToken, instance_url: sandbox }));
        await expect(authenticateSalesforce(config, sandboxEnv, fetcher)).rejects.toThrow('Organization identity');
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
