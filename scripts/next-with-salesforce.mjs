#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { authenticateSalesforce } from '../lib/salesforce/environment.mjs';
import {
    loopbackHosts, nextBin, projectRoot, resolveLaunchEnvironment, salesforceTargetFingerprint,
} from './lib/next-environment.mjs';

const profiles = new Set(['webdev', 'mock']);
const commands = new Set(['dev', 'build', 'start']);

export function nextOptions(command, args, { hosted, env }) {
    const { values } = parseArgs({
        args,
        options: command === 'start' ? {
            hostname: { type: 'string', short: 'H' },
            port: { type: 'string', short: 'p' },
        } : {
            webpack: { type: 'boolean' },
            turbopack: { type: 'boolean' },
            turbo: { type: 'boolean' },
            ...(command === 'dev' && {
                hostname: { type: 'string', short: 'H' },
                port: { type: 'string', short: 'p' },
            }),
        },
    });
    const result = Object.entries(values).flatMap(([key, value]) => value === true ? [`--${key}`] : []);
    if (command === 'build') return result;

    const localWebdev = !hosted && env.VPCS_SALESFORCE_PROFILE === 'webdev';
    const configuredOrigin = localWebdev && env.NEXT_PUBLIC_API_BASE_URL
        ? new URL(env.NEXT_PUBLIC_API_BASE_URL) : undefined;
    const hostname = values.hostname ?? configuredOrigin?.hostname ?? '127.0.0.1';
    const port = values.port ?? env.PORT ?? (configuredOrigin ? configuredOrigin.port || '80' : '3000');
    if (!hosted && !loopbackHosts.has(hostname)) throw new Error('Local Next.js servers require a loopback hostname.');
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
        throw new Error('Next.js requires a valid TCP port.');
    }
    const localOrigin = new URL(`http://${hostname === '::1' ? '[::1]' : hostname}:${port}`).origin;
    if (configuredOrigin && configuredOrigin.origin !== localOrigin) {
        throw new Error('NEXT_PUBLIC_API_BASE_URL must match the local Next.js hostname and port.');
    }
    env.NEXT_PUBLIC_API_BASE_URL ??= localOrigin;
    if (localWebdev) env.VPCS_WEBDEV_SITE_ORIGIN = localOrigin;
    return ['--hostname', hostname === '[::1]' ? '::1' : hostname, '--port', port, ...result];
}

function readBuildId(distPath) {
    return readFileSync(join(distPath, 'BUILD_ID'), 'utf8').trim();
}

/**
 * @param {string} distPath
 * @param {import('../lib/salesforce/environment.mjs').SalesforceEnvironment} config
 * @param {string} [localSiteOrigin]
 */
export function verifyBuildStamp(distPath, config, localSiteOrigin) {
    try {
        const stamp = JSON.parse(readFileSync(join(distPath, 'vpcs-salesforce-target.json'), 'utf8'));
        const buildId = readBuildId(distPath);
        if (buildId && stamp.buildId === buildId && stamp.profile === config.profile
            && stamp.target === salesforceTargetFingerprint(config) && stamp.localSiteOrigin === localSiteOrigin) return;
    } catch {
        // Missing, unreadable and malformed metadata all fail closed.
    }
    throw new Error(`Build artifact does not match the ${config.profile} Salesforce target or local website origin. Rebuild with the matching build command and origin.`);
}

function stampBuild(distPath, config, localSiteOrigin) {
    const buildId = readBuildId(distPath);
    if (!buildId) throw new Error('Next.js did not produce a build ID.');
    const stampPath = join(distPath, 'vpcs-salesforce-target.json');
    const pendingPath = `${stampPath}.${randomUUID()}.tmp`;
    const stamp = { buildId, profile: config.profile, target: salesforceTargetFingerprint(config), localSiteOrigin };
    try {
        writeFileSync(pendingPath, JSON.stringify(stamp) + '\n', { flag: 'wx' });
        renameSync(pendingPath, stampPath);
    } finally {
        rmSync(pendingPath, { force: true });
    }
}

export async function runNext(command, requestedProfile, args, { fixture = false } = {}) {
    if (!commands.has(command) || (requestedProfile !== undefined && !profiles.has(requestedProfile))) {
        throw new Error('Expected a Next.js command with an optional webdev or mock profile.');
    }
    const settings = resolveLaunchEnvironment({ command, requestedProfile });
    const { config, distDir, env } = settings;
    const options = nextOptions(command, args, settings);
    const localSiteOrigin = !settings.hosted && config.profile === 'webdev' ? env.NEXT_PUBLIC_API_BASE_URL : undefined;
    const distPath = join(projectRoot, distDir);
    if (command === 'start') verifyBuildStamp(distPath, config, localSiteOrigin);
    if (config.profile !== 'mock') await authenticateSalesforce(config, env);
    if (fixture) {
        if (config.profile !== 'mock' || command !== 'dev') throw new Error('Browser fixtures require mock development.');
        env.LEAD_DRY_RUN = '1';
        env.VPCS_BROWSER_FIXTURE = '1';
        env.NEXT_PUBLIC_CONCIERGE_ENABLED = '1';
    }

    if (command === 'start' && config.profile !== 'mock') verifyBuildStamp(distPath, config, localSiteOrigin);
    if (command === 'build') rmSync(join(distPath, 'vpcs-salesforce-target.json'), { force: true });
    const child = spawn(process.execPath, [nextBin, command, ...options], { cwd: projectRoot, stdio: 'inherit', env });
    const relay = signal => child.kill(signal);
    const interrupt = () => relay('SIGINT');
    const terminate = () => relay('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    try {
        const { code, signal } = await new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('exit', (code, signal) => resolve({ code, signal }));
        });
        if (code === 0 && command === 'build') stampBuild(distPath, config, localSiteOrigin);
        return code ?? (signal === 'SIGINT' ? 130 : 143);
    } finally {
        process.off('SIGINT', interrupt);
        process.off('SIGTERM', terminate);
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const [command, ...args] = process.argv.slice(2);
    const profileArg = args[0]?.startsWith('--salesforce-profile=') ? args.shift() : undefined;
    const requestedProfile = profileArg?.slice('--salesforce-profile='.length);
    try {
        process.exitCode = await runNext(command, requestedProfile, args);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
