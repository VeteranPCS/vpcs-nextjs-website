import { describe, expect, it } from 'vitest';
import {
  errorCodesFromErrors,
  queryMetrics,
  sanitizeExceptionProperties,
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

  it('preserves required exception fields while redacting risky exception text', () => {
    const clean = sanitizeExceptionProperties({
      $lib: 'web',
      $lib_version: '1.391.2',
      $exception_level: 'error',
      $exception_handled: false,
      $exception_fingerprint: ['TypeError', 'https://www.veteranpcs.com/contact-agent?email=alex@example.com'],
      $exception_types: ['TypeError'],
      $exception_values: [
        'Failed for alex@example.com at https://www.veteranpcs.com/contact-agent?email=alex@example.com zip 80920 phone 555-555-1212',
      ],
      $exception_steps: [
        { event: 'clicked submit', html: '<input value="alex@example.com">' },
      ],
      $exception_list: [
        {
          type: 'TypeError',
          value: 'Failed for alex@example.com at https://www.veteranpcs.com/contact-agent?email=alex@example.com zip 80920 phone 555-555-1212',
          stacktrace: {
            frames: [
              {
                filename: 'https://www.veteranpcs.com/_next/static/chunks/app.js?email=alex@example.com',
                function: 'submitLead',
                module: 'components/contact-agent',
                lineno: 57,
                colno: '14',
                in_app: true,
                context_line: 'const email = "alex@example.com"',
                vars: { email: 'alex@example.com' },
              },
            ],
          },
          mechanism: {
            type: 'onerror',
            handled: false,
            synthetic: true,
            data: { raw: 'alex@example.com' },
          },
          extra: { raw: 'alex@example.com' },
        },
      ],
    });

    expect(clean).toBeDefined();
    expect(clean?.$lib).toBe('web');
    expect(clean?.$exception_level).toBe('error');
    expect(clean?.$exception_handled).toBe(false);
    expect(clean?.$exception_fingerprint).toEqual(['TypeError', '/contact-agent']);
    expect(clean?.$exception_values).toEqual([
      'Failed for [redacted_email] at /contact-agent zip [redacted_zip] phone [redacted_phone]',
    ]);
    expect(clean).not.toHaveProperty('$exception_steps');

    const exceptionList = clean?.$exception_list as Array<Record<string, unknown>> | undefined;
    expect(exceptionList).toHaveLength(1);
    const exception = exceptionList?.[0];
    if (!exception) throw new Error('Expected sanitized exception');

    expect(exception.type).toBe('TypeError');
    expect(exception.value).toBe(
      'Failed for [redacted_email] at /contact-agent zip [redacted_zip] phone [redacted_phone]',
    );
    expect(exception).not.toHaveProperty('extra');

    const stacktrace = exception.stacktrace as Record<string, unknown>;
    const frames = stacktrace.frames as Array<Record<string, unknown>>;
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    if (!frame) throw new Error('Expected sanitized exception frame');

    expect(frame).toEqual({
      filename: '/_next/static/chunks/app.js',
      function: 'submitLead',
      module: 'components/contact-agent',
      lineno: 57,
      colno: 14,
      in_app: true,
    });

    expect(exception.mechanism).toEqual({
      type: 'onerror',
      handled: false,
      synthetic: true,
    });
  });

  it('drops malformed exception payloads instead of producing invalid PostHog exceptions', () => {
    expect(sanitizeExceptionProperties({
      $lib: 'web',
      $exception_level: 'error',
    })).toBeUndefined();

    expect(sanitizeExceptionProperties({
      $lib: 'web',
      $exception_list: [
        { value: { raw: 'not a string' } },
        'not an exception object',
      ],
    })).toBeUndefined();
  });
});
