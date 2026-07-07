import posthog from 'posthog-js';
import { initializeClientAnalytics } from '@/lib/analytics/client';
import {
  sanitizePostHogBeforeSendEvent,
  shouldInitializePostHog,
} from '@/lib/analytics/posthog-before-send';

const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;

if (shouldInitializePostHog(hostname)) {
  const visitorId = initializeClientAnalytics();

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    bootstrap: {
      distinctID: visitorId,
    },
    autocapture: false,
    capture_pageview: true,
    capture_exceptions: true,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    before_send: (event) => sanitizePostHogBeforeSendEvent(event, visitorId),
    loaded: (client) => {
      client.register({ vpcs_visitor_id: visitorId });
    },
    debug: process.env.NODE_ENV === 'development',
  });
}
