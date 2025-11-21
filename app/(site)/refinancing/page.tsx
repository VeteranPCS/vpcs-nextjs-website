import { Metadata } from "next";
import Script from "next/script";
import { WithContext, FAQPage } from "schema-dts";
import RefinancingHero from "@/components/Refinancing/RefinancingHero/RefinancingHero";
import RefinancingContent from "@/components/Refinancing/RefinancingContent/RefinancingContent";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import StateMap from "@/components/homepage/StateMap";
import Testimonials from "@/components/Testimonials/TestimonialPage";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "VA Loan Refinancing: IRRRL, Cash-Out & Lower Your Rate | VeteranPCS";
const META_DESCRIPTION = "Lower your mortgage rate with VA Streamline IRRRL refinancing. No income verification, no appraisal, and closing costs rolled into your loan. Connect with VA loan experts who understand military families.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL || ""),
  title: {
    template: "%s | VeteranPCS",
    default: META_TITLE,
  },
  alternates: {
    canonical: `${BASE_URL}/refinancing`,
  },
  description: META_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${BASE_URL}/refinancing`,
    siteName: "VeteranPCS",
    images: [
      {
        url: `${BASE_URL}/opengraph/og-logo.png`,
        width: 1200,
        height: 630,
        alt: "VeteranPCS - VA Loan Refinancing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    description: META_DESCRIPTION,
    title: META_TITLE,
    images: ['/opengraph/og-logo.png'],
  },
  keywords: [
    "VA loan refinancing",
    "IRRRL",
    "VA streamline refinance",
    "VA cash out refinance",
    "lower mortgage rate",
    "VA funding fee",
    "military refinancing",
    "veteran home loan",
    "refinance timeline",
    "VA disability",
    "HELOC",
    "HELOAN"
  ]
};

function RefinancingPage() {
  const jsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the VA Streamline IRRRL?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The VA Streamline IRRRL (Interest Rate Reduction Refinance Loan) is a simplified way to lower your mortgage rate. It requires less paperwork than a purchase, with no income and asset verification, no appraisal, and flexible eligibility requirements. Closing typically takes 10-14 business days, and closing costs are rolled into the loan with no out-of-pocket cost."
        }
      },
      {
        "@type": "Question",
        "name": "When does refinancing make sense?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "If it's a long-term hold, usually saving 6/8ths of a point to 1% in rate reduction makes sense. However, each homeowner's situation is unique. A competent lender will run the break-even point to ensure refinancing benefits you."
        }
      },
      {
        "@type": "Question",
        "name": "When can I refinance using VA Streamline IRRRL?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can refinance using the VA Streamline IRRRL every 210 days from your first mortgage payment due date."
        }
      },
      {
        "@type": "Question",
        "name": "Does refinancing affect my credit?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "With VA Streamline IRRRL, lenders can do a soft credit pull and close on a soft credit pull, minimizing the impact on your credit score."
        }
      },
      {
        "@type": "Question",
        "name": "Does VA disability rating affect refinancing?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, a VA disability rating will waive the VA Funding Fee on both a purchase and a refinance, which can result in significant savings."
        }
      },
      {
        "@type": "Question",
        "name": "What are typical junk fees I should avoid?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Typical junk fees to avoid on refinances include processing fees, lock fees, admin fees, and underwriting fees. Most reputable lenders will waive these fees on refinances."
        }
      }
    ]
  };

  return (
    <>
      <Script
        id="json-ld-refinancing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RefinancingHero />
      <RefinancingContent />
      <Testimonials />
      <StateMap
        title="Ready to Explore Refinancing?"
        subTitle="Connect with our VA loan experts who understand military families and can help you find the best refinancing solution"
        buttonText="Connect with a Lender"
        buttonLink="/contact-lender"
      />
      <KeepInTouch />
    </>
  );
}

export default RefinancingPage;
