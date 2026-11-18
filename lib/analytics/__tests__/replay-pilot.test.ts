import { describe, expect, it } from 'vitest';
import { inReplayPilotWindow, isReplayPilotUrl, replayPilotPath, sampledForReplayPilot } from '../replay-pilot';

describe('replay pilot eligibility', () => {
  it('requires the exact category URL with no query or fragment', () => {
    const allowed = { pathname: replayPilotPath, search: '', hash: '' };
    expect(isReplayPilotUrl(allowed)).toBe(true);
    expect(isReplayPilotUrl({ ...allowed, pathname: '/contact-lender' })).toBe(false);
    expect(isReplayPilotUrl({ ...allowed, search: '?q=private' })).toBe(false);
    expect(isReplayPilotUrl({ ...allowed, hash: '#search' })).toBe(false);
  });

  it('closes after fourteen days and rejects an invalid start', () => {
    const start = Date.UTC(2026, 10, 18);
    expect(inReplayPilotWindow(start - 1, start)).toBe(false);
    expect(inReplayPilotWindow(start, start)).toBe(true);
    expect(inReplayPilotWindow(start + 14 * 86400000 - 1, start)).toBe(true);
    expect(inReplayPilotWindow(start + 14 * 86400000, start)).toBe(false);
    expect(inReplayPilotWindow(start, NaN)).toBe(false);
  });

  it('uses a stable twenty-percent boundary on random bits of a valid SDK session', () => {
    expect(sampledForReplayPilot('01994000-0000-7000-8000-000033333333')).toBe(true);
    expect(sampledForReplayPilot('01994000-0000-7000-8000-000033333334')).toBe(false);
    expect(sampledForReplayPilot('not a session')).toBe(false);
  });
});
