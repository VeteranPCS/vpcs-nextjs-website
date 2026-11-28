import 'server-only';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';
import type { LeadCaptchaPublicConfig } from './captcha-types';

type Target = Pick<ReturnType<typeof getSalesforceConfig>, 'profile' | 'orgId'>;
type CaptchaConfig = { mode: 'off' } | { mode: 'unavailable' } | {
  mode: 'required'; siteKey: string; keyName: string; orgId: string;
};

/** The legacy secret is registered in Salesforce only. No website verifier consumes the token. */
export function getLeadCaptchaConfig(target: Target = getSalesforceConfig()): CaptchaConfig {
  if (target.profile === 'mock') return { mode: 'off' };
  const siteKey = process.env.VPCS_RECAPTCHA_SITE_KEY;
  const keyName = process.env.VPCS_SALESFORCE_RECAPTCHA_KEY_NAME;
  if (process.env.VPCS_RECAPTCHA_PROFILE !== target.profile ||
      !siteKey || !/^[A-Za-z0-9_-]{30,100}$/.test(siteKey) ||
      !keyName || !/^[A-Za-z][A-Za-z0-9_ -]{0,79}$/.test(keyName) ||
      !/^00D[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(target.orgId)) {
    return { mode: 'unavailable' };
  }
  return { mode: 'required', siteKey, keyName, orgId: target.orgId.slice(0, 15) };
}

/** Only public rendering configuration crosses the server/client boundary. */
export function getLeadCaptchaPublicConfig(): LeadCaptchaPublicConfig {
  const config = getLeadCaptchaConfig();
  return config.mode === 'required' ? { mode: 'required', siteKey: config.siteKey } : config;
}

export function validCaptchaToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0 && token.length <= 5000 &&
    /^[A-Za-z0-9_-]+$/.test(token);
}

/** Append after the business fingerprint. Never accept client-supplied settings or fallback. */
export function appendLeadCaptcha(params: URLSearchParams, config: CaptchaConfig, token: unknown): void {
  params.delete('captcha_settings');
  params.delete('g-recaptcha-response');
  if (config.mode === 'off') return;
  if (config.mode !== 'required' || !validCaptchaToken(token)) throw new Error('CAPTCHA unavailable');
  params.set('g-recaptcha-response', token);
  params.set('captcha_settings', JSON.stringify({
    keyname: config.keyName, fallback: 'false', orgId: config.orgId, ts: String(Date.now()),
  }));
}
