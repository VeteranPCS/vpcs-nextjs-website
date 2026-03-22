// test/fixtures.ts — Shared test data factories for Attio records
// All factories return parsed record shapes (after parseRecord processing)

import crypto from 'crypto';

export function testUUID(suffix: string = '0001'): string {
  return `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
}

export function makeAgent(overrides: Record<string, any> = {}) {
  return {
    id: testUUID('agent001'),
    name: 'John Smith',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@agent.com',
    phone: '+15551234567',
    bio: 'Veteran real estate agent',
    military_status: 'Veteran',
    military_service: 'Army',
    brokerage_name: 'Test Realty',
    active_on_website: true,
    headshot_url: 'https://cdn.sanity.io/test.jpg',
    person: testUUID('person001'),
    ...overrides,
  };
}

export function makeLender(overrides: Record<string, any> = {}) {
  return {
    id: testUUID('lender01'),
    name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@lender.com',
    phone: '+15559876543',
    company_name: 'Test Mortgage Co',
    individual_nmls: '12345',
    active_on_website: true,
    person: testUUID('person002'),
    ...overrides,
  };
}

export function makeCustomer(overrides: Record<string, any> = {}) {
  return {
    id: testUUID('cust0001'),
    name: 'Bob Veteran',
    first_name: 'Bob',
    last_name: 'Veteran',
    email: 'bob@veteran.com',
    phone: '+15557654321',
    current_location: 'Fort Hood, TX',
    destination_city: 'San Antonio',
    military_status: 'Active Duty',
    military_service: 'Army',
    person: testUUID('person003'),
    ...overrides,
  };
}

export function makeDealEntry(overrides: Record<string, any> = {}) {
  return {
    entry_id: testUUID('deal0001'),
    parent_record_id: testUUID('cust0001'),
    stage: 'New Lead',
    deal_type: 'Buying',
    agent: testUUID('agent001'),
    contact_confirmed: false,
    reroute_count: 0,
    last_updated: new Date().toISOString(),
    last_stage_change: new Date().toISOString(),
    created_at: new Date().toISOString(),
    stage_email_sent: '',
    ...overrides,
  };
}

export function makeIntern(overrides: Record<string, any> = {}) {
  return {
    id: testUUID('intrn001'),
    name: 'Sam Intern',
    first_name: 'Sam',
    last_name: 'Intern',
    email: 'sam@intern.com',
    phone: '+15559998888',
    internship_type: 'Real Estate Agent',
    military_status: 'Active Duty',
    military_service: 'Marines',
    person: testUUID('person004'),
    ...overrides,
  };
}

/** Build a valid HMAC-SHA256 signature for webhook testing */
export function signWebhookPayload(body: string, secret: string = 'test-webhook-secret'): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/** Attio API assertRecord response shape */
export function makeAssertResult(recordId: string) {
  return {
    data: {
      id: {
        workspace_id: 'test-workspace-id',
        object_id: 'some-object-uuid',
        record_id: recordId,
      },
    },
  };
}

/** Attio API createListEntry response shape */
export function makeListEntryResult(entryId: string) {
  return {
    data: {
      id: {
        workspace_id: 'test-workspace-id',
        list_id: 'some-list-uuid',
        entry_id: entryId,
      },
    },
  };
}
