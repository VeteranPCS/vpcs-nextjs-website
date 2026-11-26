import { describe, expect, it } from 'vitest';
import { appendLeadSubmissionMarker } from '../submission-marker';

describe('Web-to-Lead submission marker', () => {
  it('appends a submission marker to the WebForm URL', () => {
    expect(
      appendLeadSubmissionMarker(
        'https://www.veteranpcs.com/contact-agent?state=colorado',
        'abc 123',
      ),
    ).toBe('https://www.veteranpcs.com/contact-agent?state=colorado&sid=abc+123');
  });

  it('keeps long marked WebForm URLs within the Salesforce URL field limit', () => {
    const longQuery = `state=colorado&extra=${'x'.repeat(400)}`;
    const marked = appendLeadSubmissionMarker(
      `https://www.veteranpcs.com/contact-agent?${longQuery}`,
      'submission-test-id',
    );

    expect(marked.length).toBeLessThanOrEqual(255);
    expect(marked).toContain('sid=submission-test-id');
  });
});
