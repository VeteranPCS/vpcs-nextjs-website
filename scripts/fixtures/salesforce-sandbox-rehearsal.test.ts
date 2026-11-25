import { createHash } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { beforeAll, expect, test } from 'vitest';
import { INTERNAL_CALL_TOKEN } from '@/lib/internal-call-token';
import { getLeadOwnerForState } from '@/services/salesforceLeadOwnerRouting';
import {
    contactAgentPostForm, contactLenderPostForm, contactPostForm, coloradoRelocationGuideForm,
    GetListedAgentsPostForm, GetListedLendersPostForm, homebuyerGuideForm, internshipFormSubmission,
    KeepInTouchForm, vaLoanGuideForm,
} from '@/services/salesForcePostFormsService';
import { connectSandbox, loadSandboxSettings } from '../lib/salesforce-sandbox.mjs';

const marker = '[VPCS WEBDEV TEST]';
const runId = process.env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
// Salesforce description is a long text field and cannot filter a SOQL query.
// Put a fixed-length run key in LastName to look up only these exact records.
const runKey = createHash('sha256').update(runId).digest('hex').slice(0, 16);
const email = process.env.VPCS_WEBDEV_REHEARSAL_EMAIL ?? '';
const phone = '+12025550100';
const options = { internalCallToken: INTERNAL_CALL_TOKEN };
const stateQuery = '?state=colorado';
const data = { firstName: marker, email, phone, state: 'CO' };

const forms = [
    { name: 'Agent', source: 'Contact Agent', recordType: 'CUSTOMER_LEAD', routeOwner: true,
        submit: (lastName: string) => contactAgentPostForm({ ...data, lastName }, stateQuery, options) },
    { name: 'Lender', source: 'Contact Lender', recordType: 'CUSTOMER_LEAD', routeOwner: true,
        submit: (lastName: string) => contactLenderPostForm({ ...data, lastName }, stateQuery, options) },
    { name: 'AgentListing', source: 'Agent Listing Request', recordType: 'AGENT_LISTING_LEAD',
        submit: (lastName: string) => GetListedAgentsPostForm({ ...data, lastName, primaryState: 'CO' }, options) },
    { name: 'LenderListing', source: 'Lender Listing Request', recordType: 'LENDER_LISTING_LEAD',
        submit: (lastName: string) => GetListedLendersPostForm({ ...data, lastName, primaryState: 'CO' }, options) },
    { name: 'KeepInTouch', source: 'Keep in Touch', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string) => KeepInTouchForm({ ...data, lastName }, options) },
    { name: 'Contact', source: 'Contact Form', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string) => contactPostForm({ ...data, lastName }, options) },
    { name: 'VALoan', source: 'VA Loan Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string) => vaLoanGuideForm({ ...data, lastName }, options) },
    { name: 'Homebuyer', source: 'First Time Home Buyer Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string) => homebuyerGuideForm({ ...data, lastName }, options) },
    { name: 'Colorado', source: 'Colorado Relocation Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string) => coloradoRelocationGuideForm({ ...data, lastName }, options) },
    { name: 'Internship', source: 'Internship Application', recordType: 'INTERNSHIP_LEAD',
        submit: (lastName: string) => internshipFormSubmission({ first_name: marker, last_name: lastName, email, mobile: phone }, options) },
] as const;

const lastNameFor = (form: (typeof forms)[number]) => `${runKey}-${form.name}`;
let crm: Awaited<ReturnType<typeof connectSandbox>>;

beforeAll(async () => {
    const settings = loadSandboxSettings();
    const { config, env } = settings;
    const emailAllowlist = (env.VPCS_WEBDEV_TEST_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase());
    if (!config.allowSandboxWrites || config.deliveryMode !== 'capture' || env.VPCS_WEBDEV_ISOLATION_ATTESTED !== '1'
        || !runId || !email || !emailAllowlist.includes(email)) {
        throw new Error('Start the guarded Salesforce WebDev synthetic lead rehearsal command first.');
    }
    crm = await connectSandbox(settings);
    const names = forms.map(form => `'${lastNameFor(form)}'`).join(', ');
    const response = await crm.query(`SELECT Id FROM Lead WHERE FirstName = '${marker}' AND LastName IN (${names}) LIMIT 1`);
    if (response.records.length !== 0) throw new Error('This rehearsal run ID already has a sandbox Lead. Use a fresh run ID.');
});

test.each(forms)('$source creates one marked sandbox Lead', async form => {
    const lastName = lastNameFor(form);
    const startedAt = Date.now();
    const windowStart = new Date(startedAt - 60_000).toISOString();
    const endsAt = Math.min(startedAt + 90_000, Date.parse(process.env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? ''));
    const windowEnd = new Date(endsAt).toISOString();
    const result = await form.submit(lastName);
    expect(result).not.toHaveProperty('dryRun', true);
    expect('message' in result || 'redirectUrl' in result).toBe(true);

    const soql = `SELECT Id, Email, LeadSource, OwnerId, RecordTypeId, Description FROM Lead WHERE FirstName = '${marker}' AND LastName = '${lastName}' AND CreatedDate >= ${windowStart} AND CreatedDate <= ${windowEnd} LIMIT 2`;
    const deadline = Date.now() + 30_000;
    let records;
    do {
        ({ records } = await crm.query(soql));
        if (records.length > 0) break;
        await wait(750);
    } while (Date.now() < deadline);

    expect(records).toHaveLength(1);
    const lead = records[0];
    expect(lead.LeadSource).toBe(form.source);
    expect(lead.RecordTypeId.slice(0, 15)).toBe(crm.config.recordTypes[form.recordType].slice(0, 15));
    expect(lead.Description.startsWith(`${marker} ${runId} `)).toBe(true);
    expect(lead.Email.toLowerCase() === email).toBe(true);
    if ('routeOwner' in form) {
        expect(lead.OwnerId.slice(0, 15)).toBe(getLeadOwnerForState('colorado')?.ownerId.slice(0, 15));
    }
});
