import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('../intake-reopening-store', () => ({ isIntakeExplicitlyReopened: vi.fn(async () => false) }));
import { isIntakeExplicitlyReopened } from '../intake-reopening-store';
import { getIntakeMaintenanceStatus } from '../intake-maintenance-server';
import { GET } from '@/app/api/v1/intake-status/route';
const cutoff = Date.parse('2026-11-08T07:45:00Z');
beforeEach(() => {
  vi.mocked(isIntakeExplicitlyReopened).mockReset().mockResolvedValue(false);
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network'); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('November maintenance switch', () => {
  it('defaults off even after the cutoff without Redis', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', '');
    expect((await getIntakeMaintenanceStatus(cutoff + 1)).active).toBe(false);
    expect(isIntakeExplicitlyReopened).not.toHaveBeenCalled();
  });
  it('starts exactly at 11:45 p.m. PST November 7 and never reopens on a timer', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    expect((await getIntakeMaintenanceStatus(cutoff - 1)).active).toBe(false);
    expect(isIntakeExplicitlyReopened).not.toHaveBeenCalled();
    expect((await getIntakeMaintenanceStatus(cutoff)).active).toBe(true);
    expect(await getIntakeMaintenanceStatus(Date.parse('2026-11-08T09:00:00Z'))).toMatchObject({ active: true, message: expect.stringContaining('remain') });
    expect((await getIntakeMaintenanceStatus(Date.parse('2026-11-09T00:00:00Z'))).active).toBe(true);
    expect(isIntakeExplicitlyReopened).toHaveBeenCalledTimes(3);
  });
  it('reopens and re-pauses on the next read without changing the mode or build', async () => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    expect((await getIntakeMaintenanceStatus(cutoff)).active).toBe(true);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(true);
    expect((await getIntakeMaintenanceStatus(cutoff)).active).toBe(false);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(false);
    expect((await getIntakeMaintenanceStatus(cutoff)).active).toBe(true);
    expect(isIntakeExplicitlyReopened).toHaveBeenCalledTimes(3);
  });
  it.each(['on', ' ON ', 'misspelled'])('pauses immediately for %s even if the flag is open', async (mode) => {
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', mode);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(true);
    expect((await getIntakeMaintenanceStatus(0)).active).toBe(true);
    expect(isIntakeExplicitlyReopened).not.toHaveBeenCalled();
  });
  it.each(['preview', 'development', ''])('never consults production Redis in %s', async environment => {
    vi.stubEnv('VERCEL_ENV', environment);
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    expect((await getIntakeMaintenanceStatus(cutoff)).active).toBe(true);
    expect(isIntakeExplicitlyReopened).not.toHaveBeenCalled();
  });
  it('serves fresh awaited status without configuration details or cache headers allowing storage', async () => {
    vi.useFakeTimers(); vi.setSystemTime(cutoff);
    vi.stubEnv('LEAD_INTAKE_MAINTENANCE', 'scheduled');
    const response = await GET();
    for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) expect(response.headers.get(header)).toContain('no-store');
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['active', 'message']);
    expect(body.active).toBe(true);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(true);
    expect((await (await GET()).json()).active).toBe(false);
    vi.mocked(isIntakeExplicitlyReopened).mockResolvedValue(false);
    expect((await (await GET()).json()).active).toBe(true);
  });
});
