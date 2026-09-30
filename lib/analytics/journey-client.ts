'use client';

import { featureFlags } from '@/lib/feature-flags';
import { createJourneyTracker } from './journey-attribution';

export const customerJourney = createJourneyTracker(
  () => featureFlags.customerJourneyAttributionEnabled,
  () => {
    if (typeof window === 'undefined') return false;
    // Read only: no probe cookie or additional storage key.
    window.localStorage.getItem('vpcs_visitor_id');
    window.sessionStorage.getItem('vpcs_visitor_id');
    return true;
  },
);
