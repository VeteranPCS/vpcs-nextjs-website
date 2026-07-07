import type { CaptureResult } from 'posthog-js';
import { describe, expect, it } from 'vitest';
import {
  sanitizePostHogBeforeSendEvent,
  shouldInitializePostHog,
} from '@/lib/analytics/posthog-before-send';

function captureResult(event: string, properties: Record<string, unknown>): CaptureResult {
  return {
    uuid: '00000000-0000-4000-8000-000000000000',
    event,
    properties,
  };
}

describe('PostHog before_send handling', () => {
  it('sanitizes normal events with path-only URL metadata and visitor id', () => {
    const result = sanitizePostHogBeforeSendEvent(
      captureResult('$pageview', {
        $current_url: 'https://www.veteranpcs.com/contact-agent?email=alex@example.com',
        $referrer: 'https://www.google.com/search?q=pcs+move',
        $initial_current_url: 'https://www.veteranpcs.com/contact-agent?phone=5555551212',
        $initial_referrer: 'https://www.google.com/search?q=raw',
        email: 'alex@example.com',
        source_page_path: '/contact-agent?email=alex@example.com',
        safe_flag: true,
      }),
      'vpcs_test_visitor',
    );

    expect(result?.properties).toEqual({
      source_page_path: '/contact-agent',
      safe_flag: true,
      $pathname: '/contact-agent',
      $referring_path: '/search',
      vpcs_visitor_id: 'vpcs_test_visitor',
    });
  });

  it('uses exception-specific sanitization for valid exception events', () => {
    const result = sanitizePostHogBeforeSendEvent(
      captureResult('$exception', {
        $current_url: 'https://www.veteranpcs.com/contact-agent?email=alex@example.com',
        $referrer: 'https://www.veteranpcs.com/?phone=5555551212',
        $lib: 'web',
        $exception_level: 'error',
        $exception_values: ['Bad email alex@example.com at https://www.veteranpcs.com/foo?bar=baz'],
        $exception_list: [
          {
            type: 'Error',
            value: 'Bad email alex@example.com at https://www.veteranpcs.com/foo?bar=baz',
            stacktrace: {
              frames: [
                {
                  filename: 'https://www.veteranpcs.com/_next/static/chunks/app.js?bar=baz',
                  function: 'render',
                  lineno: 10,
                  colno: 2,
                  in_app: true,
                },
              ],
            },
          },
        ],
      }),
      'vpcs_test_visitor',
    );

    expect(result).not.toBeNull();
    expect(result?.properties.$current_url).toBeUndefined();
    expect(result?.properties.$referrer).toBeUndefined();
    expect(result?.properties.$pathname).toBe('/contact-agent');
    expect(result?.properties.$referring_path).toBe('/');
    expect(result?.properties.vpcs_visitor_id).toBe('vpcs_test_visitor');
    expect(result?.properties.$exception_values).toEqual([
      'Bad email [redacted_email] at /foo',
    ]);

    const exceptionList = result?.properties.$exception_list as Array<Record<string, unknown>> | undefined;
    expect(exceptionList).toHaveLength(1);
    const exception = exceptionList?.[0];
    if (!exception) throw new Error('Expected sanitized exception');

    expect(exception.value).toBe('Bad email [redacted_email] at /foo');
  });

  it('drops exception events without a valid exception list', () => {
    const result = sanitizePostHogBeforeSendEvent(
      captureResult('$exception', {
        $lib: 'web',
        $exception_level: 'error',
      }),
      'vpcs_test_visitor',
    );

    expect(result).toBeNull();
  });

  it('gates browser initialization to production hosts unless local capture is explicit', () => {
    expect(shouldInitializePostHog('www.veteranpcs.com')).toBe(true);
    expect(shouldInitializePostHog('veteranpcs.com')).toBe(true);
    expect(shouldInitializePostHog('WWW.VETERANPCS.COM')).toBe(true);
    expect(shouldInitializePostHog('127.0.0.1')).toBe(false);
    expect(shouldInitializePostHog('localhost')).toBe(false);
    expect(shouldInitializePostHog('preview.veteranpcs.com')).toBe(false);
    expect(shouldInitializePostHog('127.0.0.1', { enableLocalCapture: true })).toBe(true);
    expect(shouldInitializePostHog('localhost', { enableLocalCapture: true })).toBe(true);
  });
});
