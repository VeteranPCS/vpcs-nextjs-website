import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function source(filePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), filePath), 'utf8');
}

describe('analytics privacy regressions', () => {
  it('keeps legacy action wrappers free of email-keyed PostHog events', async () => {
    const contactAgent = await source('app/(site)/contact-agent/actions.ts');
    const contactLender = await source('app/(site)/contact-lender/actions.ts');
    const combined = `${contactAgent}\n${contactLender}`;

    expect(combined).not.toContain('captureServerEvent');
    expect(combined).not.toContain('contact_agent_lead_created');
    expect(combined).not.toContain('contact_lender_lead_created');
    expect(combined).not.toMatch(/distinctId:\s*[^,\n]*email/);
  });

  it('tracks BAH usage with ZIP prefix only in the analytics payload', async () => {
    const bahCalculator = await source('components/BAHCalculator.tsx');
    const match = bahCalculator.match(
      /captureAnalyticsEvent\('bah_calculator_used', \{([\s\S]*?)\n\s*\}\);/,
    );
    const trackingProperties = match?.[1] ?? '';

    expect(trackingProperties).toContain('zip_prefix: zipPrefix(formData.zipCode)');
    expect(trackingProperties).not.toMatch(/zip(?:Code|_code):/);
    expect(bahCalculator).not.toContain('bah_zip_code');
  });

  it('routes first-time homebuyer guide downloads to their own server action', async () => {
    const guideComponent = await source('components/common/DownloadGuideComponent.tsx');

    expect(guideComponent).toContain('homebuyerGuideForm');
    expect(guideComponent).toMatch(
      /resolvedGuideId === 'first_time_homebuyer_guide'[\s\S]*homebuyerGuideForm/,
    );
  });

  it('keeps concierge message analytics aggregate-only', async () => {
    const conciergeWidget = await source('components/Concierge/ConciergeWidget.tsx');

    expect(conciergeWidget).not.toContain('posthog');
    expect(conciergeWidget).toContain('queryMetrics(text)');
    expect(conciergeWidget).not.toMatch(/\b(message_text|raw_text|query|search_query):\s*text\b/);
  });
});
