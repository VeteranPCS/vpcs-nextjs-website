import { vi } from 'vitest';

export const syntheticCaptchaToken = 'synthetic-lead-captcha-token';
export const syntheticCaptchaKeyName = 'Synthetic_Lead_Regression';

export function stubLeadCaptchaEnv(profile: 'production' | 'webdev' = 'production') {
  vi.stubEnv('VPCS_RECAPTCHA_PROFILE', profile);
  vi.stubEnv('VPCS_RECAPTCHA_SITE_KEY', '6LcSyntheticLeadRegressionPublicKey0123');
  vi.stubEnv('VPCS_SALESFORCE_RECAPTCHA_KEY_NAME', syntheticCaptchaKeyName);
}
