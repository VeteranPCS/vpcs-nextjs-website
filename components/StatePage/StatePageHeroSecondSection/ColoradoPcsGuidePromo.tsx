"use client";

import {
  captureAnalyticsEvent,
  trackCtaClicked,
} from "@/lib/analytics/client";
import { buildCtaProperties } from "@/lib/analytics/cta";
import { sendGTMEvent } from "@next/third-parties/google";

interface ColoradoPcsGuidePromoProps {
  stateCode: string;
  stateSlug: string;
}

const GUIDE_ID = "colorado_pcs_guide";
const GUIDE_PATH = "/downloads/colorado-pcs-guide.pdf";

export default function ColoradoPcsGuidePromo({
  stateCode,
  stateSlug,
}: ColoradoPcsGuidePromoProps) {
  const handleDownload = () => {
    const trackingProperties = {
      guide_id: GUIDE_ID,
      state_code: stateCode,
      state_slug: stateSlug,
    };

    trackCtaClicked(buildCtaProperties({
      ctaId: "colorado_pcs_guide_download",
      ctaIntent: "download_guide",
      ctaPosition: "state_hero_secondary",
      ctaComponent: "colorado_pcs_guide_promo",
      ctaLabel: "Download the Guide",
      destination: GUIDE_PATH,
      pageType: "state_page",
      stateCode,
      stateSlug,
      guideId: GUIDE_ID,
    }));
    captureAnalyticsEvent("guide_download_requested", trackingProperties);
    sendGTMEvent({
      event: "conversion_download",
      content: "Colorado PCS Guide",
    });
    captureAnalyticsEvent("guide_download_started", trackingProperties);
  };

  return (
    <div className="flex max-w-[430px] flex-col items-start text-left">
      <p className="font-inter text-xs font-bold uppercase tracking-[0.16em] text-white/75">
        Free PCS Relocation Guide
      </p>
      <h2 className="mt-2 font-poppins text-2xl font-bold leading-tight text-white xl:text-3xl">
        Colorado Edition
      </h2>
      <p className="mt-3 font-inter text-sm leading-6 text-white/90">
        Planning your military move? Get your free detailed guide to Colorado
        housing markets, neighborhoods near bases, schools, cost of living,
        relocation tips, and VA loan insights.
      </p>
      <a
        href={GUIDE_PATH}
        download="VeteranPCS-Colorado-PCS-Guide.pdf"
        onClick={handleDownload}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 font-inter text-sm font-bold text-primary transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Download the Guide
      </a>
    </div>
  );
}
