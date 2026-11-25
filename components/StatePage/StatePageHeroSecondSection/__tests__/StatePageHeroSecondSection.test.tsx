import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubProductionEnv, stubWebdevEnv } from "@/lib/salesforce/__tests__/configuration-fixtures";

vi.mock('@/services/salesForcePostFormsService', () => ({ KeepInTouchForm: vi.fn(), vaLoanGuideForm: vi.fn(), homebuyerGuideForm: vi.fn(), coloradoRelocationGuideForm: vi.fn() }));

import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";

describe("StatePageHeroSecondSection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("places the Colorado relocation guide below the intact lending support banner", () => {
    stubProductionEnv();
    const html = renderToStaticMarkup(
      <StatePageHeroSecondSection
        stateName="Colorado"
        stateCode="CO"
        stateSlug="colorado"
      />,
    );

    expect(html).toContain("Free PDF · 22 pages");
    expect(html).toContain("Colorado Relocation Guide");
    expect(html).toContain("Tyler Parker");
    expect(html).toContain("Download Now");
    expect(html).toContain("Contact Tyler");
    expect(html).toContain("id=001Rg00000pmUUk");
    expect(html).toContain("state=colorado");
    expect(html).toContain("colorado-relocation-guide-tyler-parker-v7.webp");
    expect(html).not.toContain("/downloads/colorado-pcs-guide.pdf");
    expect(html).toContain("/icon/VeteranPCSlogo.svg");
    expect(html).toContain("real estate team in Colorado");
    expect(html).toContain("VA Loan Lender");
    expect(html).toContain("Assistance");
    // The guide is a sibling section after the complete support banner.
    expect(html).toMatch(/VeteranPCS lending support[\s\S]*Assistance[\s\S]*<\/section><section aria-labelledby="colorado-relocation-guide-title"/);
  });

  it("keeps the editorial credit and renders a general Colorado contact in WebDev", () => {
    stubWebdevEnv();
    const html = renderToStaticMarkup(
      <StatePageHeroSecondSection stateName="Colorado" stateCode="CO" stateSlug="colorado" />,
    );
    expect(html).toContain("Tyler Parker");
    expect(html).toContain("Find a Colorado Agent");
    expect(html).toContain("/contact-agent?form=agent&amp;state=colorado");
    expect(html).not.toContain("id=001Rg00000pmUUk");
  });

  it("keeps the existing VeteranPCS panel for other states", () => {
    const html = renderToStaticMarkup(
      <StatePageHeroSecondSection
        stateName="Texas"
        stateCode="TX"
        stateSlug="texas"
      />,
    );

    expect(html).toContain("/icon/VeteranPCSlogo.svg");
    expect(html).toContain("real estate team in Texas");
    expect(html).not.toContain("Colorado Relocation Guide");
  });
});
