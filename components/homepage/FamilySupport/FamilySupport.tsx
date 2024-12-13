"use client";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./FamilySupport.module.css";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import veterenceSupportService from "@/services/veterenceSupportService";
import SupportContent from "./SupportContent";
import { useRouter } from "next/navigation";

type BlockStyle = "h1" | "h2" | "h3" | "normal";

interface ImageAsset {
  image_url?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
  alt?: string;
}

interface Child {
  _key: string;
  marks: string[];
  text: string;
}

interface Description {
  _key?: string;
  style?: string;
  children?: Child[];
}

interface Point {
  _id?: string;
  style?: string;
  children?: Child[];
}

interface PageData {
  _id: string;
  image?: ForegroundImage;
  icon?: ForegroundImage;
  title?: string;
  description?: Description[];
  button_text?: string;
  points?: Point[];
}

const FamilySupport = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/how-it-works"); // Navigate to the "stories" page
  };
  const [pageData, setPageData] = useState<PageData | undefined>();

  const fetchFamilyData = useCallback(async () => {
    try {
      const response = await veterenceSupportService.fetchVeterenceSupport(
        "support-veterans-and-their-families"
      );
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPageData(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, []);

  useEffect(() => {
    fetchFamilyData();
  }, [fetchFamilyData]);

  const validateBlockStyle = (style: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle)
      ? (style as BlockStyle)
      : "normal";
  };

  return (
    <div className="container mx-auto w-full md:py-16 py-0">
      <div className={classes.familysupportcontainer}>
        <div
          className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          {/* Image Section */}
          <div className="flex justify-center">
            <Image
              src={
                pageData?.image?.asset?.image_url || "/assets/meetdaugether.png"
              }
              width={530}
              height={530}
              alt={pageData?.image?.alt || "Description of the image"}
              className="lg:w-[530px] lg:h-[530px] md:w-[530px] md:h-[530px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px]"
            />
          </div>

          {/* Content Section */}
          <div className="text-left">
            <div className="lg:block md:block sm:hidden hidden">
              <Image
                width={100}
                height={100}
                className="w-auto h-auto"
                src={pageData?.icon?.asset?.image_url || "/icon/userplus.svg"}
                alt={pageData?.icon?.alt || "Description of the image"}
              />
            </div>
            <div>
              <h1 className="text-white poppins lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-center lg:w-[400px]">
                {pageData?.title}
              </h1>
              <div className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] italic font-medium leading-[25px] mt-4 lg:text-left md:text-left sm:text-center text-center">
                {pageData?.description?.map((block, index) => (
                  <SupportContent
                    key={block._key || index}
                    block={{
                      ...block,
                      style: validateBlockStyle(block.style || "normal"),
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Points Section */}
            <div className="mt-5">
              {pageData?.points?.map((point, index) => (
                <div
                  className="flex items-start gap-4"
                  key={point._id || index}
                >
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto md:mt-1 mt-0.5 w-5 h-5"
                    src="/icon/checkred.svg"
                    alt="Description of the image"
                  />
                  <h6 className="text-white roboto lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-medium leading-[41px]">
                    <SupportContent
                      key={point._id || index}
                      block={{
                        ...point,
                        style: validateBlockStyle(point.style || "normal"),
                      }}
                    />
                  </h6>
                </div>
              ))}
            </div>

            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center">
              <Button
                buttonText={pageData?.button_text || "Learn More"}
                onClick={handleButtonClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySupport;
