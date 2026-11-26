import { mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { buildMigrationPlan, executeMigration, verifyMigrationPlan } from './customer-routing.mjs';
import {
  assertSameOrganization, createSalesforceCli, createSalesforceCliAdapter, RoutingCliError,
} from './salesforce-cli-adapter.mjs';
import { captureRoutingSnapshot } from './salesforce-routing-snapshot.mjs';

const usage = [
  'snapshot --target-org ALIAS --org-id ID --sandbox true|false [--legacy-schema] [--output FILE]',
  'plan --snapshot FILE [--output FILE]',
  'apply|rollback --target-org ALIAS --org-id ID --sandbox true|false --manifest FILE --run-id ID --attestation FILE [--output FILE]',
].join('\n');

async function privateReport(output, name, operation) {
  const directory = output ? null : await mkdtemp(join(tmpdir(), 'vpcs-routing-report-'));
  const path = output ? resolve(output) : join(directory, name + '.json');
  let file;
  try {
    file = await open(path, 'wx', 0o600);
  } catch {
    if (directory) await rm(directory, { recursive: true, force: true });
    throw new RoutingCliError('Could not reserve a new private report file');
  }
  let completed = false;
  try {
    const result = await operation();
    await file.writeFile(JSON.stringify(result, null, 2) + '\n', 'utf8');
    completed = true;
    return { path, result };
  } finally {
    try {
      await file.close();
    } finally {
      if (!completed) await rm(directory ?? path, { recursive: Boolean(directory), force: true });
    }
  }
}

async function input(path, label) {
  if (!path) throw new RoutingCliError(`An explicit ${label} file is required`);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new RoutingCliError(`Could not read JSON from the ${label} file`);
  }
}

function settings(args) {
  const [command, ...rest] = args;
  const shared = { output: { type: 'string' } };
  const orgOptions = { 'target-org': { type: 'string' }, 'org-id': { type: 'string' }, sandbox: { type: 'string' } };
  const mode = {
    snapshot: { ...orgOptions, 'legacy-schema': { type: 'boolean' } },
    plan: { snapshot: { type: 'string' } },
    apply: { ...orgOptions, manifest: { type: 'string' }, 'run-id': { type: 'string' }, attestation: { type: 'string' } },
  };
  const options = command === 'rollback' ? mode.apply : mode[command];
  if (!options || !['snapshot', 'plan', 'apply', 'rollback'].includes(command)) {
    throw new RoutingCliError('Choose an explicit command:\n' + usage);
  }
  try {
    const { values } = parseArgs({ args: rest, options: { ...shared, ...options }, strict: true });
    return { command, values };
  } catch {
    throw new RoutingCliError('Invalid operator arguments. Expected:\n' + usage);
  }
}

export async function runRoutingOperator(args, makeCli = createSalesforceCli) {
  const { command, values } = settings(args);
  if (command === 'plan') {
    const snapshot = await input(values.snapshot, 'snapshot');
    return privateReport(values.output, 'manifest', () => {
      try {
        return buildMigrationPlan(snapshot);
      } catch {
        throw new RoutingCliError('The sanitized snapshot could not produce a reviewed routing manifest');
      }
    });
  }

  if (!['true', 'false'].includes(values.sandbox)) {
    throw new RoutingCliError('Pass an explicit --sandbox true or --sandbox false');
  }
  const organization = { id: values['org-id'], isSandbox: values.sandbox === 'true' };
  assertSameOrganization(organization, organization);
  const cli = makeCli(values['target-org']);
  if (command === 'snapshot') {
    return privateReport(values.output, 'snapshot', () => captureRoutingSnapshot(cli, organization, Date.now, { legacySchema: values['legacy-schema'] }));
  }

  const plan = await input(values.manifest, 'manifest');
  let manifestFingerprint;
  try {
    manifestFingerprint = verifyMigrationPlan(plan);
  } catch {
    throw new RoutingCliError('The routing manifest fingerprint could not be verified');
  }
  assertSameOrganization(organization, plan.organization);
  if (plan.snapshotMode !== 'current-schema') {
    throw new RoutingCliError('Owner changes require a fresh current-schema snapshot. A legacy baseline is report-only');
  }
  const attestation = await input(values.attestation, 'attestation');
  const approval = {
    action: command, runId: values['run-id'], organization, manifestFingerprint,
  };
  const adapter = createSalesforceCliAdapter({ cli, approval, attestation });
  return privateReport(values.output, command + '-result', () => executeMigration(plan, approval, adapter));
}

async function main() {
  try {
    const { path, result } = await runRoutingOperator(process.argv.slice(2));
    console.log('Private routing report saved to ' + path);
    if (result.results?.some(({ status }) => status.includes('conflict') || status === 'changed-since-capture')) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof RoutingCliError ? error.message :
      'The operator command could not complete. Resume any interrupted owner changes under the same run ID to reconcile receipts';
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
