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
  trackFormSubmission: vi.fn().mockResolvedValue('sub-004'),
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

const { internshipFormSubmission } = await import('../salesForcePostFormsService');

const personId = testUUID('person001');
const internId = testUUID('intrn001');

const formData = {
  first_name: 'Sam',
  last_name: 'Intern',
  email: 'sam@intern.com',
  mobile: '(555) 999-8888',
  '00N4x00000QPK7L': 'Intern - Agent',      // internship_type
  '00N4x00000LsnP2': 'Active',               // military_status
  '00N4x00000LsnOx': 'Marine Corps',         // military_service
  '00N4x00000QQ0Vz': 'Currently Serving',    // discharge_status
  state_code: 'TX',
  city: 'San Antonio',
  base: 'Fort Sam Houston',
  '00N4x00000LspV2': 'CA',                   // desired_state
  '00N4x00000LspUi': 'San Diego',            // desired_city
  '00N4x00000QPLQY': '2026-06-01',           // preferred_start_date
  '00N4x00000QPLQd': 'In Progress',          // licensed
  '00N4x00000QPksj': 'Website',              // how_did_you_hear
  '00N4x00000QPS7V': '',                      // how_did_you_hear_other
};

describe('internshipFormSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: internId } } });
    mockCreateListEntry.mockResolvedValue({ data: { id: { entry_id: 'entry-001' } } });
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
  });

  // --- Field mapping tests (highest value) ---

  test('maps "Intern - Agent" to internship_type "Real Estate Agent"', async () => {
    await internshipFormSubmission(formData);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.internship_type).toBe('Real Estate Agent');
  });

  test('maps "Intern - Lender" to internship_type "Mortgage Lender"', async () => {
    const lenderForm = { ...formData, '00N4x00000QPK7L': 'Intern - Lender' };
    await internshipFormSubmission(lenderForm);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.internship_type).toBe('Mortgage Lender');
  });

  test('maps military status "Active" to "Active Duty"', async () => {
    await internshipFormSubmission(formData);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.military_status).toBe('Active Duty');
  });

  test('maps "Marine Corps" to "Marines"', async () => {
    await internshipFormSubmission(formData);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.military_service).toBe('Marines');
  });

  test('passes through other military services unchanged', async () => {
    const armyForm = { ...formData, '00N4x00000LsnOx': 'Army' };
    await internshipFormSubmission(armyForm);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.military_service).toBe('Army');
  });

  test('passes through other military statuses unchanged', async () => {
    const vetForm = { ...formData, '00N4x00000LsnP2': 'Veteran' };
    await internshipFormSubmission(vetForm);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.military_status).toBe('Veteran');
  });

  // --- Record creation ---

  test('calls findOrCreatePerson with personType Intern', async () => {
    await internshipFormSubmission(formData);
    expect(mockFindOrCreatePerson).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Sam',
      lastName: 'Intern',
      email: 'sam@intern.com',
      personType: 'Intern',
    }));
  });

  test('uses form.first_name (not firstName) and form.mobile (not phone)', async () => {
    await internshipFormSubmission(formData);
    expect(mockFindOrCreatePerson).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Sam',
      phone: '(555) 999-8888',
    }));
  });

  test('creates intern record with all mapped fields', async () => {
    await internshipFormSubmission(formData);
    expect(mockCreateRecord).toHaveBeenCalledWith('interns', expect.objectContaining({
      name: 'Sam Intern',
      first_name: 'Sam',
      last_name: 'Intern',
      email: 'sam@intern.com',
      current_state: 'TX',
      current_city: 'San Antonio',
      current_base: 'Fort Sam Houston',
      desired_state: 'CA',
      desired_city: 'San Diego',
      preferred_start_date: '2026-06-01',
      licensed: 'In Progress',
      discharge_status: 'Currently Serving',
      person: { target_object: 'people', target_record_id: personId },
    }));
  });

  test('normalizes form.mobile for phone field', async () => {
    await internshipFormSubmission(formData);
    const internData = mockCreateRecord.mock.calls[0][1];
    expect(internData.phone).toBe('+15559998888');
  });

  test('creates intern_placements entry at New Application stage', async () => {
    await internshipFormSubmission(formData);
    expect(mockCreateListEntry).toHaveBeenCalledWith(
      'intern_placements',
      'interns',
      internId,
      expect.anything(),
      'New Application',
    );
  });

  // --- Email ---

  test('sends I1 email with internship type and location', async () => {
    await internshipFormSubmission(formData);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'sam@intern.com',
      subject: expect.stringContaining('Internship'),
      attioNote: expect.objectContaining({
        objectSlug: 'interns',
        recordId: internId,
        emailLabel: 'I1: Intern Onboarding Welcome',
      }),
    }));
  });

  test('sets application_date to today', async () => {
    await internshipFormSubmission(formData);
    const internData = mockCreateRecord.mock.calls[0][1];
    const today = new Date().toISOString().split('T')[0];
    expect(internData.application_date).toBe(today);
  });
});
