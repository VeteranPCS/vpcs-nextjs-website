import posthog from 'posthog-js';
import { initializeClientAnalytics } from '@/lib/analytics/client';
import { sanitizeAnalyticsProperties, safePath } from '@/lib/analytics/sanitizer';

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
  before_send: (event) => {
    if (!event) return event;
    if (event.properties) {
      const currentPath = safePath(event.properties.$current_url);
      const referrerPath = safePath(event.properties.$referrer);
      delete event.properties.$current_url;
      delete event.properties.$referrer;
      delete event.properties.$initial_current_url;
      delete event.properties.$initial_referrer;
      event.properties = {
        ...sanitizeAnalyticsProperties(event.properties),
        ...(currentPath ? { $pathname: currentPath } : {}),
        ...(referrerPath ? { $referring_path: referrerPath } : {}),
        vpcs_visitor_id: visitorId,
      };
    }
    return event;
  },
  loaded: (client) => {
    client.register({ vpcs_visitor_id: visitorId });
  },
  debug: process.env.NODE_ENV === 'development',
});
