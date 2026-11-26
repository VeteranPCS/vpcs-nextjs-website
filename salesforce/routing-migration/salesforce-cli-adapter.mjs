import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

export class RoutingCliError extends Error {}

const runFile = promisify(execFile);
const idPattern = /^[a-z0-9]{15}([a-z0-9]{3})?$/i;
const aliasPattern = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;
const digestPattern = /^[a-f0-9]{64}$/;
const runPattern = /^[a-z0-9][a-z0-9_-]{2,63}$/i;
const maxWindowMs = 2 * 60 * 60 * 1000;
const requiredAttestations = [
  'reviewedManifest',
  'nativeFlowContainmentVerified',
  'pendingTimerPreservationVerified',
  'dispatchPaused',
  'legacySmsReconciled',
];

export function salesforceId(value) {
  return typeof value === 'string' && idPattern.test(value);
}

export function sameSalesforceId(left, right) {
  return salesforceId(left) && salesforceId(right) && left.slice(0, 15) === right.slice(0, 15);
}

function validOrganization(value) {
  return salesforceId(value?.id) && value.id.startsWith('00D') && typeof value.isSandbox === 'boolean';
}

export function assertSameOrganization(expected, actual) {
  if (!validOrganization(expected) || !validOrganization(actual) ||
    !sameSalesforceId(expected.id, actual.id) || expected.isSandbox !== actual.isSandbox) {
    throw new RoutingCliError('Expected and live Salesforce Organization identities differ');
  }
}

async function invokeSalesforce(args) {
  const { stdout } = await runFile('sf', args, {
    encoding: 'utf8',
    timeout: 90_000,
    killSignal: 'SIGKILL',
    maxBuffer: 24 * 1024 * 1024,
    env: { ...process.env, SF_DISABLE_TELEMETRY: 'true', SF_LOG_LEVEL: 'error' },
  });
  return stdout;
}

export function createSalesforceCli(targetOrg, invoke = invokeSalesforce) {
  if (!aliasPattern.test(targetOrg ?? '')) throw new RoutingCliError('An explicit Salesforce CLI alias is required');
  async function command(args, failure) {
    try {
      const output = JSON.parse(await invoke([...args, '--target-org', targetOrg, '--json']));
      if (output.status !== 0 || !output.result) throw new Error();
      return output.result;
    } catch {
      // The CLI error object may contain Salesforce logs, SOQL results, or auth metadata.
      throw new RoutingCliError(failure);
    }
  }

  async function query(soql, label) {
    const result = await command(['data', 'query', '--query', soql], `Salesforce query failed: ${label}`);
    if (!Array.isArray(result.records) || result.done === false ||
      result.totalSize !== result.records.length) {
      throw new RoutingCliError(`Salesforce query did not return a complete result: ${label}`);
    }
    return result.records;
  }

  return {
    query,
    async getOrganization() {
      const records = await query('SELECT Id, IsSandbox FROM Organization LIMIT 2', 'Organization identity');
      const actual = { id: records[0]?.Id, isSandbox: records[0]?.IsSandbox };
      if (records.length !== 1 || !validOrganization(actual)) {
        throw new RoutingCliError('Salesforce returned an invalid Organization identity');
      }
      return actual;
    },
    async runApex(makeExpression) {
      const marker = 'VPCS_ROUTING_' + randomBytes(16).toString('hex') + ':';
      const apex = `String outcome = ${makeExpression()};\n` +
        `System.debug(LoggingLevel.ERROR, '${marker}' + EncodingUtil.base64Encode(Blob.valueOf(outcome == null ? 'null' : outcome)));\n`;
      const temporary = await mkdtemp(join(tmpdir(), 'vpcs-routing-apex-'));
      try {
        const file = join(temporary, 'operator.apex');
        await writeFile(file, apex, { mode: 0o600, flag: 'wx' });
        const result = await command(['apex', 'run', '--file', file], 'Salesforce operator Apex command did not complete');
        if (result.compiled !== true || result.success !== true) {
          throw new RoutingCliError('Salesforce operator Apex command did not complete');
        }
        return extractApexResult(result.logs, marker);
      } finally {
        await rm(temporary, { recursive: true, force: true });
      }
    },
  };
}

export function extractApexResult(logs, marker) {
  const rows = typeof logs === 'string' ? logs.split(/\r?\n/) : [];
  const prefix = '|ERROR|' + marker;
  const results = rows.flatMap((row) => {
    if (!row.includes('|USER_DEBUG|')) return [];
    const index = row.indexOf(prefix);
    return index === -1 ? [] : [row.slice(index + prefix.length)];
  });
  if (results.length !== 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(results[0]) || results[0].length % 4 !== 0) {
    throw new RoutingCliError('Salesforce operator response marker was missing or ambiguous');
  }
  try {
    const data = Buffer.from(results[0], 'base64');
    if (data.toString('base64') !== results[0]) throw new Error();
    return JSON.parse(data.toString('utf8'));
  } catch {
    throw new RoutingCliError('Salesforce operator response was invalid');
  }
}

export async function countLegacyPendingSms(cli, { hasRelationships = true } = {}) {
  const records = await cli.query(
    "SELECT COUNT(Id) pendingCount FROM SMS_Message_Queue__c WHERE " +
    "Status__c IN ('New','Retry','Processing')" +
    (hasRelationships ? ' AND Related_Lead__c = null AND Related_Opportunity__c = null' : ''),
    'unlinked pending SMS',
  );
  const count = records[0]?.pendingCount;
  if (records.length !== 1 || !Number.isSafeInteger(count) || count < 0) {
    throw new RoutingCliError('Salesforce did not return a valid unlinked pending SMS count');
  }
  return count;
}

export function assertOperatorAttestation(approval, attestation, now = Date.now()) {
  if (!['apply', 'rollback'].includes(approval?.action) || !runPattern.test(approval.runId ?? '') ||
    !digestPattern.test(approval.manifestFingerprint ?? '') || !validOrganization(approval.organization)) {
    throw new RoutingCliError('Explicit action, run ID, Organization, and reviewed manifest fingerprint are required');
  }
  if (attestation?.action !== approval.action || attestation?.runId !== approval.runId ||
    attestation?.manifestFingerprint !== approval.manifestFingerprint ||
    requiredAttestations.some((flag) => attestation?.[flag] !== true)) {
    throw new RoutingCliError('Attestation must approve this exact run and confirm native containment, timer preservation, paused dispatch, and legacy SMS reconciliation');
  }
  assertSameOrganization(approval.organization, attestation.organization);
  const issued = Date.parse(attestation.issuedAt);
  const expires = Date.parse(attestation.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now || expires <= now ||
    expires <= issued || expires - issued > maxWindowMs) {
    throw new RoutingCliError('Operator attestation must be current and cover at most two hours');
  }
}

export function createSalesforceCliAdapter({ cli, approval, attestation, clock = Date.now }) {
  const guard = () => assertOperatorAttestation(approval, attestation, clock());
  guard();
  const { id, isSandbox } = approval.organization;
  async function getReceipt(key) {
    if (!digestPattern.test(key ?? '')) throw new RoutingCliError('Invalid operator receipt key');
    const receipt = await cli.runApex(() => `VpcsRoutingMigration.getReceipt('${id}', ${isSandbox}, '${key}')`);
    if (receipt !== null && (!receipt?.before || !receipt?.after)) {
      throw new RoutingCliError('Salesforce returned an invalid migration receipt');
    }
    return receipt;
  }

  return {
    async getOrganization() {
      guard();
      const queried = await cli.getOrganization();
      assertSameOrganization(approval.organization, queried);
      const verified = await cli.runApex(() => 'VpcsRoutingMigration.getOrganization()');
      assertSameOrganization(approval.organization, verified);
      if (await countLegacyPendingSms(cli) !== 0) {
        throw new RoutingCliError('Unlinked pending SMS remains. Reconcile it before starting this run');
      }
      return verified;
    },
    getReceipt,
    async compareAndSetOwner(request) {
      guard();
      if (!digestPattern.test(request?.idempotencyKey ?? '')) throw new RoutingCliError('Invalid operator receipt key');
      const current = await cli.getOrganization();
      assertSameOrganization(approval.organization, current);
      if (await countLegacyPendingSms(cli) !== 0) {
        throw new RoutingCliError('Unlinked pending SMS remains. Reconcile it before resuming this run');
      }
      guard();
      const body = JSON.stringify({
        organizationId: id,
        isSandbox,
        manifestFingerprint: approval.manifestFingerprint,
        runId: approval.runId,
        action: approval.action,
        request,
      });
      const encoded = Buffer.from(body, 'utf8').toString('base64');
      if (encoded.length > 40_000) throw new RoutingCliError('Owner change request exceeds the safe Apex input size');
      try {
        const result = await cli.runApex(() =>
          `VpcsRoutingMigration.executeOwnerOnly(EncodingUtil.base64Decode('${encoded}').toString())`);
        if (result?.conflict === true || (result?.before && result?.after)) return result;
        throw new RoutingCliError('Salesforce returned an invalid owner change response');
      } catch {
        // A failed response is not evidence that the mutating transaction failed.
        const receipt = await getReceipt(request.idempotencyKey).catch(() => null);
        if (receipt) return receipt;
        throw new RoutingCliError('Owner change outcome could not be confirmed. Resume the same run to reconcile its durable receipt');
      }
    },
  };
}
