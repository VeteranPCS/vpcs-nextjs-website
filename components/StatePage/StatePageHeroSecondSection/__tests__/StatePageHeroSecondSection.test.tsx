import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import StatePageHeroSecondSection from "@/components/StatePage/StatePageHeroSecondSection/StatePageHeroSecondSection";

describe("StatePageHeroSecondSection", () => {
  it("replaces the logo panel with the Colorado PCS guide promo", () => {
    const html = renderToStaticMarkup(
      <StatePageHeroSecondSection
        stateName="Colorado"
        stateCode="CO"
        stateSlug="colorado"
      />,
    );

    expect(html).toContain("Free PCS Relocation Guide");
    expect(html).toContain("Colorado Edition");
    expect(html).toContain("/downloads/colorado-pcs-guide.pdf");
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
    expect(html).not.toContain("/downloads/colorado-pcs-guide.pdf");
  });
});
