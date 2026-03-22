import { vi, describe, test, expect, beforeEach } from 'vitest';
import { makeLender, testUUID, makeListEntryResult } from '../../test/fixtures';

// --- Module mocks ---
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
    return digits.length >= 10 ? (digits.startsWith('1') ? `+${digits}` : `+1${digits}`) : null;
  }),
}));

const mockSendNewLeadNotification = vi.fn();
vi.mock('@/lib/openphone', () => ({
  openphone: { sendNewLeadNotification: mockSendNewLeadNotification },
}));

vi.mock('@/lib/slack', () => ({ slack: { sendAlert: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
  trackFormSubmission: vi.fn().mockResolvedValue('sub-002'),
  updateSubmissionStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/loggingService', () => ({ logDebug: vi.fn(), logInfo: vi.fn(), logError: vi.fn() }));

vi.mock('@/emails/templates/customer/WelcomeAgent', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/agent/LeadAlert', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/customer/WelcomeLender', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/lender/LeadAlert', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/customer/ContactConfirmation', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/agent/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/lender/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));
vi.mock('@/emails/templates/intern/OnboardingWelcome', () => ({ default: vi.fn(props => props) }));

const { contactLenderPostForm } = await import('../salesForcePostFormsService');

const lender = makeLender();
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
  status_select: 'Active Duty',
  branch_select: 'Army',
  howDidYouHear: 'Google',
};
const queryString = `id=${lender.id}&state=TX`;

describe('contactLenderPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecord.mockResolvedValue(lender);
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockQueryRecords.mockResolvedValue([]);
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: customerId } } });
    mockCreateListEntry.mockResolvedValue(makeListEntryResult(dealId));
    mockUpdateRecord.mockResolvedValue({});
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
    mockGenerateMagicLink.mockReturnValue('https://test.veteranpcs.com/portal?token=abc');
    mockSendNewLeadNotification.mockResolvedValue({ success: true });
  });

  test('looks up lender by Attio ID from query string', async () => {
    await contactLenderPostForm(formData, queryString);
    expect(mockGetRecord).toHaveBeenCalledWith('lenders', lender.id);
  });

  test('sets deal_type to Lender (hardcoded)', async () => {
    await contactLenderPostForm(formData, queryString);
    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.deal_type).toBe('Lender');
  });

  test('sets lender reference (not agent) on deal', async () => {
    await contactLenderPostForm(formData, queryString);
    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.lender).toEqual({
      target_object: 'lenders',
      target_record_id: lender.id,
    });
    expect(dealData.agent).toBeUndefined();
  });

  test('updates customer with lender reference (not buying_agent)', async () => {
    await contactLenderPostForm(formData, queryString);
    expect(mockUpdateRecord).toHaveBeenCalledWith('customers', customerId, {
      lender: { target_object: 'lenders', target_record_id: lender.id },
    });
  });

  test('sends C3 email to customer with lender info', async () => {
    await contactLenderPostForm(formData, queryString);
    const c3Call = mockSendEmail.mock.calls.find(
      (c: any[]) => c[0].attioNote?.emailLabel === 'C3: Customer Welcome with Lender'
    );
    expect(c3Call).toBeDefined();
    expect(c3Call![0].to).toBe('bob@veteran.com');
    expect(c3Call![0].subject).toContain('Jane Doe');
  });

  test('sends L1 email to lender with magic link type lender', async () => {
    await contactLenderPostForm(formData, queryString);
    const l1Call = mockSendEmail.mock.calls.find(
      (c: any[]) => c[0].attioNote?.emailLabel === 'L1: Lead Alert'
    );
    expect(l1Call).toBeDefined();
    expect(l1Call![0].to).toBe('jane@lender.com');
  });

  test('generates magic link with type lender', async () => {
    await contactLenderPostForm(formData, queryString);
    expect(mockGenerateMagicLink).toHaveBeenCalledWith(lender.id, dealId, 'lender');
  });

  test('maps destinationBase to destination_city on deal', async () => {
    await contactLenderPostForm(formData, queryString);
    const dealData = mockCreateListEntry.mock.calls[0][3];
    expect(dealData.destination_city).toBe('San Antonio');
    expect(dealData.current_location).toBe('Fort Hood');
  });

  test('sends SMS with type Lender', async () => {
    await contactLenderPostForm(formData, queryString);
    expect(mockSendNewLeadNotification).toHaveBeenCalledWith(expect.objectContaining({
      to: lender.phone,
      dealType: 'Lender',
    }));
  });
});
