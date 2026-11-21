import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock('@/services/salesForcePostFormsService', () => ({ KeepInTouchForm: vi.fn(), vaLoanGuideForm: vi.fn(), homebuyerGuideForm: vi.fn(), coloradoRelocationGuideForm: vi.fn() }));

import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";

describe("StatePageHeroSecondSection", () => {
  it("replaces the logo panel with the Colorado relocation guide promo", () => {
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
    expect(html).not.toContain("/icon/VeteranPCSlogo.svg");
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
