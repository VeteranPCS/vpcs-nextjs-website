import { vi, describe, test, expect, beforeEach } from 'vitest';
import { makeAgent, testUUID, makeListEntryResult } from '../../test/fixtures';

// --- Module mocks (hoisted) ---

const mockGetRecord = vi.fn();
const mockQueryRecords = vi.fn();
const mockCreateRecord = vi.fn();
const mockUpdateRecord = vi.fn();
const mockCreateListEntry = vi.fn();
vi.mock('@/lib/attio', () => ({
  attio: {
    getRecord: mockGetRecord,
    queryRecords: mockQueryRecords,
    createRecord: mockCreateRecord,
    updateRecord: mockUpdateRecord,
    createListEntry: mockCreateListEntry,
    createNote: vi.fn().mockResolvedValue({}),
  },
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }));

const mockFindOrCreatePerson = vi.fn();
vi.mock('@/lib/attio-people', () => ({ findOrCreatePerson: mockFindOrCreatePerson }));

const mockGenerateMagicLink = vi.fn();
vi.mock('@/lib/magic-link', () => ({ generateMagicLink: mockGenerateMagicLink }));

vi.mock('@/lib/normalize-phone', () => ({
  normalizePhone: vi.fn((input: string | null) => {
    if (!input) return null;
    const digits = input.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
  }),
}));

const mockSendNewLeadNotification = vi.fn();
vi.mock('@/lib/openphone', () => ({
  openphone: { sendNewLeadNotification: mockSendNewLeadNotification },
}));

vi.mock('@/lib/slack', () => ({
  slack: { sendAlert: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
  trackFormSubmission: vi.fn().mockResolvedValue('sub-001'),
  updateSubmissionStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/loggingService', () => ({
  logDebug: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// Mock email templates as passthrough functions returning their props for assertion
vi.mock('@/emails/templates/customer/WelcomeAgent', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/agent/LeadAlert', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/customer/WelcomeLender', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/lender/LeadAlert', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/customer/ContactConfirmation', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/agent/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/lender/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/intern/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));

// --- Import after mocks ---
const { contactAgentPostForm } = await import('../salesForcePostFormsService');

// --- Test data ---
const agent = makeAgent();
const customerId = testUUID('cust0001');
const personId = testUUID('person001');
const dealId = testUUID('deal0001');

const formData = {
  firstName: 'Bob',
  lastName: 'Veteran',
  email: 'bob@veteran.com',
  phone: '(555) 765-4321',
  currentBase: 'Fort Hood',
  destinationBase: 'San Antonio',
  buyingSelling: 'Buying',
  status_select: 'Active Duty',
  branch_select: 'Army',
  howDidYouHear: 'Google',
  additionalComments: 'Need help ASAP',
};
const queryString = `id=${agent.id}&state=TX`;

describe('contactAgentPostForm', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default happy path
    mockGetRecord.mockResolvedValue(agent);
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockQueryRecords.mockResolvedValue([]); // No existing customer
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: customerId } } });
    mockCreateListEntry.mockResolvedValue(makeListEntryResult(dealId));
    mockUpdateRecord.mockResolvedValue({});
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
    mockGenerateMagicLink.mockReturnValue('https://test.veteranpcs.com/portal?token=abc');
    mockSendNewLeadNotification.mockResolvedValue({ success: true });
  });

  test('looks up agent by Attio ID from query string', async () => {
    await contactAgentPostForm(formData, queryString);
    expect(mockGetRecord).toHaveBeenCalledWith('agents', agent.id);
  });

  test('creates People record with personType Customer', async () => {
    await contactAgentPostForm(formData, queryString);
    expect(mockFindOrCreatePerson).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Bob',
      lastName: 'Veteran',
      email: 'bob@veteran.com',
      personType: 'Customer',
    }));
  });

  test('creates customer record when no existing customer found', async () => {
    await contactAgentPostForm(formData, queryString);

    expect(mockCreateRecord).toHaveBeenCalledWith('customers', expect.objectContaining({
      name: 'Bob Veteran',
      first_name: 'Bob',
      last_name: 'Veteran',
      email: 'bob@veteran.com',
      current_location: 'Fort Hood',
      destination_city: 'San Antonio',
      military_status: 'Active Duty',
      military_service: 'Army',
      person: { target_object: 'people', target_record_id: personId },
    }));
  });

  test('creates deal in customer_deals pipeline at New Lead stage', async () => {
    await contactAgentPostForm(formData, queryString);

    expect(mockCreateListEntry).toHaveBeenCalledWith(
      'customer_deals',
      'customers',
      customerId,
      expect.objectContaining({
        deal_type: 'Buying',
        contact_confirmed: false,
        reroute_count: 0,
        agent: { target_object: 'agents', target_record_id: agent.id },
      }),
      'New Lead',
    );
  });

  test('maps destinationBase to destination_city on deal', async () => {
    await contactAgentPostForm(formData, queryString);

    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.destination_city).toBe('San Antonio');
    expect(dealData.current_location).toBe('Fort Hood');
  });

  test('maps additionalComments to notes on deal', async () => {
    await contactAgentPostForm(formData, queryString);

    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.notes).toBe('Need help ASAP');
  });

  test('updates customer with buying_agent reference', async () => {
    await contactAgentPostForm(formData, queryString);

    expect(mockUpdateRecord).toHaveBeenCalledWith('customers', customerId, {
      buying_agent: { target_object: 'agents', target_record_id: agent.id },
    });
  });

  test('sends C2 email to customer with agent info', async () => {
    await contactAgentPostForm(formData, queryString);

    const c2Call = mockSendEmail.mock.calls.find(
      (c: any[]) => c[0].attioNote?.emailLabel === 'C2: Customer Welcome with Agent'
    );
    expect(c2Call).toBeDefined();
    expect(c2Call![0].to).toBe('bob@veteran.com');
    expect(c2Call![0].subject).toContain('John Smith');
  });

  test('sends A1 email to agent with magic link', async () => {
    await contactAgentPostForm(formData, queryString);

    const a1Call = mockSendEmail.mock.calls.find(
      (c: any[]) => c[0].attioNote?.emailLabel === 'A1: Lead Alert'
    );
    expect(a1Call).toBeDefined();
    expect(a1Call![0].to).toBe('john@agent.com');
  });

  test('generates magic link with type agent', async () => {
    await contactAgentPostForm(formData, queryString);
    expect(mockGenerateMagicLink).toHaveBeenCalledWith(agent.id, dealId, 'agent');
  });

  test('sends SMS to agent via OpenPhone', async () => {
    await contactAgentPostForm(formData, queryString);

    expect(mockSendNewLeadNotification).toHaveBeenCalledWith(expect.objectContaining({
      to: agent.phone,
      dealType: 'Buying',
    }));
  });

  test('returns dealId and redirectUrl on success', async () => {
    const result = await contactAgentPostForm(formData, queryString);
    expect(result.dealId).toBe(dealId);
    expect(result.redirectUrl).toContain('thank-you');
  });

  test('deal_type is Selling when form says sell', async () => {
    const sellingForm = { ...formData, buyingSelling: 'Selling a Home' };
    await contactAgentPostForm(sellingForm, queryString);

    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.deal_type).toBe('Selling');
  });

  // --- Edge cases ---

  test('works without agent (no id in query string)', async () => {
    const result = await contactAgentPostForm(formData, 'state=TX');
    // Should still create customer and deal
    expect(mockCreateRecord).toHaveBeenCalled();
    expect(mockCreateListEntry).toHaveBeenCalled();
    // But no agent-related actions
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockSendNewLeadNotification).not.toHaveBeenCalled();
    expect(result.redirectUrl).toContain('thank-you');
  });

  test('does NOT throw on email failure (catches errors)', async () => {
    mockSendEmail.mockRejectedValue(new Error('Resend down'));
    // Should complete without throwing
    const result = await contactAgentPostForm(formData, queryString);
    expect(result.dealId).toBe(dealId);
  });

  test('does NOT throw on SMS failure (fire-and-forget)', async () => {
    mockSendNewLeadNotification.mockRejectedValue(new Error('OpenPhone down'));
    const result = await contactAgentPostForm(formData, queryString);
    expect(result.dealId).toBe(dealId);
  });

  test('updates existing customer instead of creating new one', async () => {
    mockQueryRecords.mockResolvedValue([{ id: 'existing-cust-id', person: personId }]);
    await contactAgentPostForm(formData, queryString);

    // Should NOT call createRecord for customers (uses existing)
    expect(mockCreateRecord).not.toHaveBeenCalledWith('customers', expect.anything());
    // Should create deal with existing customer
    expect(mockCreateListEntry).toHaveBeenCalledWith(
      'customer_deals', 'customers', 'existing-cust-id', expect.anything(), 'New Lead'
    );
  });
});
