import { createHash } from 'node:crypto';
import territory from '../../config/routing/customer-admins.json' with { type: 'json' };
import states from '../../content/_data/us-states.json' with { type: 'json' };

const compact = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const stateCodes = new Map(states.flatMap(({ code, name, slug }) =>
  [code, name, slug].map((value) => [compact(value), code]),
));
stateCodes.set('districtcolumbia', 'DC');
stateCodes.set('dca', 'DC');
stateCodes.set('deleware', 'DE');

const territoryOwners = new Map(Object.entries(territory.territories).flatMap(([admin, codes]) =>
  codes.map((code) => [code, admin]),
));
if (territoryOwners.size !== states.length || Object.values(territory.territories).flat().length !== states.length ||
  states.some(({ code }) => !territoryOwners.has(code))) {
  throw new Error('Routing policy must cover each supported state or territory exactly once');
}

const openLeadStatuses = new Set(territory.openLeadStatuses);
const terminalOpportunityStages = new Set(territory.terminalOpportunityStages);
const idPattern = /^[A-Za-z0-9]{15}([A-Za-z0-9]{3})?$/;
const keyPattern = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const salesforceId = (value) => typeof value === 'string' && idPattern.test(value);
const sameId = (left, right) => salesforceId(left) && salesforceId(right) && left.slice(0, 15) === right.slice(0, 15);
const byText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const byTypeAndId = (left, right) => byText(left.type, right.type) || byText(left.id, right.id);

export function resolveDestination(value) {
  const state = stateCodes.get(compact(value)) ?? null;
  return { state, admin: territoryOwners.get(state) ?? territory.defaultAdmin };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort(byText).map((key) => [key, stable(value[key])]));
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function assertOrganization(organization) {
  if (!salesforceId(organization?.id) || !organization.id.startsWith('00D') ||
    typeof organization.isSandbox !== 'boolean') {
    throw new Error('Snapshot requires an exact Salesforce Organization identity');
  }
}

function assertRouting(routing) {
  if (!salesforceId(routing?.leadRecordTypeId) || !salesforceId(routing?.opportunityRecordTypeId) ||
    !salesforceId(routing?.ownerIds?.BETH) || !salesforceId(routing?.ownerIds?.STEPHANIE) ||
    sameId(routing.ownerIds.BETH, routing.ownerIds.STEPHANIE)) {
    throw new Error('Snapshot requires Customer record types and distinct regional owners');
  }
  if (routing.previousRegionalOwnerIds !== undefined &&
    (!Array.isArray(routing.previousRegionalOwnerIds) || !routing.previousRegionalOwnerIds.every(salesforceId))) {
    throw new Error('Invalid previous regional owners');
  }
}

function excludedCustomerReason(record, routing) {
  if (record.type === 'Lead') {
    if (!sameId(record.recordTypeId, routing.leadRecordTypeId)) return 'non-customer-lead';
    if (record.isConverted !== false || !openLeadStatuses.has(record.status)) return 'converted-or-non-open-lead';
    return null;
  }
  if (!sameId(record.recordTypeId, routing.opportunityRecordTypeId)) return 'non-customer-opportunity';
  if (record.isClosed !== false || typeof record.stageName !== 'string' || !record.stageName.trim() ||
    terminalOpportunityStages.has(record.stageName)) return 'closed-or-terminal-opportunity';
  return null;
}

function validTimerValue(value) {
  return value === null || typeof value === 'boolean' || Number.isFinite(value) ||
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$/.test(value));
}

function captureBefore(record, state) {
  if (!salesforceId(record.ownerId) || typeof record.lastModifiedDate !== 'string' ||
    !Number.isFinite(Date.parse(record.lastModifiedDate)) || !Array.isArray(record.pendingMessages) ||
    !record.pendingMessages.every(salesforceId) || !Array.isArray(record.timers) ||
    !record.timers.every((timer) => typeof timer?.key === 'string' && keyPattern.test(timer.key) &&
      validTimerValue(timer.value)) || new Set(record.timers.map(({ key }) => key)).size !== record.timers.length) {
    throw new Error(`Incomplete or unsanitized before values for ${record.type} ${record.id}`);
  }
  const before = {
    ownerId: record.ownerId,
    lastModifiedDate: record.lastModifiedDate,
    pendingMessages: [...new Set(record.pendingMessages)].sort(byText),
    timers: record.timers.map(({ key, value }) => ({ key, value })).sort((a, b) => byText(a.key, b.key)),
  };
  if (record.type === 'Lead' || record.type === 'Opportunity') {
    if (Object.hasOwn(record, 'rawDestinationState')) {
      const raw = record.rawDestinationState;
      if ((raw !== null && (typeof raw !== 'string' || raw.length > 255)) || resolveDestination(raw).state !== state) {
        throw new Error(`Invalid original destination for ${record.type} ${record.id}`);
      }
      before.rawDestinationState = raw;
    }
    if (record.type === 'Lead') {
      return { ...before, recordTypeId: record.recordTypeId, state, isConverted: record.isConverted, status: record.status };
    }
    return { ...before, recordTypeId: record.recordTypeId, state, isClosed: record.isClosed, stageName: record.stageName };
  }
  return { ...before, parentId: record.parentId, isClosed: record.isClosed, isReferral: record.isReferral };
}

export function buildMigrationPlan(snapshot) {
  assertOrganization(snapshot?.organization);
  assertRouting(snapshot?.routing);
  if (!Array.isArray(snapshot.records)) throw new Error('Snapshot requires a records array');
  if (snapshot.snapshotMode !== undefined && (
    !['legacy-schema', 'current-schema'].includes(snapshot.snapshotMode) ||
    !Number.isSafeInteger(snapshot.legacyPendingSmsCount) || snapshot.legacyPendingSmsCount < 0
  )) {
    throw new Error('Invalid source snapshot mode or pending SMS count');
  }
  const { organization, records, routing } = snapshot;
  const previousOwners = routing.previousRegionalOwnerIds ?? Object.values(routing.ownerIds);
  const ids = new Set();
  const customerRows = new Map();
  const entries = [];
  const exclusions = [];

  function exclude(record, reason) {
    exclusions.push({ type: record.type, id: record.id, reason });
  }

  function select(record, { state, admin }, parentId = null) {
    const desiredOwnerId = routing.ownerIds[admin];
    const disposition = !state ? 'triage' : sameId(record.ownerId, desiredOwnerId) ? 'unchanged' : 'transfer';
    const entry = {
      type: record.type,
      id: record.id,
      parentId,
      state,
      desiredAdmin: admin,
      oldOwnerId: record.ownerId,
      desiredOwnerId,
      disposition,
      reason: state ? null : 'destination-state-needs-review',
      before: captureBefore(record, state),
    };
    entries.push(entry);
    return entry;
  }

  for (const record of records) {
    if (!['Lead', 'Opportunity', 'Task', 'Account'].includes(record?.type) || !salesforceId(record.id)) {
      throw new Error('Snapshot record requires a supported type and Salesforce ID');
    }
    const shortId = record.id.slice(0, 15);
    if (ids.has(shortId)) throw new Error(`Duplicate snapshot record ${record.id}`);
    ids.add(shortId);
    if (record.type === 'Task') continue;
    if (record.type === 'Account') {
      exclude(record, 'account');
      continue;
    }
    const reason = excludedCustomerReason(record, routing);
    if (reason) exclude(record, reason);
    else customerRows.set(shortId, select(record, resolveDestination(record.destinationState)));
  }

  for (const record of records.filter(({ type }) => type === 'Task')) {
    const parent = salesforceId(record.parentId) && customerRows.get(record.parentId.slice(0, 15));
    if (!parent) exclude(record, 'no-open-customer-parent');
    else if (record.isClosed !== false) exclude(record, 'closed-or-unconfirmed-task');
    else if (record.isReferral !== true) exclude(record, 'unrecognized-referral-task');
    else if (!previousOwners.some((owner) => sameId(owner, record.ownerId))) exclude(record, 'non-regional-task-owner');
    else select(record, { state: parent.state, admin: parent.desiredAdmin }, parent.id);
  }

  const manifest = {
    version: 1,
    territoryPolicyVersion: territory.version,
    ...(snapshot.snapshotMode ? {
      snapshotMode: snapshot.snapshotMode,
      legacyPendingSmsCount: snapshot.legacyPendingSmsCount,
    } : {}),
    organization: { id: organization.id, isSandbox: organization.isSandbox },
    entries: entries.sort(byTypeAndId),
    exclusions: exclusions.sort(byTypeAndId),
  };
  return { ...manifest, fingerprint: fingerprint(manifest) };
}

export function verifyMigrationPlan(plan) {
  if (!plan || plan.version !== 1 || !Array.isArray(plan.entries) || !Array.isArray(plan.exclusions)) {
    throw new Error('Unsupported migration manifest');
  }
  assertOrganization(plan.organization);
  const { fingerprint: claimed, ...manifest } = plan;
  if (claimed !== fingerprint(manifest)) throw new Error('Migration manifest fingerprint does not match its contents');
  return claimed;
}

function needsTransfer(entry) {
  return !sameId(entry.oldOwnerId, entry.desiredOwnerId);
}

function operationKey(plan, runId, operation, entry) {
  return fingerprint([plan.fingerprint, runId, operation, entry.type, entry.id]);
}

function sameBefore(left, right) {
  return fingerprint(left) === fingerprint(right);
}

function preservedFields(before, current) {
  const expected = { ...before, ownerId: current.ownerId, lastModifiedDate: current.lastModifiedDate };
  return sameBefore(expected, current);
}

function verifyReceipt(receipt, expected, ownerId) {
  if (!receipt?.after || !sameBefore(receipt.before, expected) ||
    !sameId(receipt.after.ownerId, ownerId) || !Number.isFinite(Date.parse(receipt.after.lastModifiedDate)) ||
    !preservedFields(expected, receipt.after)) {
    throw new Error('Executor receipt shows unexpected before or after values');
  }
  return receipt.after;
}

/**
 * Operator-only interface. The adapter must use a single server-side transaction to lock the
 * target and any related records, compare every before value, update OwnerId only, verify
 * the result, and save a durable receipt keyed by idempotencyKey. A failed comparison must
 * return { conflict: true } without writing. An uncertain response must throw so the run
 * stops and can be resumed under the same run ID. The adapter must contain owner-change
 * notifications and side effects before use. A query followed by a CLI update is insufficient.
 */
export async function executeMigration(plan, approval, adapter) {
  const approvedFingerprint = verifyMigrationPlan(plan);
  if (plan.snapshotMode === 'legacy-schema') throw new Error('A legacy-schema baseline can only be used for reporting');
  const { action, runId, organization, manifestFingerprint } = approval ?? {};
  if (!['apply', 'rollback'].includes(action) ||
    typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(runId) ||
    manifestFingerprint !== approvedFingerprint) {
    throw new Error('Execution requires an explicit action, run ID, and approved manifest fingerprint');
  }
  assertOrganization(organization);
  const target = await adapter.getOrganization();
  assertOrganization(target);
  if (!sameId(target.id, organization.id) || !sameId(target.id, plan.organization.id) ||
    target.isSandbox !== organization.isSandbox || target.isSandbox !== plan.organization.isSandbox) {
    throw new Error('Live, approved, and manifest Organization identities must match');
  }

  const entries = plan.entries.filter(needsTransfer);
  if (action === 'rollback') entries.reverse();
  const parents = new Map(plan.entries.filter(({ type }) => type !== 'Task').map((entry) => [entry.id, entry]));
  const results = [];
  const blockedParentRollbacks = new Set();
  for (const entry of entries) {
    const { type, id } = entry;
    const applyKey = operationKey(plan, runId, 'apply', entry);
    const rollbackKey = operationKey(plan, runId, 'rollback', entry);
    const applied = await adapter.getReceipt(applyKey);
    const afterApply = applied && verifyReceipt(applied, entry.before, entry.desiredOwnerId);
    const rolledBack = await adapter.getReceipt(rollbackKey);
    if (rolledBack) {
      if (!afterApply) throw new Error('Rollback receipt has no applied change in this run');
      verifyReceipt(rolledBack, afterApply, entry.oldOwnerId);
      results.push({ type, id, status: 'already-rolled-back' });
      continue;
    }
    if ((action === 'apply' && applied) || (action === 'rollback' && !applied)) {
      results.push({ type, id, status: applied ? 'already-applied' : 'no-applied-change' });
      continue;
    }

    if (action === 'rollback' && blockedParentRollbacks.has(id)) {
      results.push({ type, id, status: 'dependent-task-conflict' });
      continue;
    }

    const expected = action === 'apply' ? entry.before : afterApply;
    const ownerId = action === 'apply' ? entry.desiredOwnerId : entry.oldOwnerId;
    const related = [];
    if (entry.parentId) {
      const parent = parents.get(entry.parentId);
      if (!parent) throw new Error('Task manifest entry has no Customer parent');
      const parentReceipt = await adapter.getReceipt(operationKey(plan, runId, 'apply', parent));
      const parentRollback = await adapter.getReceipt(operationKey(plan, runId, 'rollback', parent));
      if ((needsTransfer(parent) && !parentReceipt) || parentRollback) {
        if (action === 'rollback') blockedParentRollbacks.add(parent.id);
        results.push({ type, id, status: 'parent-conflict' });
        continue;
      }
      related.push({
        type: parent.type,
        id: parent.id,
        expected: parentReceipt ? verifyReceipt(parentReceipt, parent.before, parent.desiredOwnerId) : parent.before,
      });
    }
    const result = await adapter.compareAndSetOwner({
      type,
      id,
      expected,
      related,
      patch: { OwnerId: ownerId },
      idempotencyKey: action === 'apply' ? applyKey : rollbackKey,
    });
    if (result?.conflict === true) {
      if (action === 'rollback' && entry.parentId) blockedParentRollbacks.add(entry.parentId);
      results.push({ type, id, status: 'changed-since-capture' });
      continue;
    }
    verifyReceipt(result, expected, ownerId);
    results.push({ type, id, status: action === 'apply' ? 'applied' : 'rolled-back' });
  }
  return { organization: plan.organization, manifestFingerprint: approvedFingerprint, runId, action, results };
}

export function verifyMigrationSnapshot(plan, snapshot, action = 'apply') {
  verifyMigrationPlan(plan);
  if (!['apply', 'rollback'].includes(action)) throw new Error('Unsupported verification action');
  assertOrganization(snapshot?.organization);
  if (!sameId(plan.organization.id, snapshot.organization.id) ||
    plan.organization.isSandbox !== snapshot.organization.isSandbox) {
    throw new Error('Verification snapshot belongs to another Organization');
  }
  if (!Array.isArray(snapshot.records)) throw new Error('Snapshot requires a records array');
  const records = new Map();
  for (const record of snapshot.records) {
    if (!salesforceId(record?.id)) throw new Error('Invalid verification record ID');
    const key = record.id.slice(0, 15);
    if (records.has(key)) throw new Error(`Duplicate verification record ${record.id}`);
    records.set(key, record);
  }
  return plan.entries.map((entry) => {
    const record = records.get(entry.id.slice(0, 15));
    if (!record || record.type !== entry.type) return { type: entry.type, id: entry.id, status: 'missing' };
    const expectedOwner = action === 'apply' ? entry.desiredOwnerId : entry.oldOwnerId;
    const current = captureBefore(record, resolveDestination(record.destinationState).state);
    const status = sameId(expectedOwner, current.ownerId) && preservedFields(entry.before, current)
      ? 'verified' : 'unexpected-values';
    return { type: entry.type, id: entry.id, status };
  });
}
