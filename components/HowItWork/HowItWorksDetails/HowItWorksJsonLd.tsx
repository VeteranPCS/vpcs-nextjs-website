import { WithContext, FAQPage } from "schema-dts";
import { FAQ_JSONLD } from "./howItWorksContent";

// FAQPage JSON-LD for /how-it-works (GEO/AI-answer-engine play, not a Google
// rich-result claim). Answers come from the typed FAQ_JSONLD contract; each
// answer string must appear verbatim in the rendered page copy.
// Rendered as a plain inline <script> (not next/script) so the block is present
// in the server HTML for crawlers that do not execute JavaScript.
export default function HowItWorksJsonLd() {
  const jsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_JSONLD.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      id="json-ld-how-it-works-faq"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
