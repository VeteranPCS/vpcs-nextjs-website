import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/salesforce/server-config', () => ({ getSalesforceConfig: () => ({ profile: 'webdev', orgId: '00Djg000000EK8YEAW' }) }));
import { appendLeadCaptcha, getLeadCaptchaConfig, getLeadCaptchaPublicConfig, validCaptchaToken } from '../captcha-config';

const target = { profile: 'webdev' as const, orgId: '00Djg000000EK8YEAW' };
function configure() {
  vi.stubEnv('VPCS_RECAPTCHA_PROFILE', 'webdev');
  vi.stubEnv('VPCS_RECAPTCHA_SITE_KEY', 'synthetic-site-key-01234567890123456789');
  vi.stubEnv('VPCS_SALESFORCE_RECAPTCHA_KEY_NAME', 'VPCS_WebDev');
}
afterEach(() => vi.unstubAllEnvs());

describe('Salesforce native CAPTCHA configuration', () => {
  it('only mock disables verification without a real configuration', () => {
    expect(getLeadCaptchaConfig({ ...target, profile: 'mock' })).toEqual({ mode: 'off' });
    vi.stubEnv('VPCS_RECAPTCHA_PROFILE', '');
    expect(getLeadCaptchaConfig(target)).toEqual({ mode: 'unavailable' });
  });
  it.each(['production', '', 'mock'])('rejects mismatched profile %s', profile => {
    configure(); vi.stubEnv('VPCS_RECAPTCHA_PROFILE', profile);
    expect(getLeadCaptchaConfig(target)).toEqual({ mode: 'unavailable' });
  });
  it('exposes only the public site key and mode to the client', () => {
    configure();
    expect(getLeadCaptchaPublicConfig()).toEqual({ mode: 'required', siteKey: 'synthetic-site-key-01234567890123456789' });
  });
  it('replaces hostile client settings with org-bound native settings and fallback off', () => {
    configure(); const params = new URLSearchParams({ captcha_settings: 'untrusted', 'g-recaptcha-response': 'untrusted' });
    const started = Date.now();
    appendLeadCaptcha(params, getLeadCaptchaConfig(target), 'synthetic-token');
    const settings = JSON.parse(params.get('captcha_settings')!);
    expect(settings).toMatchObject({ keyname: 'VPCS_WebDev', fallback: 'false', orgId: '00Djg000000EK8Y' });
    expect(Number(settings.ts)).toBeGreaterThanOrEqual(started);
    expect(params.get('g-recaptcha-response')).toBe('synthetic-token');
  });
  it.each([undefined, null, {}, '', ' ', 'token with spaces', '<script>', 'x'.repeat(5001)])('rejects invalid transport token %#', token => {
    expect(validCaptchaToken(token)).toBe(false);
  });
  it('cannot serialize unavailable or incomplete real verification', () => {
    configure();
    expect(() => appendLeadCaptcha(new URLSearchParams(), { mode: 'unavailable' }, 'token')).toThrow();
    expect(() => appendLeadCaptcha(new URLSearchParams(), getLeadCaptchaConfig(target), undefined)).toThrow();
  });
});
