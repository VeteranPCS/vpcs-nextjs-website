import assert from 'node:assert/strict';
import { test } from 'node:test';
import { routingDeliveryCases } from './salesforce-routing-rehearsal.mjs';
import { readPendingDeliveryFixture, requirePausedDeliveryFixtures } from './salesforce-routing-delivery-readback.mjs';

const fixtures = {
    orgId: '00D000000000001',
    accountIds: { agents: ['001000000000001'], lenders: ['001000000000002'] },
};
const agent = {
    Id: fixtures.accountIds.agents[0], FirstName: '[VPCS WEBDEV TEST]', PersonEmail: 'tech@veteranpcs.com',
    PersonMobilePhone: '(719) 415-3014', isAgent__pc: true, isLender__pc: false, Active_on_Website__pc: true,
};
const lender = { ...agent, Id: fixtures.accountIds.lenders[0], isAgent__pc: false, isLender__pc: true };

function mockOperator({ isSandbox = true, paused = true, pending = [], accounts = [agent, lender] } = {}) {
    return {
        getOrganization: async () => ({ id: fixtures.orgId, isSandbox }),
        query: async (_, label) => {
            if (label === 'regional dispatch pause') return [
                { DeveloperName: 'BETH', Dispatch_Enabled__c: false },
                { DeveloperName: 'STEPHANIE', Dispatch_Enabled__c: !paused },
            ];
            if (label === 'empty SMS dispatch queue') return pending;
            if (label === 'synthetic delivery partner accounts') return accounts;
            throw new Error('Unexpected query');
        },
    };
}

test('the delivery suite contains exactly four selected lead submissions', () => {
    assert.deepEqual(routingDeliveryCases.map(row => row.name), [
        'AgentSelectedCO', 'LenderSelectedCO', 'AgentSelectedFL', 'LenderSelectedFL',
    ]);
});

test('delivery setup fails closed for a different org, active dispatch, pending rows, or another phone', async () => {
    await requirePausedDeliveryFixtures(mockOperator(), fixtures);
    await assert.rejects(requirePausedDeliveryFixtures(mockOperator({ isSandbox: false }), fixtures), /Organization identities differ/);
    await assert.rejects(requirePausedDeliveryFixtures(mockOperator({ paused: false }), fixtures), /Pause both/);
    await assert.rejects(requirePausedDeliveryFixtures(mockOperator({ pending: [{ Id: 'synthetic' }] }), fixtures), /existing pending SMS/);
    await assert.rejects(requirePausedDeliveryFixtures(mockOperator({
        accounts: [agent, { ...lender, Phone: '+12025550100' }],
    }), fixtures), /exact Tech contact/);
});

test('readback accepts a single unclaimed queue row and rejects a wrong recipient, prior claim, or duplicate', async () => {
    const caseInfo = {
        scenario: routingDeliveryCases[0], leadId: '00Q000000000001', partnerId: agent.Id,
        sid: 'fixture-submission', lastName: 'fixture-name', runId: 'offline-test',
    };
    const row = {
        Id: 'a00000000000001', Related_Lead__c: caseInfo.leadId, Related_Partner__c: caseInfo.partnerId,
        From_Phone_Number__c: '+17192495359', To_Phone_Number__c: '+17194153014', Status__c: 'New',
        Event_Key__c: `${caseInfo.leadId}:INITIAL_AGENT:${caseInfo.partnerId}`,
        Related_Lead__r: { Phone: null, MobilePhone: null },
    };
    const query = rows => ({ query: async () => rows });
    assert.equal((await readPendingDeliveryFixture(query([row]), caseInfo)).queueId, row.Id);
    for (const rows of [
        [{ ...row, To_Phone_Number__c: '+12025550100' }],
        [{ ...row, Claim_Job_Id__c: '707000000000001' }],
        [{ ...row, Related_Lead__r: { Phone: '+12025550100' } }],
        [row, row],
    ]) await assert.rejects(readPendingDeliveryFixture(query(rows), caseInfo), /exactly one unclaimed regional SMS/);
});
