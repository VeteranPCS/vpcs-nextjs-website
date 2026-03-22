import { vi, describe, test, expect, beforeEach } from 'vitest';
import { testUUID } from '../../test/fixtures';

// --- Module mocks ---
const mockCreateRecord = vi.fn();
const mockCreateListEntry = vi.fn();
vi.mock('@/lib/attio', () => ({
  attio: {
    getRecord: vi.fn(),
    queryRecords: vi.fn(),
    createRecord: mockCreateRecord,
    updateRecord: vi.fn(),
    createListEntry: mockCreateListEntry,
    createNote: vi.fn().mockResolvedValue({}),
  },
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({ sendEmail: mockSendEmail }));

const mockFindOrCreatePerson = vi.fn();
vi.mock('@/lib/attio-people', () => ({ findOrCreatePerson: mockFindOrCreatePerson }));

vi.mock('@/lib/magic-link', () => ({ generateMagicLink: vi.fn() }));
vi.mock('@/lib/normalize-phone', () => ({
  normalizePhone: vi.fn((input: string | null) => {
    if (!input) return null;
    const digits = input.replace(/\D/g, '');
    return digits.length >= 10 ? (digits.startsWith('1') ? `+${digits}` : `+1${digits}`) : null;
  }),
}));
vi.mock('@/lib/openphone', () => ({ openphone: { sendNewLeadNotification: vi.fn() } }));
vi.mock('@/lib/slack', () => ({ slack: { sendAlert: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/services/formTrackingService', () => ({
  FormSubmissionStatus: { PENDING: 'PENDING', SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
  trackFormSubmission: vi.fn().mockResolvedValue('sub-006'),
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

const { GetListedLendersPostForm } = await import('../salesForcePostFormsService');

const personId = testUUID('person001');
const lenderId = testUUID('lender01');

const formData = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@lender.com',
  phone: '(555) 987-6543',
  status_select: 'Veteran',
  branch_select: 'Navy',
  name: 'Test Mortgage Co',        // company name field
  nmlsId: '12345',
  companyNMLSId: '67890',
  primaryState: 'TX',
  otherStates: ['CA'],
  localCities: 'San Antonio',
  howDidYouHear: 'Colleague',
};

describe('GetListedLendersPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: lenderId } } });
    mockCreateListEntry.mockResolvedValue({ data: { id: { entry_id: 'entry-001' } } });
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
  });

  test('calls findOrCreatePerson with personType Lender', async () => {
    await GetListedLendersPostForm(formData);
    expect(mockFindOrCreatePerson).toHaveBeenCalledWith(expect.objectContaining({
      personType: 'Lender',
    }));
  });

  test('maps formData.name to company_name (not lender name)', async () => {
    await GetListedLendersPostForm(formData);
    const lenderData = mockCreateRecord.mock.calls[0][1];
    expect(lenderData.company_name).toBe('Test Mortgage Co');
  });

  test('maps formData.nmlsId to individual_nmls', async () => {
    await GetListedLendersPostForm(formData);
    const lenderData = mockCreateRecord.mock.calls[0][1];
    expect(lenderData.individual_nmls).toBe('12345');
    expect(lenderData.company_nmls).toBe('67890');
  });

  test('sets active_on_website to false', async () => {
    await GetListedLendersPostForm(formData);
    const lenderData = mockCreateRecord.mock.calls[0][1];
    expect(lenderData.active_on_website).toBe(false);
  });

  test('creates lender_onboarding entry at New Application stage', async () => {
    await GetListedLendersPostForm(formData);
    expect(mockCreateListEntry).toHaveBeenCalledWith(
      'lender_onboarding',
      'lenders',
      lenderId,
      expect.anything(),
      'New Application',
    );
  });

  test('sends L2 lender onboarding welcome email', async () => {
    await GetListedLendersPostForm(formData);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@lender.com',
      attioNote: expect.objectContaining({
        objectSlug: 'lenders',
        emailLabel: 'L2: Lender Onboarding Welcome',
      }),
    }));
  });

  test('links People record on lender', async () => {
    await GetListedLendersPostForm(formData);
    const lenderData = mockCreateRecord.mock.calls[0][1];
    expect(lenderData.person).toEqual({
      target_object: 'people',
      target_record_id: personId,
    });
  });
});
