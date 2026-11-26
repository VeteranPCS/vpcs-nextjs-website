import { assertSameOrganization, salesforceId, sameSalesforceId } from '../../salesforce/routing-migration/salesforce-cli-adapter.mjs';

export const deliveryOperatorAlias = 'vpcs-webdev';
export const deliveryEmail = 'tech@veteranpcs.com';
const deliveryRecipient = '+17194153014';
const fixtureMarker = '[VPCS WEBDEV TEST]';
const senders = { BETH: '+17192495359', STEPHANIE: '+17192494757' };

function recordId(value, prefix) {
    if (!salesforceId(value) || !value.startsWith(prefix)) {
        throw new Error('Invalid synthetic Salesforce record ID for routing delivery rehearsal.');
    }
    return value;
}

export async function requirePausedDeliveryFixtures(cli, fixtures) {
    assertSameOrganization({ id: fixtures.orgId, isSandbox: true }, await cli.getOrganization());
    const orgId = recordId(fixtures.orgId, '00D').slice(0, 15);
    const admins = await cli.query(
        `SELECT DeveloperName, Dispatch_Enabled__c FROM Vpcs_Regional_Admin__mdt WHERE Org_Id__c = '${orgId}' AND DeveloperName IN ('BETH', 'STEPHANIE') LIMIT 3`,
        'regional dispatch pause'
    );
    if (admins.length !== 2 || !Object.keys(senders).every(admin =>
        admins.some(row => row.DeveloperName === admin && row.Dispatch_Enabled__c === false))) {
        throw new Error('Pause both WebDev regional dispatch bindings before preparing pending delivery fixtures.');
    }
    const pending = await cli.query(
        "SELECT Id FROM SMS_Message_Queue__c WHERE Status__c IN ('New', 'Retry', 'Processing') LIMIT 1",
        'empty SMS dispatch queue'
    );
    if (pending.length !== 0) throw new Error('Reconcile existing pending SMS before running the bounded delivery rehearsal.');

    const agent = recordId(fixtures.accountIds.agents[0], '001');
    const lender = recordId(fixtures.accountIds.lenders[0], '001');
    const accounts = await cli.query(
        `SELECT Id, FirstName, PersonEmail, PersonMobilePhone, Phone, isAgent__pc, isLender__pc, Active_on_Website__pc FROM Account WHERE Id IN ('${agent}', '${lender}') LIMIT 2`,
        'synthetic delivery partner accounts'
    );
    const expectedDigits = deliveryRecipient.replace(/\D/g, '');
    const expected = [[agent, 'isAgent__pc', 'isLender__pc'], [lender, 'isLender__pc', 'isAgent__pc']];
    if (accounts.length !== 2 || !expected.every(([id, role, otherRole]) => {
        const account = accounts.find(row => sameSalesforceId(row.Id, id));
        return account?.FirstName === fixtureMarker && account?.PersonEmail?.trim().toLowerCase() === deliveryEmail
            && account[role] === true && account[otherRole] === false && account.Active_on_Website__pc === true
            && [account.PersonMobilePhone, account.Phone].every(phone =>
                !phone || [expectedDigits, expectedDigits.slice(1)].includes(phone.replace(/\D/g, '')))
            && Boolean(account.PersonMobilePhone || account.Phone);
    })) throw new Error('Synthetic partner types and exact Tech contact details must match before any website POST.');
}

export async function readPendingDeliveryFixture(cli, { scenario, leadId, partnerId, lastName, runId, sid }) {
    recordId(leadId, '00Q');
    recordId(partnerId, '001');
    const rows = await cli.query(
        `SELECT Id, Event_Key__c, Related_Lead__c, Related_Partner__c, To_Phone_Number__c, From_Phone_Number__c, Status__c, Claim_Job_Id__c, Message_Id__c, Retry_Count__c, Related_Lead__r.Phone, Related_Lead__r.MobilePhone FROM SMS_Message_Queue__c WHERE Related_Lead__c = '${leadId}' LIMIT 3`,
        'pending regional SMS for marked Lead'
    );
    const row = rows[0];
    const sender = senders[scenario.owner];
    const event = 'INITIAL_' + scenario.role.toUpperCase();
    const [eventLead, eventName, eventPartner, ...unexpected] = row?.Event_Key__c?.split(':') ?? [];
    if (rows.length !== 1 || !sender || !row?.Id || !salesforceId(row.Id) ||
        row.Status__c !== 'New' || row.Claim_Job_Id__c || row.Message_Id__c || (row.Retry_Count__c ?? 0) !== 0 ||
        !row.Related_Lead__r || row.Related_Lead__r.Phone || row.Related_Lead__r.MobilePhone ||
        !sameSalesforceId(row.Related_Lead__c, leadId) || !sameSalesforceId(row.Related_Partner__c, partnerId) ||
        unexpected.length !== 0 || eventName !== event || !sameSalesforceId(eventLead, leadId) ||
        !sameSalesforceId(eventPartner, partnerId) ||
        row.From_Phone_Number__c !== sender || row.To_Phone_Number__c !== deliveryRecipient) {
        throw new Error('Expected exactly one unclaimed regional SMS with the approved sender and Tech recipient. Stop and reconcile without retrying the website submission.');
    }
    return {
        scenario: scenario.name, runId, submissionId: sid, lastName, leadId, partnerId: row.Related_Partner__c,
        queueId: row.Id, eventKey: row.Event_Key__c, sender, recipient: deliveryRecipient,
    };
}
