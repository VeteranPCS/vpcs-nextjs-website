import React from "react";
import Button from "@/components/common/Button";
import "@/styles/globals.css";
import "aos/dist/aos.css";
import Image from "next/image";
import impactService from "@/services/impactService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";

type BlockStyle = "h1" | "h2" | "h3" | "normal";

interface ForegroundImage {
  asset?: ImageAsset;
  alt?: string;
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

interface ImageAsset {
  image_url?: string;
}

export interface WearBlueSectionProps {
  _id: string;
  poster_1?: ForegroundImage;
  poster_2?: ForegroundImage;
  title?: string;
  description?: Description[];
  button_text?: string;
}

const MilitaryHomePage = async () => {
  let storieDetails: WearBlueSectionProps | null = null;

  try {
    storieDetails = await impactService.fetchSuccessStories();
  } catch (error) {
    console.error('Failed to fetch Success Stories:', error);
    return <p>Failed to load Family Success Stories.</p>;
  }

  const validateBlockStyle = (style: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle)
      ? (style as BlockStyle)
      : "normal";
  };

  return (
    <div className="bg-[#F4F4F4] px-9 sm:px-0">
      <div className="container mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-center py-10 md:py-20">
          <div className="w-full md:w-1/2  flex justify-center">
            <Image
              width={400}
              height={400}
              src={storieDetails?.poster_1?.asset?.image_url || "/assets/wereblueleft.png"}
              alt={storieDetails?.poster_1?.alt || "Military Family"}
              className="lg:w-[400px] w-[300px] lg:h-[400px] h-auto"
            />
          </div>
          <div className="w-full md:w-1/2 mt-10 md:mt-0">
            <div>
              <Image
                width={273}
                height={63}
                src={storieDetails?.poster_2?.asset?.image_url || "/assets/wearblue.png"}
                alt={storieDetails?.poster_2?.alt || "wearblue"}
                className="md:w-[273px] md:h-[63px] w-auto h-auto"
              />
            </div>
            <h6 className="lg:text-left md:text-left lg:text-[25px] font-bold text-[#292F6C] mt-5 tahoma uppercase">
              {storieDetails?.title}
            </h6>
            <p className="text-black font-roboto text-base font-medium ">
              {/* Wear blue’s mission is to honor the service and sacrifice of the
              American military through active remembrance. */}
              {storieDetails?.description?.map((point, index) => (
                <SupportContent
                  key={point._id || index}
                  block={{
                    ...point,
                    style: validateBlockStyle(point.style || "normal"),
                  }}
                />
              ))}
            </p>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center mt-4 md:mt-0">
              <Button buttonText={storieDetails?.button_text || "Read More"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitaryHomePage;
