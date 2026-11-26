import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { beforeAll, expect, test } from 'vitest';
import webdevFixtures from '@/config/salesforce/webdev-fixtures.json';
import { buildLeadTools } from '@/lib/ai/tools/lead-tools';
import { canonicalEmail } from '@/lib/leads/identity';
import { HP_FIELD, TS_FIELD } from '@/lib/validation/spam-fields';
import {
    contactAgentPostForm, contactLenderPostForm, contactPostForm, coloradoRelocationGuideForm,
    GetListedAgentsPostForm, GetListedLendersPostForm, homebuyerGuideForm, internshipFormSubmission,
    KeepInTouchForm, vaLoanGuideForm,
} from '@/services/salesForcePostFormsService';
import { createSalesforceCli } from '../../salesforce/routing-migration/salesforce-cli-adapter.mjs';
import {
    deliveryEmail, deliveryOperatorAlias, readPendingDeliveryFixture, requirePausedDeliveryFixtures,
} from './salesforce-routing-delivery-readback.mjs';
import { routingDeliveryCases, routingLeadFields, routingRehearsalCases } from './salesforce-routing-rehearsal.mjs';
import { connectSandbox, loadSandboxSettings } from '../lib/salesforce-sandbox.mjs';

const marker = '[VPCS WEBDEV TEST]';
const runId = process.env.VPCS_WEBDEV_TEST_RUN_ID ?? '';
// Salesforce description is a long text field and cannot filter a SOQL query.
// Put a fixed-length run key in LastName to look up only these exact records.
const runKey = createHash('sha256').update(runId).digest('hex').slice(0, 16);
const testSinks: string[] = JSON.parse(process.env.VPCS_WEBDEV_REHEARSAL_EMAILS ?? '[]');
const phone = '+12025550100';
const stateQuery = '?state=colorado';
const data = { firstName: marker, phone, state: 'CO' };
const envelope = () => ({ [HP_FIELD]: '', [TS_FIELD]: Date.now() - 5_000, submission_attempt_id: randomUUID() });

const forms = [
    { name: 'Agent', source: 'Contact Agent', recordType: 'CUSTOMER_LEAD', expectedAdmin: 'BETH', expectedState: 'CO',
        submit: (lastName: string, email: string) => contactAgentPostForm({ ...data, ...envelope(), email, lastName }, stateQuery) },
    { name: 'Lender', source: 'Contact Lender', recordType: 'CUSTOMER_LEAD', expectedAdmin: 'STEPHANIE', expectedState: 'FL',
        submit: (lastName: string, email: string) => contactLenderPostForm({ ...data, ...envelope(), email, lastName, state: 'FL' }, '?state=florida') },
    { name: 'AgentListing', source: 'Agent Listing Request', recordType: 'AGENT_LISTING_LEAD',
        submit: (lastName: string, email: string) => GetListedAgentsPostForm({ ...data, ...envelope(), email, lastName, primaryState: 'CO' }) },
    { name: 'LenderListing', source: 'Lender Listing Request', recordType: 'LENDER_LISTING_LEAD',
        submit: (lastName: string, email: string) => GetListedLendersPostForm({ ...data, ...envelope(), email, lastName, primaryState: 'CO' }) },
    { name: 'KeepInTouch', source: 'Keep in Touch', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string, email: string) => KeepInTouchForm({ ...data, ...envelope(), email, lastName }) },
    { name: 'Contact', source: 'Contact Form', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string, email: string) => contactPostForm({ ...data, ...envelope(), email, lastName }) },
    { name: 'VALoan', source: 'VA Loan Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string, email: string) => vaLoanGuideForm({ ...data, ...envelope(), email, lastName }) },
    { name: 'Homebuyer', source: 'First Time Home Buyer Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string, email: string) => homebuyerGuideForm({ ...data, ...envelope(), email, lastName }) },
    { name: 'Colorado', source: 'Colorado Relocation Guide', recordType: 'CUSTOMER_LEAD',
        submit: (lastName: string, email: string) => coloradoRelocationGuideForm({ ...data, ...envelope(), email, lastName }) },
    { name: 'Internship', source: 'Internship Application', recordType: 'INTERNSHIP_LEAD',
        submit: (lastName: string, email: string) => internshipFormSubmission({ ...envelope(), first_name: marker, last_name: lastName, email, mobile: phone }) },
] as const;

const deliveryMode = process.env.VPCS_WEBDEV_REHEARSAL_SUITE === 'routing-delivery';
const routingMode = deliveryMode || process.env.VPCS_WEBDEV_REHEARSAL_SUITE === 'routing';
const routingCases = deliveryMode ? routingDeliveryCases : routingRehearsalCases;
const deliveryOperator = deliveryMode ? createSalesforceCli(deliveryOperatorAlias) : null;
const leadFields = 'Id, Email, LeadSource, OwnerId, RecordTypeId, Description, Destination_State__c';
// The app retains its existing field grants. The operator separately reads the two intake wire fields.
const fields = routingMode ? leadFields + ', ' + routingLeadFields : leadFields + ', VPCS_Submission_ID__c';
const lastNameFor = (form: { name: string }) => `${runKey}-${form.name}`;
const emailFor = (name: string) => {
    const index = (routingMode ? routingCases : forms).findIndex(form => form.name === name);
    const email = testSinks[index % testSinks.length];
    if (!email) throw new Error('No approved email sink for the rehearsal case.');
    return email;
};
let crm: Awaited<ReturnType<typeof connectSandbox>>;

beforeAll(async () => {
    const settings = loadSandboxSettings();
    const { config, env } = settings;
    const emailAllowlist = (env.VPCS_WEBDEV_TEST_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase());
    if (!config.allowSandboxWrites || config.deliveryMode !== 'capture' || env.VPCS_WEBDEV_ISOLATION_ATTESTED !== '1'
        || !runId || testSinks.length !== (deliveryMode ? 1 : routingMode ? 3 : 2) || testSinks.some(email => !emailAllowlist.includes(email))) {
        throw new Error('Start the guarded Salesforce WebDev synthetic lead rehearsal command first.');
    }
    if (new Set(testSinks.map(canonicalEmail)).size !== testSinks.length) {
        throw new Error('The approved test sinks must have distinct canonical identities.');
    }
    crm = await connectSandbox(settings);
    if (routingMode && config.orgId.slice(0, 15) !== webdevFixtures.orgId.slice(0, 15)) {
        throw new Error('Routing rehearsal fixtures do not belong to the verified WebDev target.');
    }
    if (deliveryOperator) {
        const remaining = Date.parse(env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? '') - Date.now();
        if (testSinks[0] !== deliveryEmail || runId === 'baseline-capture' || !/^[a-zA-Z0-9_-]{1,64}$/.test(runId) || !(remaining > 0 && remaining <= 1_800_000)) {
            throw new Error('Routing delivery preparation requires the Tech email and a live window of up to 30 minutes.');
        }
        await requirePausedDeliveryFixtures(deliveryOperator, webdevFixtures);
    }
    const cases = routingMode ? routingCases : forms;
    const names = cases.map(form => `'${lastNameFor(form)}'`).join(', ');
    // Probe this mode's complete readback projection before any non-idempotent POST.
    const response = await crm.query(`SELECT ${fields} FROM Lead WHERE FirstName = '${marker}' AND LastName IN (${names}) LIMIT 1`);
    if (response.records.length !== 0) throw new Error('This rehearsal run ID already has a sandbox Lead. Use a fresh run ID.');
});

async function reconcileLead(lastName: string, startedAt: number) {
    const windowStart = new Date(startedAt - 60_000).toISOString();
    const endsAt = Math.min(startedAt + 90_000, Date.parse(process.env.VPCS_WEBDEV_TEST_EXPIRES_AT ?? ''));
    const windowEnd = new Date(endsAt).toISOString();
    const soql = `SELECT ${fields} FROM Lead WHERE FirstName = '${marker}' AND LastName = '${lastName}' AND CreatedDate >= ${windowStart} AND CreatedDate <= ${windowEnd} LIMIT 2`;
    const deadline = Math.min(Date.now() + 30_000, endsAt);
    let records;
    do {
        ({ records } = await crm.query(soql));
        if (records.length > 0) break;
        await wait(750);
    } while (Date.now() < deadline);

    return records;
}

function assertMarkedLead(lead: Record<string, string>, source: string, recordType: string, email: string) {
    expect(lead.LeadSource).toBe(source);
    expect(lead.RecordTypeId?.slice(0, 15)).toBe(recordType.slice(0, 15));
    expect(lead.Description?.startsWith(`${marker} ${runId} `)).toBe(true);
    expect(lead.Email?.toLowerCase() === email).toBe(true);
}

type RoutingCase = (typeof routingRehearsalCases)[number];

function selectedPartner(scenario: RoutingCase): string | null {
    const selected = scenario.channel === 'selected' || scenario.channel === 'spam';
    if (!selected) return null;
    const fixtureId = webdevFixtures.accountIds[scenario.role === 'agent' ? 'agents' : 'lenders'][0];
    if (!fixtureId) throw new Error('An approved WebDev partner fixture is missing for a selected routing case.');
    return fixtureId;
}

const visitorId = 'vpcs_routing_rehearsal_' + runKey;
const syntheticNotes = deliveryMode ? 'Synthetic routing delivery verification' : 'Synthetic routing rehearsal note';

async function submitRoutingCase(scenario: RoutingCase, lastName: string, partnerId: string | null) {
    const email = emailFor(scenario.name);
    if (scenario.channel === 'concierge') {
        const tools = buildLeadTools({ vpcs_visitor_id: visitorId, source_page_path: '/' + scenario.slug });
        const tool = scenario.role === 'agent' ? tools.submitAgentRequest : tools.submitLenderRequest;
        const result = await tool.execute?.({
            firstName: marker, lastName, email, phone, destinationState: scenario.state, message: syntheticNotes,
        }, { toolCallId: scenario.name, messages: [] });
        if (!result || !('ok' in result) || !result.ok) throw new Error('Concierge did not confirm this rehearsal submission.');
        return;
    }

    const query = new URLSearchParams();
    if (partnerId) {
        query.set('state', scenario.slug);
        query.set('id', partnerId);
        query.set('form', scenario.role);
        query.set('fn', 'Synthetic fixture');
    }
    const submit = scenario.role === 'agent' ? contactAgentPostForm : contactLenderPostForm;
    const spamFixture = scenario.channel === 'spam';
    const result = await submit({
        ...data,
        ...envelope(),
        email,
        ...(deliveryMode ? { phone: '' } : {}),
        lastName,
        // A selected deep link must win over the conflicting form state.
        state: partnerId ? (scenario.state === 'CO' ? 'FL' : 'CO') : scenario.state,
        additionalComments: syntheticNotes,
        vpcs_visitor_id: visitorId,
        ...(spamFixture ? { [HP_FIELD]: 'synthetic-honeypot' } : {}),
    }, partnerId ? '?' + query.toString() : '');
    if (spamFixture) {
        expect(result).toMatchObject({ outcome: 'rejected' });
        return;
    }
    if (result.outcome !== 'accepted') {
        throw new Error('The form did not confirm a sandbox Web-to-Lead submission.');
    }
    return result.submissionId;
}

if (routingMode) {
    test.each(routingCases)('$name reconciles a single marked Customer Lead', async scenario => {
        const lastName = lastNameFor(scenario);
        const partnerId = selectedPartner(scenario);
        const startedAt = Date.now();
        let submissionId: string | undefined;
        let confirmed = false;
        try {
            submissionId = await submitRoutingCase(scenario, lastName, partnerId);
            confirmed = true;
        } catch {
            // Acceptance may have happened before the error. Reconcile with reads and stop.
        }

        const records = await reconcileLead(lastName, startedAt);
        if (records.length === 1) console.info(`Routing rehearsal readback ${scenario.name}: ${records[0].Id}`);
        if (!confirmed) {
            throw new Error(`Submission was unconfirmed. Readback found ${records.length} matching Lead(s). Stop and reconcile the run before any further submission.`);
        }
        if (scenario.channel === 'spam') {
            expect(records.length).toBe(0);
            return;
        }
        expect(records.length).toBe(1);
        const lead = records[0];
        assertMarkedLead(lead, scenario.role === 'agent' ? 'Contact Agent' : 'Contact Lender', crm.config.recordTypes.CUSTOMER_LEAD, emailFor(scenario.name));
        expect(lead.OwnerId?.slice(0, 15)).toBe(crm.config.leadOwners[scenario.owner].slice(0, 15));
        expect(lead.Destination_State__c).toBe(scenario.state);
        const expectedAgent = scenario.role === 'agent' ? partnerId?.slice(0, 15) ?? null : null;
        const expectedLender = scenario.role === 'lender' ? partnerId?.slice(0, 15) ?? null : null;
        expect(lead.WebFormAgentId__c?.slice(0, 15) || null).toBe(expectedAgent);
        expect(lead.WebFormLenderId__c?.slice(0, 15) || null).toBe(expectedLender);
        expect(lead.Agent__c?.slice(0, 15) || null).toBe(expectedAgent);
        expect(lead.Lender__c?.slice(0, 15) || null).toBe(expectedLender);
        const formUrl = new URL(lead.WebFormURL__c);
        const sid = formUrl.searchParams.get('sid');
        expect(formUrl.pathname).toBe('/contact-' + scenario.role);
        expect(formUrl.searchParams.get('state')).toBe(scenario.state);
        expect(formUrl.searchParams.get('id')).toBe(partnerId);
        expect(formUrl.searchParams.has('fn')).toBe(false);
        expect(sid).toMatch(/^[a-z0-9-]+$/i);
        if (submissionId) expect(sid).toBe(submissionId);
        expect(lead.Description?.split('\n')[0]).toBe(`${marker} ${runId} ${sid}`);
        expect(lead.VPCS_Submission_ID__c).toBe(sid);
        expect(lead.VPCS_Visitor_ID__c).toBe(visitorId);
        if (scenario.channel === 'concierge') {
            expect(lead.Additional_Comments__c).toContain('[via Concierge]');
            expect(lead.Additional_Comments__c).toContain(syntheticNotes);
        } else {
            expect(lead.Additional_Comments__c).toBe(syntheticNotes);
        }
        if (deliveryOperator && sid && partnerId) {
            const slot = await readPendingDeliveryFixture(deliveryOperator, { scenario, leadId: lead.Id, partnerId, lastName, runId, sid });
            console.info('Pending routing delivery fixture ' + JSON.stringify(slot));
        }
    });
} else {
    test.each(forms)('$source creates one marked sandbox Lead', async form => {
        const lastName = lastNameFor(form);
        const startedAt = Date.now();
        const email = emailFor(form.name);
        const result = await form.submit(lastName, email);

        const records = await reconcileLead(lastName, startedAt);
        expect(result.outcome).toBe('accepted');
        expect(records.length).toBe(1);
        const lead = records[0];
        assertMarkedLead(lead, form.source, crm.config.recordTypes[form.recordType], email);
        expect(result.submissionId).toMatch(/^[a-f0-9-]{36}$/);
        expect(lead.VPCS_Submission_ID__c).toBe(result.submissionId);
        if ('expectedAdmin' in form) {
            // Independent business expectations: do not call the routing function under test.
            expect(lead.OwnerId.slice(0, 15)).toBe(crm.config.leadOwners[form.expectedAdmin].slice(0, 15));
            expect(lead.Destination_State__c).toBe(form.expectedState);
        }
    });
}
