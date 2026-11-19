'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';

export type FeatureFlagVariant = string | boolean | undefined;

/**
 * Reads a PostHog feature flag in the browser. Returns `undefined` until flags
 * have loaded, and stays `undefined` wherever PostHog is not initialised, so
 * callers must treat `undefined` as the control experience.
 *
 * Reading the flag records the `$feature_flag_called` exposure event, so only
 * mount this on pages that take part in the experiment.
 */
export function useFeatureFlagVariant(flagKey: string): FeatureFlagVariant {
  const [variant, setVariant] = useState<FeatureFlagVariant>(undefined);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = posthog.onFeatureFlags(() => {
        try {
          setVariant(posthog.getFeatureFlag(flagKey));
        } catch {
          setVariant(undefined);
        }
      });
    } catch {
      // Analytics is optional; a missing or blocked SDK means control.
    }
    return () => {
      try {
        unsubscribe?.();
      } catch {
        // Nothing to clean up.
      }
    };
  }, [flagKey]);

  return variant;
}
