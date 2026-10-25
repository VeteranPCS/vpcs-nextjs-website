import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ submit: vi.fn(), analytics: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/leads/intake-reopening-store', () => ({ isIntakeExplicitlyReopened: vi.fn(async () => false) }));
import { isIntakeExplicitlyReopened } from '@/lib/leads/intake-reopening-store';
vi.mock('@/services/salesForcePostFormsService', () => ({ contactAgentPostForm: mocks.submit, contactLenderPostForm: mocks.submit, contactPostForm: mocks.submit, vaLoanGuideForm: mocks.submit }));
vi.mock('@/services/loggingService', () => ({ logError: vi.fn(), logInfo: vi.fn() }));
vi.mock('@/lib/analytics/server', () => ({ captureServerAnalyticsEvent: mocks.analytics }));
import { buildLeadTools } from '../lead-tools';
import { maintenanceNotSent } from '@/lib/leads/intake-maintenance';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isIntakeExplicitlyReopened).mockReset().mockResolvedValue(false);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network'); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const input = { firstName: 'Alex', lastName: 'Example', email: 'alex@example.test', phone: '7195550100', destinationState: 'CO', subject: 'Question', message: 'Please help' };

describe.each(['submitAgentRequest', 'submitLenderRequest', 'submitGeneralInquiry', 'submitVALoanGuideRequest'] as const)('%s maintenance', (name) => {
  it('says not sent without calling the service or emitting success telemetry; retains the input', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'on');
    const tool = buildLeadTools()[name];
    const original = structuredClone(input);
    const response = await tool.execute!(input, { toolCallId: 'mock', messages: [] });
    expect(response).toMatchObject({ ok: false, error: expect.stringContaining('Your request was not sent') });
    expect(response).toMatchObject({ error: expect.stringContaining('Do not retry automatically') });
    expect(input).toEqual(original);
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.analytics).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(tool.needsApproval).toBe(true);
  });
  it('handles maintenance beginning after the tool precheck without claiming success', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'off');
    mocks.submit.mockResolvedValueOnce(maintenanceNotSent());
    const response = await buildLeadTools()[name].execute!(input, { toolCallId: 'mock', messages: [] });
    expect(response).toMatchObject({ ok: false, error: expect.stringContaining('Your request was not sent') });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(mocks.analytics).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'concierge_tool_completed' }));
  });
  it('uses a shared flag and requires a new explicit invocation after reopening', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    const tool = buildLeadTools()[name];
    const original = structuredClone(input);
    await expect(tool.execute!(input, { toolCallId: 'mock', messages: [] })).resolves.toMatchObject({ ok: false });
    expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.analytics).not.toHaveBeenCalled();
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(true);
    await Promise.resolve(); expect(mocks.submit).not.toHaveBeenCalled();
    mocks.submit.mockResolvedValueOnce({ message: 'accepted', submissionId: 'test' });
    expect(await tool.execute!(input, { toolCallId: 'mock-retry', messages: [] })).toMatchObject({ ok: true });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(false);
    await expect(tool.execute!(input, { toolCallId: 'mock-repause', messages: [] })).resolves.toMatchObject({ ok: false });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    expect(isIntakeExplicitlyReopened).toHaveBeenCalledTimes(3);
    expect(input).toEqual(original); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['preview', 'development'])('rejects %s before Redis, service or telemetry', async environment => {
    vi.stubEnv('VERCEL_ENV', environment); vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
    await expect(buildLeadTools()[name].execute!(input, { toolCallId: 'mock', messages: [] })).resolves.toMatchObject({ ok: false, error: expect.stringContaining('Your request was not sent') });
    for (const effect of [isIntakeExplicitlyReopened, mocks.submit, mocks.analytics, fetch]) expect(effect).not.toHaveBeenCalled();
  });
});
