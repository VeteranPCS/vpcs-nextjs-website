import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { startIsolatedLeadRedis } from './lib/isolated-lead-redis.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const commands = {
  dev: ['scripts/next-with-salesforce.mjs', 'dev', '--salesforce-profile=webdev'],
  rehearsal: ['scripts/verify-salesforce-sandbox-leads.mjs'],
};

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!Object.hasOwn(commands, command)) {
    throw new Error('Usage: node scripts/with-isolated-lead-redis.mjs <dev|rehearsal> [args]');
  }
  if (process.env.VERCEL || process.env.VERCEL_ENV ||
      (process.env.VPCS_SALESFORCE_PROFILE && process.env.VPCS_SALESFORCE_PROFILE !== 'webdev')) {
    throw new Error('Isolated lead Redis is available only for local Salesforce WebDev.');
  }

  const harness = await startIsolatedLeadRedis();
  const child = spawn(process.execPath, [...commands[command], ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      VPCS_WEBDEV_LEAD_REDIS_URL: harness.url,
      VPCS_WEBDEV_LEAD_REDIS_TOKEN: harness.token,
    },
  });
  const stop = () => child.kill('SIGTERM');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const [code] = await once(child, 'exit');
    process.exitCode = code ?? 1;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await harness.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
