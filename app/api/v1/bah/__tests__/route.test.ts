import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/bah-scraper', () => ({
  extractBAHData: vi.fn(async () => ({ withDependents: '2000', withoutDependents: '1800' })),
  RANK_MAPPING: { e1: 'E-1' },
}));
vi.mock('@/lib/rate-limit', () => ({
  bahLimiter: { limit: vi.fn(async () => ({ success: true, limit: 20, remaining: 19, reset: 0 })) },
}));
vi.mock('@/lib/spam-protection', () => ({ ipFromHeaders: vi.fn(() => '9.9.9.9') }));

import { POST } from '@/app/api/v1/bah/route';
import { extractBAHData } from '@/lib/bah-scraper';
import { bahLimiter } from '@/lib/rate-limit';

const currentYear = new Date().getFullYear();

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/v1/bah', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bahLimiter.limit).mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: 0 });
});

describe('POST /api/v1/bah — rate limit', () => {
  it('429s when over the IP rate limit, before scraping', async () => {
    vi.mocked(bahLimiter.limit).mockResolvedValue({
      success: false, limit: 20, remaining: 0, reset: Date.now() + 1000,
    });
    const res = await post({ year: String(currentYear), zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(extractBAHData).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/bah — year validation', () => {
  it('accepts the current year and scrapes', async () => {
    const res = await post({ year: String(currentYear), zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(extractBAHData).toHaveBeenCalledWith(String(currentYear), '92101', 'e1');
  });

  it('accepts current year +/- 1', async () => {
    for (const y of [currentYear - 1, currentYear + 1]) {
      const res = await post({ year: String(y), zipCode: '92101', rank: 'e1' });
      expect(res.status).toBe(200);
    }
  });

  it('400s year=9999 (out of window) without scraping', async () => {
    const res = await post({ year: '9999', zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid year');
    expect(extractBAHData).not.toHaveBeenCalled();
  });

  it('400s a SQL/injection-style year without scraping', async () => {
    const res = await post({ year: `${currentYear} OR 1=1`, zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
    expect(extractBAHData).not.toHaveBeenCalled();
  });

  it('400s a far-past year', async () => {
    const res = await post({ year: '2000', zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
  });

  it('accepts the 2-digit year the calculator UI sends and scrapes', async () => {
    // components/BAHCalculator.tsx posts a 2-digit year (e.g. "26"); the scraper
    // accepts it verbatim, so the route must not reject it.
    const twoDigit = String(currentYear).slice(-2);
    const res = await post({ year: twoDigit, zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(200);
    expect(extractBAHData).toHaveBeenCalledWith(twoDigit, '92101', 'e1');
  });

  it('400s a 2-digit year outside the window without scraping', async () => {
    // "00" normalizes to 2000, far outside current ± 1.
    const res = await post({ year: '00', zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
    expect(extractBAHData).not.toHaveBeenCalled();
  });

  it('400s a year that is neither 2 nor 4 digits without scraping', async () => {
    const res = await post({ year: '202', zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
    expect(extractBAHData).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/bah — other field validation still holds', () => {
  it('400s on missing fields', async () => {
    const res = await post({ zipCode: '92101', rank: 'e1' });
    expect(res.status).toBe(400);
  });

  it('400s on a malformed zip', async () => {
    const res = await post({ year: String(currentYear), zipCode: '9210', rank: 'e1' });
    expect(res.status).toBe(400);
  });

  it('400s on an unknown rank', async () => {
    const res = await post({ year: String(currentYear), zipCode: '92101', rank: 'zzz' });
    expect(res.status).toBe(400);
  });
});
