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
  trackFormSubmission: vi.fn().mockResolvedValue('sub-003'),
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

const { GetListedAgentsPostForm } = await import('../salesForcePostFormsService');

const personId = testUUID('person001');
const agentId = testUUID('agent001');

const formData = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@agent.com',
  phone: '(555) 123-4567',
  status_select: 'Veteran',
  branch_select: 'Army',
  brokerageName: 'Test Realty',
  licenseNumber: 'RE-123456',
  managingBrokerName: 'Bob Broker',
  primaryState: 'TX',
  otherStates: ['CA', 'FL'],
  citiesServiced: 'San Antonio, Austin',
  basesServiced: 'Fort Hood',
  personallyPCS: 'Yes',
  leadAcceptance: 'Accept',
  howDidYouHear: 'Referral',
};

describe('GetListedAgentsPostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreatePerson.mockResolvedValue(personId);
    mockCreateRecord.mockResolvedValue({ data: { id: { record_id: agentId } } });
    mockCreateListEntry.mockResolvedValue({ data: { id: { entry_id: 'entry-001' } } });
    mockSendEmail.mockResolvedValue({ id: 'email-001' });
  });

  test('calls findOrCreatePerson with personType Agent', async () => {
    await GetListedAgentsPostForm(formData);
    expect(mockFindOrCreatePerson).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@agent.com',
      personType: 'Agent',
    }));
  });

  test('creates agent record with correct field mapping', async () => {
    await GetListedAgentsPostForm(formData);
    expect(mockCreateRecord).toHaveBeenCalledWith('agents', expect.objectContaining({
      name: 'John Smith',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john@agent.com',
      military_status: 'Veteran',
      military_service: 'Army',
      brokerage_name: 'Test Realty',
      brokerage_license: 'RE-123456',
      managing_broker_name: 'Bob Broker',
      active_on_website: false,
      person: { target_object: 'people', target_record_id: personId },
    }));
  });

  test('normalizes phone before setting on agent record', async () => {
    await GetListedAgentsPostForm(formData);
    const agentData = mockCreateRecord.mock.calls[0][1];
    expect(agentData.phone).toBe('+15551234567');
  });

  test('creates agent_onboarding entry at New Application stage', async () => {
    await GetListedAgentsPostForm(formData);
    expect(mockCreateListEntry).toHaveBeenCalledWith(
      'agent_onboarding',
      'agents',
      agentId,
      expect.anything(),
      'New Application',
    );
  });

  test('joins otherStates array into comma-separated string', async () => {
    await GetListedAgentsPostForm(formData);
    const onboardingData = mockCreateListEntry.mock.calls[0][3];
    expect(onboardingData.other_states).toBe('CA, FL');
  });

  test('passes primary_state to onboarding entry', async () => {
    await GetListedAgentsPostForm(formData);
    const onboardingData = mockCreateListEntry.mock.calls[0][3];
    expect(onboardingData.primary_state).toBe('TX');
  });

  test('sends A2 onboarding welcome email', async () => {
    await GetListedAgentsPostForm(formData);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'john@agent.com',
      subject: expect.stringContaining('Welcome to VeteranPCS'),
      attioNote: expect.objectContaining({
        objectSlug: 'agents',
        emailLabel: 'A2: Agent Onboarding Welcome',
      }),
    }));
  });

  test('returns redirectUrl to thank-you page', async () => {
    const result = await GetListedAgentsPostForm(formData);
    expect(result.redirectUrl).toContain('thank-you');
  });
});
