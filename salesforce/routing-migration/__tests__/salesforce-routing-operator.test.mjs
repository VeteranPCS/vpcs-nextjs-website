import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import production from '../../../config/salesforce/production.json' with { type: 'json' };
import { buildMigrationPlan, executeMigration, verifyMigrationSnapshot } from '../customer-routing.mjs';
import { assertOperatorAttestation, createSalesforceCli, createSalesforceCliAdapter } from '../salesforce-cli-adapter.mjs';
import { runRoutingOperator } from '../salesforce-routing-operator.mjs';
import { captureRoutingSnapshot } from '../salesforce-routing-snapshot.mjs';

const organization = { id: production.orgId, isSandbox: false };
const now = Date.parse('2026-11-25T22:00:00.000Z');
const at = (offset) => new Date(now + offset).toISOString();
const approval = { action: 'apply', runId: 'salesforce-operator-test', organization, manifestFingerprint: 'a'.repeat(64) };
const attestation = {
  ...approval, issuedAt: at(-10_000), expiresAt: at(1_000_000),
  reviewedManifest: true, nativeFlowContainmentVerified: true, pendingTimerPreservationVerified: true,
  dispatchPaused: true, legacySmsReconciled: true,
};
const request = {
  type: 'Lead', id: '00Q000000000001', expected: { ownerId: production.leadOwners.TARA },
  patch: { OwnerId: production.leadOwners.BETH }, related: [], idempotencyKey: 'b'.repeat(64),
};
const receipt = { before: request.expected, after: { ownerId: request.patch.OwnerId } };
const jsonResponse = (result) => JSON.stringify({ status: 0, result });

test('Apex adapter targets an explicit alias, protects its input, and extracts only its unique debug marker', async () => {
  let temporaryPath;
  const cli = createSalesforceCli('vpcs-routing-test', async (args) => {
    assert.deepEqual(args.slice(0, 3), ['apex', 'run', '--file']);
    assert.deepEqual(args.slice(-3), ['--target-org', 'vpcs-routing-test', '--json']);
    temporaryPath = args[3];
    assert.equal((await stat(temporaryPath)).mode & 0o777, 0o600);
    const body = await readFile(temporaryPath, 'utf8');
    const marker = body.match(/VPCS_ROUTING_[a-f0-9]+:/)[0];
    const response = Buffer.from(JSON.stringify(receipt)).toString('base64');
    return jsonResponse({ compiled: true, success: true, logs: [
      'An unrelated log line with private content',
      '22:00:00|USER_DEBUG|[2]|ERROR|' + marker + response,
    ].join('\n') });
  });
  assert.deepEqual(await cli.runApex(() => 'VpcsRoutingMigration.getOrganization()'), receipt);
  await assert.rejects(stat(temporaryPath), { code: 'ENOENT' });
  assert.throws(() => createSalesforceCli('--wrong-alias'), /explicit Salesforce CLI alias/);
});

test('ambiguous Salesforce logs fail closed without printing their contents', async () => {
  const cli = createSalesforceCli('vpcs-routing-test', async (args) => {
    const apex = await readFile(args[3], 'utf8');
    const marker = apex.match(/VPCS_ROUTING_[a-f0-9]+:/)[0];
    const log = 'Hidden customer data|USER_DEBUG|[2]|ERROR|' + marker + 'bnVsbA==';
    return jsonResponse({ compiled: true, success: true, logs: log + '\n' + log });
  });
  await assert.rejects(cli.runApex(() => 'VpcsRoutingMigration.getOrganization()'), /marker was missing or ambiguous/);
});

test('attestation rejects wrong scope, missing gates, and expired or oversized windows', () => {
  assert.doesNotThrow(() => assertOperatorAttestation(approval, attestation, now));
  assert.throws(() => assertOperatorAttestation(approval, { ...attestation, expiresAt: at(-1) }, now), /must be current/);
  assert.throws(() => assertOperatorAttestation(approval, { ...attestation, expiresAt: at(7_200_001) }, now), /at most two hours/);
  assert.throws(() => assertOperatorAttestation(approval, { ...attestation, dispatchPaused: false }, now), /paused dispatch/);
  assert.throws(() => assertOperatorAttestation(approval, { ...attestation, action: 'rollback' }, now), /this exact run/);
  assert.throws(() => assertOperatorAttestation(approval, {
    ...attestation, organization: { ...organization, isSandbox: true },
  }, now), /Organization identities differ/);
});

test('owner write rechecks exact org, attestation and unlinked pending SMS before writing', async () => {
  let legacy = 1;
  let verifiedTime = now;
  let writes = 0;
  let live = organization;
  const cli = {
    getOrganization: async () => live,
    query: async () => [{ pendingCount: legacy }],
    runApex: async (expression) => {
      const apex = expression();
      if (apex.includes('getOrganization')) return organization;
      writes++;
      const encoded = apex.match(/base64Decode\('([^']+)'\)/)[1];
      const operation = JSON.parse(Buffer.from(encoded, 'base64'));
      assert.deepEqual(operation.request, request);
      assert.equal(operation.organizationId, organization.id);
      return receipt;
    },
  };
  const adapter = createSalesforceCliAdapter({ cli, approval, attestation, clock: () => verifiedTime });
  await assert.rejects(adapter.getOrganization(), /Unlinked pending SMS remains/);
  await assert.rejects(adapter.compareAndSetOwner(request), /Unlinked pending SMS remains/);
  assert.equal(writes, 0);
  legacy = 0;
  live = { ...organization, isSandbox: true };
  await assert.rejects(adapter.compareAndSetOwner(request), /Organization identities differ/);
  live = organization;
  assert.deepEqual(await adapter.compareAndSetOwner(request), receipt);
  assert.equal(writes, 1);
  verifiedTime = now + 1_000_000;
  await assert.rejects(adapter.compareAndSetOwner(request), /must be current/);
  assert.equal(writes, 1);
});

test('an uncertain owner response reads the receipt and never blindly resubmits', async () => {
  const actions = [];
  const cli = {
    getOrganization: async () => organization,
    query: async () => [{ pendingCount: 0 }],
    runApex: async (expression) => {
      const apex = expression();
      if (apex.includes('executeOwnerOnly')) {
        actions.push('write-once');
        throw new Error('Lost response');
      }
      actions.push('read-receipt');
      return receipt;
    },
  };
  const adapter = createSalesforceCliAdapter({ cli, approval, attestation, clock: () => now });
  assert.deepEqual(await adapter.compareAndSetOwner(request), receipt);
  assert.deepEqual(actions, ['write-once', 'read-receipt']);
});

const lead = {
  Id: request.id, OwnerId: production.leadOwners.TARA, RecordTypeId: production.recordTypes.CUSTOMER_LEAD,
  LastModifiedDate: '2026-11-25T21:00:00.000+0000', CreatedDate: at(-5_000),
  Status: 'Prospect', IsConverted: false, Destination_State__c: 'Private invalid location text',
  Next_Contact_Date__c: '2026-11-25', Last_Speed_To_Lead_Reminder__c: null,
  Speed_To_Lead_Reminder_Count__c: 1, Routing_Status_Sequence__c: null,
};
const deal = {
  Id: '006000000000001', OwnerId: production.leadOwners.JESSICA, RecordTypeId: production.recordTypes.CUSTOMER_OPPORTUNITY,
  LastModifiedDate: at(-100), CreatedDate: at(-2_000), StageName: 'Tracking', IsClosed: false, Destination_State__c: 'TX',
  Contract_Sent_At__c: null, Interviewing_Stage_Timestamp__c: null, Invoice_Sent_Date__c: null,
  Invoice_Paid_Date__c: null, Closed_Win_Timestamp__c: null, Next_Contact_Date__c: '2026-11-27',
  Closing_Disclosure_Sent_At__c: null, Closing_Disclosure_Received_At__c: null,
  Closing_Info_Request_Sent_Timestamp__c: null, Closing_Info_Request_Received_Timestamp__c: null,
  Routing_Status_Sequence__c: 3,
};
const task = {
  Id: '00T000000000001', OwnerId: production.leadOwners.TARA, LastModifiedDate: at(-7_000),
  WhoId: lead.Id, WhatId: null, Subject: 'Reach out to new Lead', IsClosed: false,
  ActivityDate: null, ReminderDateTime: null, IsReminderSet: false,
};
function snapshotCli({ legacySchema = false, opportunityTasks, sources = [] } = {}) {
  return {
    getOrganization: async () => organization,
    query: async (soql, label) => {
      switch (label) {
        case 'Customer record types':
          return [
            { Id: lead.RecordTypeId, SobjectType: 'Lead', DeveloperName: 'Customer' },
            { Id: deal.RecordTypeId, SobjectType: 'Opportunity', DeveloperName: 'Customer' },
          ];
        case 'regional User mappings':
          return Object.values(production.leadOwners).map((Id) => ({ Id, IsActive: true }));
        case 'open Customer Leads':
          assert.match(soql, /IsConverted = false AND Status IN/);
          assert.equal(soql.includes('Routing_Status_Sequence__c'), !legacySchema);
          return [lead];
        case 'open Customer Opportunities':
          assert.match(soql, /IsClosed = false AND StageName NOT IN/);
          assert.equal(soql.includes('Routing_Status_Sequence__c'), !legacySchema);
          return [deal];
        case 'linked pending SMS':
          assert.equal(legacySchema, false);
          return [{ Id: 'a01000000000001', Related_Lead__c: lead.Id, Related_Opportunity__c: null }];
        case 'unlinked pending SMS':
          assert.equal(soql.includes('Related_Lead__c = null'), !legacySchema);
          return [{ pendingCount: 2 }];
        case 'converted Customer referral lineage':
          assert.match(soql, /FROM Lead WHERE ConvertedOpportunityId IN/);
          assert.doesNotMatch(soql, /WHERE IsConverted|AND WebToLead__c|AND RecordTypeId/);
          return sources;
        case 'incomplete Customer Tasks':
          if (soql.includes('AND WhoId')) {
            return [task, { ...task, Id: '00T000000000002', Subject: 'Unrelated private task subject' }];
          }
          return opportunityTasks ?? [{
            ...task, Id: '00T000000000003', WhoId: null, WhatId: deal.Id,
            Subject: 'email closing info and agent referral agreement to Melanie ',
          }];
        default:
          throw new Error('Unexpected query label');
      }
    },
  };
}

test('a converted Lead referral requires exact, unique Customer conversion lineage and dates', async () => {
  const historicalTask = {
    ...task, Id: '00T000000000003', CreatedDate: '2026-11-20T12:00:00Z',
    WhoId: '003000000000001', WhatId: deal.Id,
  };
  const source = {
    Id: '00Q000000000011', RecordTypeId: lead.RecordTypeId, IsConverted: true, WebToLead__c: true,
    CreatedDate: '2026-11-18T12:00:00Z', ConvertedDate: '2026-11-21',
    ConvertedContactId: historicalTask.WhoId, ConvertedOpportunityId: deal.Id,
  };
  const referral = async (taskRow, records) => {
    const result = await captureRoutingSnapshot(
      snapshotCli({ opportunityTasks: [taskRow], sources: records }), organization, () => now,
    );
    const entry = result.records.find(({ id }) => id === historicalTask.Id);
    assert.equal(entry.parentId, deal.Id);
    assert.equal(result.records.some(({ id }) => id === source.Id), false);
    if (entry.isReferral) {
      assert.deepEqual(entry.referralOrigin, {
        sourceLeadId: source.Id, contactId: historicalTask.WhoId, opportunityId: deal.Id,
        sourceCreatedDate: '2026-11-18T12:00:00.000Z', convertedDate: '2026-11-21',
        taskCreatedDate: '2026-11-20T12:00:00.000Z',
      });
      result.legacyPendingSmsCount = 0;
      const approved = buildMigrationPlan(result);
      const planned = approved.entries.find(({ id }) => id === historicalTask.Id);
      assert.deepEqual(planned.before.referralOrigin, entry.referralOrigin);
      entry.referralOrigin.sourceLeadId = '00Q000000000099';
      assert.notEqual(buildMigrationPlan(result).fingerprint, approved.fingerprint);
    } else {
      assert.equal(Object.hasOwn(entry, 'referralOrigin'), false);
    }
    return entry.isReferral;
  };
  assert.equal(await referral(historicalTask, [source]), true);
  for (const invalid of [
    { ConvertedContactId: '003000000000002' }, { ConvertedOpportunityId: '006000000000002' },
    { RecordTypeId: '012000000000009' }, { IsConverted: false }, { WebToLead__c: false },
    { CreatedDate: undefined }, { CreatedDate: '2026-11-20T13:00:00Z' },
    { ConvertedDate: undefined }, { ConvertedDate: '2026-11-19' }, { ConvertedDate: '2026-11-20' },
  ]) assert.equal(await referral(historicalTask, [{ ...source, ...invalid }]), false);
  assert.equal(await referral(historicalTask, []), false);
  assert.equal(await referral(historicalTask, [
    source, { ...source, Id: '00Q000000000012', WebToLead__c: false, ConvertedContactId: '003000000000008' },
  ]), false);
  assert.equal(await referral({ ...historicalTask, WhoId: lead.Id }, [source]), false);
  assert.equal(await referral({ ...historicalTask, CreatedDate: undefined }, [source]), false);
  assert.equal(await referral({ ...historicalTask, Subject: 'reach out to new lead' }, [source]), false);
});

test('private snapshot captures original destination and timers without retaining Task subjects', async () => {
  const snapshot = await captureRoutingSnapshot(snapshotCli(), organization, () => now);
  assert.equal(snapshot.legacyPendingSmsCount, 2);
  assert.equal(snapshot.records.length, 5);
  assert.equal(snapshot.records[0].lastModifiedDate, '2026-11-25T21:00:00.000Z');
  assert.equal(snapshot.records[0].destinationState, null);
  assert.equal(snapshot.records[0].rawDestinationState, lead.Destination_State__c);
  assert.equal(snapshot.snapshotMode, 'current-schema');
  assert.deepEqual(snapshot.records[0].pendingMessages, ['a01000000000001']);
  assert.deepEqual(snapshot.records.slice(2).map(({ isReferral }) => isReferral), [true, false, true]);
  assert.doesNotMatch(JSON.stringify(snapshot), /Unrelated private|Reach out to new Lead|Melanie/);
  const plan = buildMigrationPlan(snapshot);
  assert.equal(plan.entries.length, 4);
  const plannedLead = plan.entries.find((entry) => entry.id === lead.Id);
  assert.equal(plannedLead.before.rawDestinationState, lead.Destination_State__c);
  assert.equal(plannedLead.disposition, 'triage');
  const edited = structuredClone(snapshot);
  edited.records[0].rawDestinationState = 'Other legacy value';
  const verified = verifyMigrationSnapshot(plan, edited, 'rollback');
  assert.equal(verified.find(({ id }) => id === lead.Id).status, 'unexpected-values');
  assert.deepEqual(plan.exclusions, [{ type: 'Task', id: '00T000000000002', reason: 'unrecognized-referral-task' }]);
  await assert.rejects(captureRoutingSnapshot(snapshotCli(), { ...organization, isSandbox: true }), /Organization identities/);
});

test('pre-schema baseline does not query uninstalled fields and its manifest cannot execute', async () => {
  const snapshot = await captureRoutingSnapshot(
    snapshotCli({ legacySchema: true }), organization, () => now, { legacySchema: true },
  );
  assert.equal(snapshot.snapshotMode, 'legacy-schema');
  assert.equal(snapshot.legacyPendingSmsCount, 2);
  assert(snapshot.records.every(({ pendingMessages }) => pendingMessages.length === 0));
  const plan = buildMigrationPlan(snapshot);
  assert.equal(plan.legacyPendingSmsCount, 2);
  await assert.rejects(executeMigration(plan, approval, {}), /can only be used for reporting/);
});

test('operator defaults to protected reports and never overwrites an explicit report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vpcs-routing-test-'));
  let generated;
  try {
    const { path, result } = await runRoutingOperator([
      'snapshot', '--target-org', 'vpcs-routing-test', '--org-id', organization.id, '--sandbox', 'false',
    ], (alias) => {
      assert.equal(alias, 'vpcs-routing-test');
      return snapshotCli();
    });
    generated = path;
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), result);
    const existing = join(directory, 'existing.json');
    await writeFile(existing, 'existing');
    await assert.rejects(runRoutingOperator(['plan', '--snapshot', path, '--output', existing]), /reserve a new private report/);
    assert.equal(await readFile(existing, 'utf8'), 'existing');
  } finally {
    if (generated) await rm(join(generated, '..'), { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
