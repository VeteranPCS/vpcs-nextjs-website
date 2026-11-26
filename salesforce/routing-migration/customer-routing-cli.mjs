import { readFile } from 'node:fs/promises';
import { buildMigrationPlan, verifyMigrationPlan, verifyMigrationSnapshot } from './customer-routing.mjs';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [command = 'plan', first, second, action, ...extra] = process.argv.slice(2);
try {
  if (!extra.length && command === 'plan' && first && !second) {
    console.log(JSON.stringify(buildMigrationPlan(await readJson(first)), null, 2));
  } else if (!extra.length && command === 'verify' && first) {
    const plan = await readJson(first);
    const fingerprint = verifyMigrationPlan(plan);
    const records = second ? verifyMigrationSnapshot(plan, await readJson(second), action) : undefined;
    console.log(JSON.stringify({ fingerprint, records }, null, 2));
    if (records?.some(({ status }) => status !== 'verified')) process.exitCode = 1;
  } else {
    throw new Error('Usage: customer-routing-cli.mjs plan snapshot.json | verify manifest.json [snapshot.json [apply|rollback]]');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
