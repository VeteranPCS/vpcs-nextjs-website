import { describe, expect, it } from 'vitest';
import {
  errorCodesFromErrors,
  queryMetrics,
  sanitizeAnalyticsProperties,
  zipPrefix,
} from '@/lib/analytics/sanitizer';

describe('analytics sanitizer', () => {
  it('drops direct PII keys and PII-looking values while keeping safe flags', () => {
    const clean = sanitizeAnalyticsProperties({
      email: 'alex@example.com',
      phone: '555-555-1212',
      firstName: 'Alex',
      message: 'My move details',
      has_email: true,
      has_phone: false,
      source_page_path: '/contact-agent?email=alex@example.com',
      destination_path: 'https://www.veteranpcs.com/contact-lender?phone=5555551212',
      zip_code: '80920',
      zip_prefix: '809',
      state_code: 'tx',
      first_touch_attribution: {
        utm_source: 'google',
        utm_campaign: 'pcs-guide',
        email: 'alex@example.com',
        landing_page_path: '/va-loan-guide?email=alex@example.com',
      },
    });

    expect(clean).not.toHaveProperty('email');
    expect(clean).not.toHaveProperty('phone');
    expect(clean).not.toHaveProperty('firstName');
    expect(clean).not.toHaveProperty('message');
    expect(clean).not.toHaveProperty('zip_code');
    expect(clean.has_email).toBe(true);
    expect(clean.has_phone).toBe(false);
    expect(clean.source_page_path).toBe('/contact-agent');
    expect(clean.destination_path).toBe('/contact-lender');
    expect(clean.zip_prefix).toBe('809');
    expect(clean.state_code).toBe('TX');
    expect(clean.first_touch_attribution).toEqual({
      utm_source: 'google',
      utm_campaign: 'pcs-guide',
      landing_page_path: '/va-loan-guide',
    });
  });

  it('turns validation errors into safe field codes including contact field names', () => {
    expect(errorCodesFromErrors({
      email: { message: 'Invalid email' },
      phone: { message: 'Invalid phone' },
      firstName: { message: 'Required' },
      lastName: { message: 'Required' },
      currentBase: { message: 'Required' },
      state: { message: 'Required' },
    })).toEqual(['email', 'phone', 'firstname', 'lastname', 'currentbase', 'state']);
  });

  it('keeps only aggregate query and ZIP values for analytics', () => {
    expect(queryMetrics('moving from Fort Carson to Austin')).toEqual({
      query_length: 33,
      query_word_count: 6,
    });
    expect(zipPrefix('80920-1234')).toBe('809');
  });

  it('keeps controlled taxonomy name keys without allowing person names', () => {
    const clean = sanitizeAnalyticsProperties({
      name: 'Alex Example',
      firstName: 'Alex',
      calculator_name: 'VA Loan Calculator',
      tool_name: 'submitLenderRequest',
    });

    expect(clean).not.toHaveProperty('name');
    expect(clean).not.toHaveProperty('firstName');
    expect(clean.calculator_name).toBe('VA Loan Calculator');
    expect(clean.tool_name).toBe('submitLenderRequest');
  });

  it('drops exception/autocapture non-scalar property values without throwing', () => {
    const clean = sanitizeAnalyticsProperties({
      $lib: 'posthog-js',
      source_page_path: '/pcs-resources?utm_campaign=telemetry_hardening_smoke',
      $exception_list: [
        { type: 'Error', value: 'Hydration failed' },
        { type: 'TypeError', value: 'value.trim is not a function' },
      ],
      $exception_frames: [
        { filename: 'components/example.tsx', line: 57, column: 14 },
      ],
      $sdk_debug_extensions: {
        exception_autocapture: { enabled: true },
      },
      $active_feature_flags: ['concierge', { key: 'unsafe_object' }, 42, true],
      first_touch_attribution: {
        utm_source: 'codex',
        landing_page_path: '/pcs-resources?email=alex@example.com',
        nested_payload: { unsafe: true },
      },
    });

    expect(clean.$lib).toBe('posthog-js');
    expect(clean.source_page_path).toBe('/pcs-resources');
    expect(clean.$exception_list).toBeUndefined();
    expect(clean.$exception_frames).toBeUndefined();
    expect(clean.$sdk_debug_extensions).toBeUndefined();
    expect(clean.$active_feature_flags).toEqual(['concierge', 42, true]);
    expect(clean.first_touch_attribution).toEqual({
      utm_source: 'codex',
      landing_page_path: '/pcs-resources',
    });
  });
});
