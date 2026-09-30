import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CustomerValidationSummary, { customerErrorProps } from '../CustomerValidationSummary';

describe('customer validation associations', () => {
  it('keeps help associations and appends the stable error id', () => {
    expect(customerErrorProps({ email: { message: 'Invalid' } }, 'email', 'email-help')).toEqual({
      'aria-invalid': true, 'aria-describedby': 'email-help email-error',
    });
    expect(customerErrorProps({}, 'email', 'email-help')).toEqual({ 'aria-invalid': false, 'aria-describedby': 'email-help' });
  });
  it('renders a focusable linked summary, without a competing live region', () => {
    const html = renderToStaticMarkup(<CustomerValidationSummary focusRequest={1} errors={{ email: { message: 'Enter an email or phone number.' } }} />);
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('href="#email"');
    expect(html).not.toContain('role="alert"'); expect(html).not.toContain('aria-live');
  });
  it('does not show a summary before a submit attempt or after errors clear', () => {
    expect(renderToStaticMarkup(<CustomerValidationSummary focusRequest={0} errors={{ email: { message: 'Invalid' } }} />)).toBe('');
    expect(renderToStaticMarkup(<CustomerValidationSummary focusRequest={2} errors={{}} />)).toBe('');
  });
});
