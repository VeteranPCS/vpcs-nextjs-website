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

function GuidesPage() {
    return (
        <>
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