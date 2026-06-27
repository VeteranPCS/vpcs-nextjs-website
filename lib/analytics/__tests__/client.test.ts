import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureAnalyticsEvent,
  trackCtaClicked,
  trackFormSubmitAttempted,
} from '@/lib/analytics/client';

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  captureAttributionFromLocation: vi.fn(),
  getClientAnalyticsContext: vi.fn(() => ({
    vpcs_visitor_id: 'vpcs_test_visitor',
    source_page_path: '/contact-agent',
    pageview_count_before_conversion: 1,
    cta_click_count_before_conversion: 0,
    form_attempt_count_before_conversion: 0,
  })),
  getOrCreateVisitorId: vi.fn(() => 'vpcs_test_visitor'),
  incrementAnalyticsCounter: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: mocks.capture,
  },
}));

vi.mock('@/lib/analytics/visitor', () => ({
  captureAttributionFromLocation: mocks.captureAttributionFromLocation,
  getClientAnalyticsContext: mocks.getClientAnalyticsContext,
  getOrCreateVisitorId: mocks.getOrCreateVisitorId,
  incrementAnalyticsCounter: mocks.incrementAnalyticsCounter,
}));

describe('client analytics wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClientAnalyticsContext.mockReturnValue({
      vpcs_visitor_id: 'vpcs_test_visitor',
      source_page_path: '/contact-agent',
      pageview_count_before_conversion: 1,
      cta_click_count_before_conversion: 0,
      form_attempt_count_before_conversion: 0,
    });
  });

  it('captures sanitized events with shared analytics context', () => {
    captureAnalyticsEvent('cta_clicked', {
      cta_id: 'test_cta',
      destination_path: '/contact-agent?email=alex@example.com',
    });

    expect(mocks.capture).toHaveBeenCalledWith('cta_clicked', expect.objectContaining({
      analytics_schema_version: 1,
      journey_stage: 'mid',
      vpcs_visitor_id: 'vpcs_test_visitor',
      source_page_path: '/contact-agent',
      cta_id: 'test_cta',
      destination_path: '/contact-agent',
    }));
  });

  it('does not throw when the PostHog SDK throws', () => {
    mocks.capture.mockImplementationOnce(() => {
      throw new Error('sdk unavailable');
    });

    expect(() => captureAnalyticsEvent('cta_clicked', {
      cta_id: 'test_cta',
    })).not.toThrow();
  });

  it('does not throw when context collection fails', () => {
    mocks.getClientAnalyticsContext.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });

    expect(() => captureAnalyticsEvent('cta_clicked', {
      cta_id: 'test_cta',
    })).not.toThrow();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it('keeps CTA and form helpers best-effort when capture fails', () => {
    mocks.capture.mockImplementation(() => {
      throw new Error('sdk unavailable');
    });

    expect(() => trackCtaClicked({ cta_id: 'test_cta' })).not.toThrow();
    expect(() => trackFormSubmitAttempted('contact_agent', {
      has_email: false,
      has_phone: false,
    })).not.toThrow();
    expect(mocks.incrementAnalyticsCounter).toHaveBeenCalledWith('cta_click_count_before_conversion');
    expect(mocks.incrementAnalyticsCounter).toHaveBeenCalledWith('form_attempt_count_before_conversion');
  });
});
