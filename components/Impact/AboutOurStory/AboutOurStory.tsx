import React from "react"; // No need for useState or useEffect
import Button from "@/components/common/Button";
import classes from "./AboutOurStory.module.css";
import Image from "next/image";
import impactService from "@/services/impactService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

type BlockStyle = "h1" | "h2" | "h3" | "normal";

export interface OurStoryProps {
  foreground_image?: ForegroundImage;
  header?: string;
  description?: Description[];
  buttonText?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
  alt?: string;
}

interface ImageAsset {
  image_url?: string;
}

interface Description {
  _id?: string;
  _key?: string;
  style?: string;
  children?: Child[];
}

interface Child {
  _key: string;
  marks: string[];
  text: string;
}

const FamilySupport = async () => {
  let storyDetails: OurStoryProps | null = null;

  try {
    storyDetails = await impactService.fetchOurStory();
  } catch (error) {
    console.error("Failed to fetch Our Story:", error);
    return <p>Failed to load Family Support Data.</p>;
  }

  const validateBlockStyle = (style: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle)
      ? (style as BlockStyle)
      : "normal";
  };

  return (
    <div className="container mx-auto w-full sm:py-16 py-0 ">
      <div className={classes.aboutourstorycontainer}>
        <div className="grid lg:grid-cols-2 grid-cols-1 justify-center md:gap-10 gap-2 md:px-10 px-3 lg:py-12 items-center">
          <div className="flex justify-center">
            <Image
              width={426}
              height={500}
              src={
                storyDetails?.foreground_image?.asset?.image_url ||
                "/assets/CEO-founder-Jason-Anderson.png"
              }
              alt={
                storyDetails?.foreground_image?.alt ||
                "Jason Anderson, founder of VeteranPCS"
              }
              className="w-full max-w-[426px] h-auto"
            />
          </div>
          <div className="md:text-left sm:text-justify text-center">
            <div>
              <h2 className="text-white poppins md:text-[35px] text-[31px] font-bold mt-5 md:text-left text-center px-0">
                {storyDetails?.header}
              </h2>
              <div className="text-white roboto text-[16px] font-medium mt-4 md:w-[500px] w-full">
                {storyDetails?.description?.map((point, index) => (
                  <SupportContent
                    key={point._id || index}
                    block={{
                      ...point,
                      style: validateBlockStyle(point.style || "normal"),
                    }}
                  />
                ))}
              </div>
            </div>
            <TrackedCtaLink
              href="/about"
              className="sm:mt-0 mt-16"
              cta={{
                ctaId: 'impact_about_our_story',
                ctaIntent: 'about_navigation',
                ctaPosition: 'impact_our_story',
                ctaComponent: 'impact_about_our_story',
                ctaLabel: storyDetails?.buttonText || 'OUR STORY',
                destination: '/about',
                pageType: 'impact',
              }}
            >
              <Button buttonText={storyDetails?.buttonText || "OUR STORY"} />
            </TrackedCtaLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySupport;
