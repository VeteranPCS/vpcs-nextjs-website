import posthog from 'posthog-js';
import { customerJourney } from '@/lib/analytics/journey-client';
import { initializeClientAnalytics } from '@/lib/analytics/client';
import {
  sanitizePostHogBeforeSendEvent,
  shouldInitializePostHog,
} from '@/lib/analytics/posthog-before-send';
import { syncContactAgentVariantCache } from '@/lib/experiments/desktop-contact-agent';

const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;

if (shouldInitializePostHog(hostname)) {
  try {
    const visitorId = initializeClientAnalytics();

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      defaults: '2026-01-30',
      bootstrap: {
        distinctID: visitorId,
      },
      autocapture: false,
      // 'history_change' sends a $pageview on App Router navigations as well as
      // on the initial load. `true` records full page loads only.
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_exceptions: true,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      before_send: (event) => {
        if (event?.properties) customerJourney.observe(event.properties);
        return sanitizePostHogBeforeSendEvent(event, visitorId);
      },
      loaded: (client) => {
        customerJourney.initialize(client);
        client.register({ vpcs_visitor_id: visitorId });
        syncContactAgentVariantCache(client);
      },
      debug: process.env.NODE_ENV === 'development',
    });
  } catch {
    // Storage/SDK initialization is optional and must not prevent form rendering.
  }
}
