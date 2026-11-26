import { describe, expect, it, vi } from 'vitest';
import {
  buildMigrationPlan,
  executeMigration,
  resolveDestination,
  verifyMigrationPlan,
  verifyMigrationSnapshot,
} from '../../salesforce/routing-migration/customer-routing.mjs';

const bethStates = 'AK AZ AR CA CO HI ID IA KS LA MN MO MT NE NV NM ND OK OR SD TX UT WA WY'.split(' ');
const stephanieStates = 'AL CT DE DC FL GA IL IN KY ME MD MA MI MS NH NJ NY NC OH PA PR RI SC TN VT VA WV WI'.split(' ');
const transfers = [
  ['AR', 'TARA', 'BETH'], ['LA', 'TARA', 'BETH'], ['OK', 'TARA', 'BETH'], ['TX', 'TARA', 'BETH'],
  ['MN', 'STEPHANIE', 'BETH'], ['AL', 'JESSICA', 'STEPHANIE'], ['FL', 'JESSICA', 'STEPHANIE'],
  ['GA', 'JESSICA', 'STEPHANIE'], ['NC', 'JESSICA', 'STEPHANIE'], ['SC', 'JESSICA', 'STEPHANIE'],
  ['KY', 'TARA', 'STEPHANIE'], ['MS', 'TARA', 'STEPHANIE'], ['TN', 'TARA', 'STEPHANIE'],
] as const;

const id = (prefix: string, index: number) => prefix + index.toString().padStart(12, '0');
const organization = { id: id('00D', 1), isSandbox: true };
const owners = { BETH: id('005', 1), STEPHANIE: id('005', 2), JESSICA: id('005', 3), TARA: id('005', 4) };
const routing = {
  leadRecordTypeId: id('012', 1),
  opportunityRecordTypeId: id('012', 2),
  ownerIds: { BETH: owners.BETH, STEPHANIE: owners.STEPHANIE },
  previousRegionalOwnerIds: Object.values(owners),
};
const lastModifiedDate = '2026-11-25T21:00:00.000Z';

function fields(ownerId: string) {
  return {
    ownerId,
    lastModifiedDate,
    pendingMessages: [id('001', 90)],
    timers: [{ key: 'NextReminder', value: '2026-11-26T21:00:00.000Z' }, { key: 'Count', value: 3 }],
  };
}

function lead(index: number, destinationState: string, ownerId = owners.TARA) {
  return {
    ...fields(ownerId), type: 'Lead', id: id('00Q', index), destinationState,
    recordTypeId: routing.leadRecordTypeId, isConverted: false, status: 'Prospect',
  };
}

function opportunity(index: number, destinationState: string) {
  return {
    ...fields(owners.JESSICA), type: 'Opportunity', id: id('006', index), destinationState,
    recordTypeId: routing.opportunityRecordTypeId, isClosed: false, stageName: 'Referral Sent',
  };
}

function task(index: number, parentId: string) {
  return { ...fields(owners.TARA), type: 'Task', id: id('00T', index), parentId, isClosed: false, isReferral: true };
}

type SnapshotRecord = { type: string; id: string; [key: string]: unknown };
const snapshot = (...records: SnapshotRecord[]) => ({ organization, routing, records });

function adapterFor(plan: ReturnType<typeof buildMigrationPlan>) {
  type Before = (typeof plan.entries)[number]['before'];
  type Receipt = { before: Before; after: Before };
  type Request = {
    id: string;
    expected: Before;
    related: { id: string; expected: Before }[];
    patch: { OwnerId: string };
    idempotencyKey: string;
  };
  const rows = new Map(plan.entries.map((entry) => [entry.id, structuredClone(entry.before)]));
  const receipts = new Map<string, Receipt>();
  const compareAndSetOwner = vi.fn(async ({ id, expected, related, patch, idempotencyKey }: Request) => {
    expect(Object.keys(patch)).toEqual(['OwnerId']);
    if (receipts.has(idempotencyKey)) return receipts.get(idempotencyKey);
    if (JSON.stringify(rows.get(id)) !== JSON.stringify(expected) ||
      related.some((row) => JSON.stringify(rows.get(row.id)) !== JSON.stringify(row.expected))) {
      return { conflict: true };
    }
    const after = {
      ...expected,
      ownerId: patch.OwnerId,
      lastModifiedDate: new Date(Date.parse(expected.lastModifiedDate) + 1_000).toISOString(),
    };
    const receipt = { before: expected, after };
    rows.set(id, after);
    receipts.set(idempotencyKey, receipt);
    return receipt;
  });
  return { rows, receipts, compareAndSetOwner, getReceipt: async (key: string) => receipts.get(key), getOrganization: async () => organization };
}

const approvalFor = (plan: ReturnType<typeof buildMigrationPlan>, action = 'apply') => ({
  action, runId: 'customer-routing-test', organization, manifestFingerprint: plan.fingerprint,
});

describe('Customer routing migration contract', () => {
  it('matches all 52 territories from the reviewed assignment and normalizes known names', () => {
    const expected = [
      ...bethStates.map((state) => [state, 'BETH']),
      ...stephanieStates.map((state) => [state, 'STEPHANIE']),
    ];
    expect(new Set(expected.map(([state]) => state)).size).toBe(52);
    for (const [state, admin] of expected) expect(resolveDestination(state)).toEqual({ state, admin });
    expect(resolveDestination('Deleware')).toEqual({ state: 'DE', admin: 'STEPHANIE' });
    expect(resolveDestination('Washington, DC')).toEqual({ state: 'DC', admin: 'STEPHANIE' });
    expect(resolveDestination('Puerto Rico')).toEqual({ state: 'PR', admin: 'STEPHANIE' });
    expect(resolveDestination('unknown')).toEqual({ state: null, admin: 'STEPHANIE' });
  });

  it('reports the 13 territory transfers with stable before values and a deterministic fingerprint', () => {
    const records = transfers.map(([state, oldAdmin], index) => lead(index, state, owners[oldAdmin]));
    const plan = buildMigrationPlan(snapshot(...records));
    expect(plan.entries).toHaveLength(13);
    plan.entries.forEach((entry, index) => {
      const [state, oldAdmin, newAdmin] = transfers[index]!;
      expect(entry).toMatchObject({
        state, disposition: 'transfer', oldOwnerId: owners[oldAdmin], desiredOwnerId: owners[newAdmin],
        before: { ownerId: owners[oldAdmin], pendingMessages: fields(owners[oldAdmin]).pendingMessages },
      });
    });
    expect(buildMigrationPlan(snapshot(...records.reverse()))).toEqual(plan);
    expect(verifyMigrationPlan(plan)).toBe(plan.fingerprint);
    expect(() => verifyMigrationPlan({ ...plan, entries: plan.entries.slice(1) })).toThrow('fingerprint');
  });

  it('filters converted and non-open Leads, terminal Opportunities, Accounts, onboarding and unrelated Tasks', () => {
    const customer = lead(1, 'TX');
    const deal = opportunity(2, 'NC');
    const plan = buildMigrationPlan(snapshot(
      customer,
      deal,
      { ...lead(2, 'TX'), isConverted: true },
      { ...lead(3, 'TX'), status: 'Disqualified' },
      { ...lead(4, 'TX'), recordTypeId: id('012', 9) },
      { ...opportunity(3, 'NC'), isClosed: true },
      ...['Transaction Closed', 'Closed - Lost', 'Closed Won', 'Paid - Complete'].map((stageName, index) =>
        ({ ...opportunity(index + 4, 'NC'), stageName })),
      { ...opportunity(8, 'NC'), recordTypeId: id('012', 9) },
      { type: 'Account', id: id('001', 1) },
      task(1, customer.id),
      task(2, deal.id),
      { ...task(3, customer.id), isClosed: true },
      { ...task(4, deal.id), isReferral: false },
      { ...task(5, customer.id), ownerId: id('005', 99) },
      task(6, id('00Q', 2)),
    ));
    expect(plan.entries.map(({ id }) => id)).toEqual([customer.id, deal.id, id('00T', 1), id('00T', 2)]);
    expect(plan.exclusions).toHaveLength(14);
  });

  it('moves open records with unknown destinations to a Stephanie review and keeps raw text out of the ledger', async () => {
    const record = lead(1, 'unrecognized raw input');
    const plan = buildMigrationPlan(snapshot(record));
    const adapter = adapterFor(plan);
    expect(plan.entries[0]).toMatchObject({
      disposition: 'triage', reason: 'destination-state-needs-review', state: null, desiredOwnerId: owners.STEPHANIE,
    });
    expect(JSON.stringify(plan)).not.toContain(record.destinationState);
    await executeMigration(plan, approvalFor(plan), adapter);
    expect(adapter.rows.get(record.id)?.ownerId).toBe(owners.STEPHANIE);
    expect(verifyMigrationSnapshot(plan, snapshot({ ...record, ownerId: owners.STEPHANIE }))).toEqual([
      { id: record.id, type: 'Lead', status: 'verified' },
    ]);
  });

  it('applies and resumes with owner-only writes and rolls back only this run’s transfers', async () => {
    const customer = lead(1, 'TX');
    const referral = task(1, customer.id);
    const plan = buildMigrationPlan(snapshot(customer, referral, lead(2, 'TX', owners.BETH)));
    const adapter = adapterFor(plan);
    const apply = approvalFor(plan);
    const rollback = approvalFor(plan, 'rollback');

    expect((await executeMigration(plan, apply, adapter)).results.map(({ status }) => status)).toEqual(['applied', 'applied']);
    expect((await executeMigration(plan, apply, adapter)).results.map(({ status }) => status)).toEqual(['already-applied', 'already-applied']);
    expect(adapter.compareAndSetOwner).toHaveBeenCalledTimes(2);
    expect(adapter.rows.get(customer.id)).toMatchObject({
      ownerId: owners.BETH, pendingMessages: customer.pendingMessages,
      timers: [...customer.timers].sort((a, b) => a.key.localeCompare(b.key)),
    });
    expect(adapter.compareAndSetOwner.mock.calls[1]?.[0].related[0]?.id).toBe(customer.id);
    expect((await executeMigration(plan, rollback, adapter)).results.map(({ id, status }) => [id, status])).toEqual([
      [referral.id, 'rolled-back'], [customer.id, 'rolled-back'],
    ]);
    expect((await executeMigration(plan, rollback, adapter)).results.map(({ status }) => status)).toEqual([
      'already-rolled-back', 'already-rolled-back',
    ]);
    expect(adapter.compareAndSetOwner).toHaveBeenCalledTimes(4);
    expect(adapter.rows.get(customer.id)?.ownerId).toBe(owners.TARA);
  });

  it('rolls back a Task against its unchanged Customer parent capture', async () => {
    const customer = lead(1, 'TX', owners.BETH);
    const referral = task(1, customer.id);
    const plan = buildMigrationPlan(snapshot(customer, referral));
    const adapter = adapterFor(plan);
    await executeMigration(plan, approvalFor(plan), adapter);
    const result = await executeMigration(plan, approvalFor(plan, 'rollback'), adapter);
    expect(result.results.map(({ status }) => status)).toEqual(['rolled-back']);
    expect(adapter.compareAndSetOwner.mock.calls[1]?.[0].related).toEqual([
      { type: 'Lead', id: customer.id, expected: plan.entries[0]?.before },
    ]);
  });

  it('rejects a Task rollback after its unchanged parent changed', async () => {
    const customer = lead(1, 'TX', owners.BETH);
    const referral = task(1, customer.id);
    const plan = buildMigrationPlan(snapshot(customer, referral));
    const adapter = adapterFor(plan);
    await executeMigration(plan, approvalFor(plan), adapter);
    const parent = adapter.rows.get(customer.id)!;
    adapter.rows.set(customer.id, { ...parent, state: 'NC' });
    const result = await executeMigration(plan, approvalFor(plan, 'rollback'), adapter);
    expect(result.results.map(({ status }) => status)).toEqual(['changed-since-capture']);
    expect(adapter.rows.get(referral.id)?.ownerId).toBe(owners.BETH);
  });

  it('uses the applied parent receipt for Task rollback and defers the parent on a child conflict', async () => {
    const customer = lead(1, 'TX');
    const referral = task(1, customer.id);
    const plan = buildMigrationPlan(snapshot(customer, referral));
    const adapter = adapterFor(plan);
    await executeMigration(plan, approvalFor(plan), adapter);
    const parent = adapter.rows.get(customer.id)!;
    const child = adapter.rows.get(referral.id)!;
    adapter.rows.set(referral.id, { ...child, lastModifiedDate: '2026-11-25T22:00:00.000Z' });
    const result = await executeMigration(plan, approvalFor(plan, 'rollback'), adapter);
    expect(result.results.map(({ status }) => status)).toEqual(['changed-since-capture', 'dependent-task-conflict']);
    expect(adapter.compareAndSetOwner.mock.calls[2]?.[0].related).toEqual([
      { type: 'Lead', id: customer.id, expected: parent },
    ]);
    expect(adapter.rows.get(customer.id)?.ownerId).toBe(owners.BETH);
  });

  it('skips changed records, their dependent Tasks, and later edits during rollback', async () => {
    const customer = lead(1, 'TX');
    const referral = task(1, customer.id);
    const deal = opportunity(1, 'NC');
    const plan = buildMigrationPlan(snapshot(customer, referral, deal));
    const adapter = adapterFor(plan);
    const before = adapter.rows.get(customer.id)!;
    adapter.rows.set(customer.id, { ...before, lastModifiedDate: '2026-11-25T22:00:00.000Z' });
    expect((await executeMigration(plan, approvalFor(plan), adapter)).results.map(({ status }) => status)).toEqual([
      'changed-since-capture', 'applied', 'parent-conflict',
    ]);
    const after = adapter.rows.get(deal.id)!;
    adapter.rows.set(deal.id, { ...after, pendingMessages: [id('001', 99)] });
    expect((await executeMigration(plan, approvalFor(plan, 'rollback'), adapter)).results.map(({ status }) => status)).toEqual([
      'no-applied-change', 'changed-since-capture', 'no-applied-change',
    ]);
    expect(adapter.rows.get(deal.id)?.ownerId).toBe(owners.STEPHANIE);
  });

  it('requires exact org identity, an approved manifest and sanitized before values', async () => {
    const record = lead(1, 'TX');
    const plan = buildMigrationPlan(snapshot(record));
    const adapter = adapterFor(plan);
    await expect(executeMigration(plan, { ...approvalFor(plan), manifestFingerprint: 'bad' }, adapter)).rejects.toThrow('approved manifest');
    await expect(executeMigration(plan, { ...approvalFor(plan), organization: { ...organization, isSandbox: false } }, adapter))
      .rejects.toThrow('Organization identities');
    expect(adapter.compareAndSetOwner).not.toHaveBeenCalled();
    expect(() => buildMigrationPlan(snapshot({ ...record, timers: undefined }))).toThrow('before values');
  });
});
