import production from '../../config/salesforce/production.json' with { type: 'json' };
import webdev from '../../config/salesforce/webdev.json' with { type: 'json' };
import policy from '../../config/routing/customer-admins.json' with { type: 'json' };
import { resolveDestination } from './customer-routing.mjs';
import { assertSameOrganization, countLegacyPendingSms, RoutingCliError, salesforceId, sameSalesforceId } from './salesforce-cli-adapter.mjs';

const leadTimers = [
  'CreatedDate', 'Next_Contact_Date__c', 'Last_Speed_To_Lead_Reminder__c',
  'Speed_To_Lead_Reminder_Count__c', 'Routing_Status_Sequence__c',
];
const oppTimers = [
  'CreatedDate', 'Contract_Sent_At__c', 'Interviewing_Stage_Timestamp__c',
  'Invoice_Sent_Date__c', 'Invoice_Paid_Date__c', 'Closed_Win_Timestamp__c', 'Next_Contact_Date__c',
  'Closing_Disclosure_Sent_At__c', 'Closing_Disclosure_Received_At__c',
  'Closing_Info_Request_Sent_Timestamp__c', 'Closing_Info_Request_Received_Timestamp__c',
  'Routing_Status_Sequence__c',
];
const taskTimers = ['ActivityDate', 'ReminderDateTime', 'IsReminderSet'];
const leadReferral = 'Reach out to new Lead';
const oppReferrals = new Set([
  'Check on Referral Check',
  'email closing info and agent referral agreement to Melanie ',
]);

function checkedId(value, prefix) {
  if (!salesforceId(value) || (prefix && !value.startsWith(prefix))) {
    throw new RoutingCliError('Salesforce returned an invalid snapshot record ID');
  }
  return value;
}

function literal(value) {
  return "'" + value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
}

const inList = (values) => '(' + values.map(literal).join(',') + ')';

function isoDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new RoutingCliError('Salesforce returned an invalid snapshot date');
  }
  return new Date(value).toISOString();
}

function timerValue(value) {
  if (value === null || typeof value === 'boolean' || Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return isoDate(value);
}

function timerSnapshot(row, fields) {
  return fields.map((key) => ({ key, value: timerValue(row[key]) }));
}

function recordBase(row, type, pending, fields) {
  const id = checkedId(row.Id);
  return {
    type,
    id,
    ownerId: checkedId(row.OwnerId),
    lastModifiedDate: isoDate(row.LastModifiedDate),
    pendingMessages: pending.get(id.slice(0, 15)) ?? [],
    timers: timerSnapshot(row, fields),
  };
}

function leadRecord(row, pending, typeId, timers) {
  if (!sameSalesforceId(row.RecordTypeId, typeId) || row.IsConverted !== false ||
    !policy.openLeadStatuses.includes(row.Status)) {
    throw new RoutingCliError('Salesforce returned a Lead outside reviewed open Customer scope');
  }
  return {
    ...recordBase(row, 'Lead', pending, timers),
    recordTypeId: row.RecordTypeId,
    destinationState: resolveDestination(row.Destination_State__c).state,
    rawDestinationState: row.Destination_State__c,
    status: row.Status,
    isConverted: false,
  };
}

function oppRecord(row, pending, typeId, timers) {
  if (!sameSalesforceId(row.RecordTypeId, typeId) || row.IsClosed !== false ||
    typeof row.StageName !== 'string' || !row.StageName.trim() || policy.terminalOpportunityStages.includes(row.StageName)) {
    throw new RoutingCliError('Salesforce returned an Opportunity outside reviewed open Customer scope');
  }
  return {
    ...recordBase(row, 'Opportunity', pending, timers),
    recordTypeId: row.RecordTypeId,
    destinationState: resolveDestination(row.Destination_State__c).state,
    rawDestinationState: row.Destination_State__c,
    stageName: row.StageName,
    isClosed: false,
  };
}

function taskRecord(row, parentType, parents, pending) {
  const parentId = checkedId(parentType === 'Lead' ? row.WhoId : row.WhatId);
  if (row.IsClosed !== false || !parents.has(parentId.slice(0, 15))) {
    throw new RoutingCliError('Salesforce returned a Task outside reviewed open Customer scope');
  }
  const isReferral = parentType === 'Lead'
    ? row.WhatId === null && row.Subject === leadReferral
    : oppReferrals.has(row.Subject);
  return { ...recordBase(row, 'Task', pending, taskTimers), parentId, isClosed: false, isReferral };
}

async function checkOrgMappings(cli, organization) {
  const manifest = organization.isSandbox ? webdev : production;
  if (!manifest.verified || !sameSalesforceId(organization.id, manifest.orgId)) {
    throw new RoutingCliError('Snapshot Organization has no verified regional routing mappings');
  }
  const records = await cli.query(
    "SELECT Id, SobjectType, DeveloperName FROM RecordType WHERE DeveloperName = 'Customer' " +
    "AND SobjectType IN ('Lead','Opportunity')",
    'Customer record types',
  );
  const leadRecordTypeId = records.find((row) => row.SobjectType === 'Lead')?.Id;
  const opportunityRecordTypeId = records.find((row) => row.SobjectType === 'Opportunity')?.Id;
  if (records.length !== 2 || records.some((row) => row.DeveloperName !== 'Customer') ||
    !sameSalesforceId(leadRecordTypeId, manifest.recordTypes.CUSTOMER_LEAD) ||
    !sameSalesforceId(opportunityRecordTypeId, manifest.recordTypes.CUSTOMER_OPPORTUNITY)) {
    throw new RoutingCliError('Live Customer record types differ from verified regional routing mappings');
  }
  const { BETH, STEPHANIE, JESSICA, TARA } = manifest.leadOwners;
  const previousRegionalOwnerIds = [BETH, STEPHANIE, JESSICA, TARA].map((id) => checkedId(id, '005'));
  const users = await cli.query(
    'SELECT Id, IsActive FROM User WHERE Id IN ' + inList(previousRegionalOwnerIds),
    'regional User mappings',
  );
  if (users.length !== previousRegionalOwnerIds.length || previousRegionalOwnerIds.some((id) =>
    !users.some((row) => sameSalesforceId(id, row.Id))) ||
    [BETH, STEPHANIE].some((id) => !users.some((row) => sameSalesforceId(id, row.Id) && row.IsActive === true))) {
    throw new RoutingCliError('Live regional Users differ from verified regional routing mappings');
  }
  return { leadRecordTypeId, opportunityRecordTypeId, ownerIds: { BETH, STEPHANIE }, previousRegionalOwnerIds };
}

async function loadOpenTasks(cli, parentType, customerIds, pending) {
  const rows = [];
  const column = parentType === 'Lead' ? 'WhoId' : 'WhatId';
  const readable = ['Id', 'OwnerId', 'LastModifiedDate', 'WhoId', 'WhatId', 'Subject', 'IsClosed', ...taskTimers];
  const parents = new Set(customerIds.map((id) => id.slice(0, 15)));
  for (let start = 0; start < customerIds.length; start += 100) {
    const batch = customerIds.slice(start, start + 100);
    const tasks = await cli.query(
      'SELECT ' + readable.join(',') + ' FROM Task WHERE IsClosed = false AND ' + column + ' IN ' + inList(batch),
      'incomplete Customer Tasks',
    );
    for (const row of tasks) rows.push(taskRecord(row, parentType, parents, pending));
  }
  return rows;
}

export async function captureRoutingSnapshot(cli, expected, clock = Date.now, { legacySchema = false } = {}) {
  const organization = await cli.getOrganization();
  assertSameOrganization(expected, organization);
  const routing = await checkOrgMappings(cli, organization);
  const timerFilter = (field) => !legacySchema || field !== 'Routing_Status_Sequence__c';
  const readLeadTimers = leadTimers.filter(timerFilter);
  const readOppTimers = oppTimers.filter(timerFilter);
  const leadFields = ['Id', 'OwnerId', 'LastModifiedDate', 'RecordTypeId', 'Destination_State__c', 'Status', 'IsConverted', ...readLeadTimers];
  const oppFields = ['Id', 'OwnerId', 'LastModifiedDate', 'RecordTypeId', 'Destination_State__c', 'StageName', 'IsClosed', ...readOppTimers];
  const leadRows = await cli.query(
    'SELECT ' + leadFields.join(',') + ' FROM Lead WHERE RecordTypeId = ' + literal(routing.leadRecordTypeId) +
    ' AND IsConverted = false AND Status IN ' + inList(policy.openLeadStatuses),
    'open Customer Leads',
  );
  const oppRows = await cli.query(
    'SELECT ' + oppFields.join(',') + ' FROM Opportunity WHERE RecordTypeId = ' +
    literal(routing.opportunityRecordTypeId) + ' AND IsClosed = false AND StageName NOT IN ' +
    inList(policy.terminalOpportunityStages),
    'open Customer Opportunities',
  );
  const smsRows = legacySchema ? [] : await cli.query(
    'SELECT Id, Related_Lead__c, Related_Opportunity__c FROM SMS_Message_Queue__c ' +
    "WHERE Status__c IN ('New','Retry','Processing') AND (Related_Lead__c != null OR Related_Opportunity__c != null)",
    'linked pending SMS',
  );
  const pending = new Map();
  for (const row of smsRows) {
    const id = checkedId(row.Id);
    for (const parentId of [row.Related_Lead__c, row.Related_Opportunity__c].filter((value) => value !== null)) {
      const key = checkedId(parentId).slice(0, 15);
      const ids = pending.get(key) ?? [];
      ids.push(id);
      pending.set(key, ids);
    }
  }
  const leads = leadRows.map((row) => leadRecord(row, pending, routing.leadRecordTypeId, readLeadTimers));
  const opportunities = oppRows.map((row) => oppRecord(row, pending, routing.opportunityRecordTypeId, readOppTimers));
  const tasks = [
    ...await loadOpenTasks(cli, 'Lead', leads.map(({ id }) => id), pending),
    ...await loadOpenTasks(cli, 'Opportunity', opportunities.map(({ id }) => id), pending),
  ];
  const legacyPendingSmsCount = await countLegacyPendingSms(cli, { hasRelationships: !legacySchema });
  assertSameOrganization(organization, await cli.getOrganization());
  return {
    schemaVersion: 1,
    snapshotMode: legacySchema ? 'legacy-schema' : 'current-schema',
    capturedAt: new Date(clock()).toISOString(),
    organization,
    routing,
    legacyPendingSmsCount,
    records: [...leads, ...opportunities, ...tasks],
  };
}
