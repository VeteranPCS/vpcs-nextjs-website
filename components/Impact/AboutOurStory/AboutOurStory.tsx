import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./AboutOurStory.module.css";
import Image from "next/image";
import impactService from "@/services/impactService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";
import Link from "next/link";

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
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12 items-center">
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
                "Description of the image"
              }
              className="lg:w-[426px] lg:h-[500px] md:w-[426px] md:h-[500px] sm:w-[326px] sm:h-[326px] w-[326px] h-auto"
            />
          </div>
          <div className="md:text-left sm:text-justify text-center">
            <div>
              <h1 className="text-white poppins lg:text-[35px] md:text-[35px] sm:text-[31px] text-[31px] font-bold mt-5 md:text-left sm:text-center text-center sm:px-0 px-0">
                {storyDetails?.header}
              </h1>
              <p className="text-white roboto lg:text-[16px] md:text-[16px] sm:text-[16px] text-[16px] font-medium mt-4 lg:w-[500px] md:w-[500px] sm:w-full w-full">
                {storyDetails?.description?.map((point, index) => (
                  <SupportContent
                    key={point._id || index}
                    block={{
                      ...point,
                      style: validateBlockStyle(point.style || "normal"),
                    }}
                  />
                ))}
              </p>
            </div>
            <Link href="/about" className="sm:mt-0 mt-16">
              <Button buttonText={storyDetails?.buttonText || "OUR STORY"} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySupport;
