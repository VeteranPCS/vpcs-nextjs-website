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
    expect(bahCalculator).toContain("captureAnalyticsEvent('calculator_cta_clicked'");
    expect(bahCalculator).toContain('bah_result_lender_cta');
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
    expect(conciergeWidget).toContain('queryMetrics(pendingSeed.openingMessage)');
    expect(conciergeWidget).not.toMatch(/\b(message_text|raw_text|query|search_query):\s*text\b/);
  });

  it('routes shared CTA wrappers through explicit tracked links', async () => {
    const agentCta = await source('components/common/AgentCtaLink.tsx');
    const lenderCta = await source('components/common/LenderCtaLink.tsx');
    const stateMap = await source('components/homepage/StateMap.tsx');

    expect(agentCta).toContain('TrackedCtaLink');
    expect(lenderCta).toContain('TrackedCtaLink');
    expect(stateMap).toContain('state_map_mobile_state');
    expect(stateMap).toContain('state_map_state');
  });

  it('does not treat agent finder popup impressions as CTA clicks', async () => {
    const agentFinderPopup = await source('components/AgentFinderPopup/AgentFinderPopup.tsx');

    expect(agentFinderPopup).toContain('agent_finder_popup_shown');
    expect(agentFinderPopup).not.toContain('agent_finder_popup_viewed');
    expect(agentFinderPopup).toContain('agent_finder_popup_submit');
    expect(agentFinderPopup).not.toContain("captureAnalyticsEvent('cta_clicked'");
  });

  it('keeps calculator CTA payloads complete', async () => {
    const movingBonus = await source('components/PcsResources/MovingBonusCalculator/MovingBonusCalculator.tsx');
    const vaLoanCalculator = await source('app/(site)/va-loan-calculator/page.tsx');

    expect(movingBonus).toContain("captureAnalyticsEvent('calculator_cta_clicked'");
    expect(movingBonus).toContain("calculator_id: 'moving_bonus'");
    expect(movingBonus).toContain("calculator_name: 'Moving Bonus Calculator'");
    expect(vaLoanCalculator).toContain("captureAnalyticsEvent('calculator_cta_clicked'");
    expect(vaLoanCalculator).toContain("calculator_id: 'va_loan_calculator'");
    expect(vaLoanCalculator).toContain("calculator_name: 'VA Loan Calculator'");
    expect(vaLoanCalculator).not.toContain("calculator_id: 'va_loan'");
  });

  it('keeps guide download telemetry wired on all guide surfaces', async () => {
    const guideSources = await Promise.all([
      source('components/common/DownloadGuideComponent.tsx'),
      source('components/homepage/VaLoanGuideDownload.tsx'),
      source('components/homepage/VeteranPCSWorksComp/HomebuyerGuideDownload.tsx'),
      source('components/PcsResources/PcsResourcesVaLoanGuide/PcsResourcesVaLoanGuide.tsx'),
    ]);

    for (const guideSource of guideSources) {
      expect(guideSource).toContain("captureAnalyticsEvent('guide_download_requested'");
      expect(guideSource).toContain("captureAnalyticsEvent('guide_download_started'");
      expect(guideSource).toContain('formTrackingPayload()');
    }
  });

  it('keeps server-owned PostHog events out of the client event union', async () => {
    const clientAnalytics = await source('lib/analytics/client.ts');

    expect(clientAnalytics).not.toContain("| 'concierge_tool_submitted'");
    expect(clientAnalytics).not.toContain("| 'concierge_tool_completed'");
    expect(clientAnalytics).not.toContain("| 'concierge_tool_failed'");
    expect(clientAnalytics).not.toContain("| 'lead_conversion_created'");
  });

  it('adds safe submission ids to concierge tool completion telemetry', async () => {
    const leadTools = await source('lib/ai/tools/lead-tools.ts');

    expect(leadTools).toContain('function submissionIdFromResponse');
    expect(leadTools).toContain('submission_id: submissionIdFromResponse(serverResponse)');
  });
});
