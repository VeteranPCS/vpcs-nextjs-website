function readBoolEnv(value: string | undefined): boolean {
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}

export const featureFlags = {
  customerJourneyAttributionEnabled: readBoolEnv(process.env.NEXT_PUBLIC_CUSTOMER_JOURNEY_ATTRIBUTION_ENABLED),
  conciergeEnabled: readBoolEnv(process.env.NEXT_PUBLIC_CONCIERGE_ENABLED),
};
