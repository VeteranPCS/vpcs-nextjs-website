import { Metadata } from "next";
import Testimonials from "@/components/Testimonials/TestimonialPage";
import ReviewsList from "@/components/homepage/ReviewsList/ReviewList";
import VideoReview from "@/components/Impact/VideoReview/VideoReview";
import AboutOurStory from "@/components/Impact/AboutOurStory/AboutOurStory";
import WhyVeteranPcs from "@/components/homepage/WhyVeteranPCS";
import AgentLoanExpert from "@/components/homepage/AgentLoanExpert/AgentLoanExpert";
import SkillFuturesBuild from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild";
import FrequentlyAskedQuestions from "@/components/stories/FrequentlyAskedQuestions/FrequentlyAskedQuestions";
import KeepInTouch from "@/components/homepage/KeepInTouch/KeepInTouch";
import FeaturedCharities from "@/components/Charity/FeaturedCharities";
import CharityHeroSection from "@/components/Charity/CharityHeroSection";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const META_TITLE = "Veteran Charities We Support: Military-Focused Nonprofits & Organizations";
const META_DESCRIPTION = "VeteranPCS supports military-focused charities, donating $25,000+ to organizations like Freedom Service Dogs. See how your closing helps fellow service members and strengthens the veteran community.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL || ""),
    title: {
        template: "%s | VeteranPCS",
        default: META_TITLE,
    },
    alternates: {
        canonical: `${BASE_URL}/impact`,
    },
    description: META_DESCRIPTION,
    openGraph: {
        type: "website",
        locale: "en_US",
        url: BASE_URL,
        siteName: "VeteranPCS",
        images: [
            {
                url: `${BASE_URL}/opengraph/og-logo.png`,
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
        images: ['/opengraph/og-logo.png'],
    },
};


export default function CharityPage() {
    return (
        <>
            <CharityHeroSection />
            <div className="text-center justify-center mt-32 mb-20 lg:my-24">
                <h2 className="text-primary text-4xl">Veteran<span className=" font-bold">PCS Trusted Charities</span></h2>
                <h3 className="text-primary text-lg pt-8">Military focused charities VeteranPCS supports</h3>
            </div>
            <FeaturedCharities />
            <Testimonials />
            <ReviewsList />
            <VideoReview />
            <AboutOurStory />
            <WhyVeteranPcs />
            <AgentLoanExpert />
            <SkillFuturesBuild />
            <FrequentlyAskedQuestions />
            <KeepInTouch />
        </>
    );
}
