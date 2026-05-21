function readBoolEnv(value: string | undefined): boolean {
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}

export const featureFlags = {
  conciergeEnabled: readBoolEnv(process.env.NEXT_PUBLIC_CONCIERGE_ENABLED),
};
