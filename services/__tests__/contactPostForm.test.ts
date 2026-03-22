import { vi, describe, test, expect, beforeEach } from 'vitest';
import { testUUID } from '../../test/fixtures';

// --- Module mocks ---
const mockQueryRecords = vi.fn();
const mockCreateRecord = vi.fn();
const mockUpdateRecord = vi.fn();
vi.mock('@/lib/attio', () => ({
  attio: {
    getRecord: vi.fn(),
    queryRecords: mockQueryRecords,
    createRecord: mockCreateRecord,
    updateRecord: mockUpdateRecord,
    createListEntry: vi.fn(),
    createNote: vi.fn().mockResolvedValue({}),
  },
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }));

const mockFindOrCreatePerson = vi.fn();
vi.mock('@/lib/attio-people', () => ({ findOrCreatePerson: mockFindOrCreatePerson }));

const mockSlackSendAlert = vi.fn();
vi.mock('@/lib/slack', () => ({ slack: { sendAlert: mockSlackSendAlert } }));

vi.mock('@/lib/magic-link', () => ({ generateMagicLink: vi.fn() }));
vi.mock('@/lib/normalize-phone', () => ({ normalizePhone: vi.fn(() => null) }));
vi.mock('@/lib/openphone', () => ({ openphone: { sendNewLeadNotification: vi.fn() } }));
vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
  trackFormSubmission: vi.fn().mockResolvedValue('sub-005'),
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

const { contactPostForm } = await import('../salesForcePostFormsService');

const customerId = testUUID('cust0001');
const personId = testUUID('person001');

const formData = {
  firstName: 'Alice',
  lastName: 'User',
  email: 'alice@test.com',
  additionalComments: 'General question about VA loans',
};

describe('contactPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockQueryRecords.mockResolvedValue([]);
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: customerId } } });
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
    mockSlackSendAlert.mockResolvedValue(undefined);
  });

  test('creates customer record', async () => {
    await contactPostForm(formData);
    expect(mockCreateRecord).toHaveBeenCalledWith('customers', expect.objectContaining({
      name: 'Alice User',
      email: 'alice@test.com',
    }));
  });

  test('sends C1 confirmation email to customer', async () => {
    await contactPostForm(formData);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@test.com',
      subject: expect.stringContaining('Thank You'),
      attioNote: expect.objectContaining({
        emailLabel: 'C1: Contact Form Confirmation',
      }),
    }));
  });

  test('sends Slack alert with name and message', async () => {
    await contactPostForm(formData);
    expect(mockSlackSendAlert).toHaveBeenCalledWith(
      'New Contact Form Submission',
      expect.objectContaining({
        Name: 'Alice User',
        Email: 'alice@test.com',
        Message: 'General question about VA loans',
      }),
    );
  });

  test('returns success object', async () => {
    const result = await contactPostForm(formData);
    expect(result.success).toBe(true);
  });

  test('does NOT throw on Slack failure', async () => {
    mockSlackSendAlert.mockRejectedValue(new Error('Slack down'));
    const result = await contactPostForm(formData);
    expect(result.success).toBe(true);
  });
});
