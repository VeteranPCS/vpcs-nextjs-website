import { Metadata } from "next";
import Script from "next/script";
import { WithContext, ItemList } from "schema-dts";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import VideoFamily from "@/components/homepage/VideoFamily"
import PcsResourcesTrustedResources from "@/components/PcsResources/PcsResourcesTrustedResources/PcsResourcesTrustedResources";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import PcsResourcesHowDoesWork from "@/components/PcsResources/PcsResourcesHowDoesWork/PcsResourcesHowDoesWorkIt";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import StateMap from "@/components/homepage/StateMap";
import FrequentlyAskedQuestions from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import GuidesHero from "@/components/GuidesHero/GuidesHero";
import VaLoanGuideDownload from "@/components/homepage/VaLoanGuideDownload";
import HomebuyerGuideDownload from "@/components/homepage/VeteranPCSWorksComp/HomebuyerGuideDownload";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Free VA Loan & First-Time Homebuyer Guides";
const META_DESCRIPTION = "Download our free guides to help you navigate PCS moves, VA loans, and first-time homebuying. Our veteran and military spouse agents are here to support you every step of the way.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL || ""),
    title: {
        template: "%s | VeteranPCS",
        default: META_TITLE,
    },
    alternates: {
        canonical: `${BASE_URL}/guides`,
    },
    description: META_DESCRIPTION,
    openGraph: {
        type: "website",
        locale: "en_US",
        url: BASE_URL,
        siteName: "VeteranPCS",
        images: [
            {
                url: `${BASE_URL}/opengraph/og-guides.png`,
                width: 1200,
                height: 630,
                alt: "VeteranPCS",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        description: META_DESCRIPTION,
        title: META_TITLE,
        images: ['/opengraph/og-guides.png'],
    },
};


function GuidesPage() {
    const jsonLd: WithContext<ItemList> = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "item": {
                    "@type": "DigitalDocument",
                    "name": "VA Loan Guide",
                    "description": "A comprehensive guide to understanding VA loans and benefits for veterans and military families.",
                    "url": `${BASE_URL}/guides#va-loan-guide`,
                    "provider": {
                        "@type": "Organization",
                        "name": "VeteranPCS",
                        "url": BASE_URL
                    }
                }
            },
            {
                "@type": "ListItem",
                "position": 2,
                "item": {
                    "@type": "DigitalDocument",
                    "name": "First-Time Homebuyer Guide",
                    "description": "Essential information for first-time homebuyers, with specialized guidance for military families.",
                    "url": `${BASE_URL}/guides#homebuyer-guide`,
                    "provider": {
                        "@type": "Organization",
                        "name": "VeteranPCS",
                        "url": BASE_URL
                    }
                }
            }
        ]
    };

    return (
        <>
            <Script
                id="json-ld-guides"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <GuidesHero />
            <div id="va-loan-guide">
                <VaLoanGuideDownload />
            </div>
            <VideoFamily />
            <Testimonials />
            <div id="homebuyer-guide">
                <HomebuyerGuideDownload />
            </div>
            <PcsResourcesHowDoesWork />
            <ReviewsList />
            <PcsResourcesTrustedResources />
            <div className="bg-[#EEEEEE]">
                <VideoReview />
                <AboutOurStory />
            </div>
            <StateMap
                title="Buying or Selling?"
                subTitle="Choose a state below to connect with our veteran and military spouse agents and lenders"
                buttonText="Don't want to browse? Find an Agent For Me"
                buttonLink="/contact-agent"
            />
            <FrequentlyAskedQuestions />
            <KeepInTouch />
        </>
    )
}

export default GuidesPage