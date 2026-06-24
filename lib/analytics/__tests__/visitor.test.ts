import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureAttributionFromLocation,
  getClientAnalyticsContext,
  getOrCreateVisitorId,
} from '@/lib/analytics/visitor';

function storageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

describe('visitor analytics context', () => {
  beforeEach(() => {
    const localStorage = storageMock();
    vi.stubGlobal('window', {
      localStorage,
      location: {
        protocol: 'https:',
        search: '?utm_source=google&utm_campaign=pcs-guide&email=alex@example.com',
        pathname: '/va-loan-guide',
        hostname: 'www.veteranpcs.com',
      },
    });
    vi.stubGlobal('document', {
      cookie: '',
      referrer: 'https://www.google.com/search?q=pcs',
    });
  });

  it('persists a first-party visitor id in storage and cookie', () => {
    const visitorId = getOrCreateVisitorId();

    expect(visitorId).toMatch(/^vpcs_/);
    expect(window.localStorage.getItem('vpcs_visitor_id')).toBe(visitorId);
    expect(document.cookie).toContain(`vpcs_visitor_id=${encodeURIComponent(visitorId)}`);
    expect(getOrCreateVisitorId()).toBe(visitorId);
  });

  it('captures allowlisted attribution without search terms or contact data', () => {
    captureAttributionFromLocation();

    expect(getClientAnalyticsContext()).toMatchObject({
      source_page_path: '/va-loan-guide',
      first_touch_attribution: {
        utm_source: 'google',
        utm_campaign: 'pcs-guide',
        referrer_domain: 'google.com',
        landing_page_path: '/va-loan-guide',
      },
      last_touch_attribution: {
        utm_source: 'google',
        utm_campaign: 'pcs-guide',
        referrer_domain: 'google.com',
        landing_page_path: '/va-loan-guide',
      },
    });
  });
});
