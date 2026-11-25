import { runNext } from '../scripts/next-with-salesforce.mjs';
import { loopbackHosts } from '../scripts/lib/next-environment.mjs';

const origin = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100');
if (origin.protocol !== 'http:' || !loopbackHosts.has(origin.hostname) || origin.href !== `${origin.origin}/`) {
    throw new Error('Fixture server requires a loopback HTTP origin.');
}

process.exitCode = await runNext('dev', 'mock', [
    '--hostname', origin.hostname, '--port', origin.port || '80',
], { fixture: true });
