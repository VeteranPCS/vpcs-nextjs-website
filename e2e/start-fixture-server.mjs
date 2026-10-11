import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const origin = new URL(baseURL);
if (!['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Fixture server must be local');
// The production code is unchanged. Omitting review credentials selects the
// repository's genuine, versioned review corpus for repeatable browser captures.
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', origin.hostname, '--port', origin.port || '3100'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: baseURL, LEAD_DRY_RUN: '1', NEXT_PUBLIC_CONCIERGE_ENABLED: '1', GOOGLE_SERVICE_ACCOUNT_CREDENTIALS: '' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 0; });
