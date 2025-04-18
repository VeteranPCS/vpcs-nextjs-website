import "@/app/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import classes from "./VeteranCommunity.module.css";
import Image from "next/image";
import veterenceSupportService from "@/services/veterenceSupportService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";
import Link from "next/link";

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

export interface VeteranCommunityProps {
  _id: string;
  image?: ForegroundImage;
  icon?: ForegroundImage;
  title?: string;
  description?: Description[];
  button_text?: string;
  points?: Point[];
}

const VeteranCommunity = async ({ component_slug }: { component_slug: string }) => {
  let pageData: VeteranCommunityProps | null = null;

  try {
    pageData = await veterenceSupportService.fetchVeterenceSupport(
      component_slug
    );
  } catch (error) {
    console.error("Failed to fetch Veterence Data:", error);
    return <p>Failed to load Veterence Data.</p>;
  }

  const validateBlockStyle = (style?: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle)
      ? (style as BlockStyle)
      : "normal";
  };

  return (
    <div className="w-full">
      <div className={classes.veterancommunitycontainer}>
        <div className="container mx-auto items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
          <div className="lg:text-left order-1 lg:order-none md:order-none">
            <div className="lg:block md:block sm:hidden hidden">
              <Image
                width={100}
                height={100}
                src={pageData?.icon?.asset?.image_url || "/icon/userplus.svg"}
                className="w-auto h-auto"
                alt={pageData?.icon?.alt || "Description of the image"}
              />
            </div>
            <div>
              <h1 className="text-white poppins lg:text-left md:text-left sm:text-center text-center text-3xl font-bold leading-[40px] mt-5">
                {pageData?.title}
              </h1>
              <div className="text-white md:text-xl sm:text-sm lg:text-left md:text-left sm:text-center text-center italic font-medium leading-[25px] mt-4 roboto">
                {pageData?.description?.map((block, index) => (
                  <SupportContent
                    key={block._key || `description-${index}`}
                    block={{
                      ...block,
                      style: validateBlockStyle(block.style),
                      children: block.children || [],
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-5">
              {pageData?.points?.map((point, index) => (
                <div
                  className="flex items-start gap-4 my-4"
                  key={point._id || `point-${index}`}
                >
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    className="md:w-[25px] md:h-[25px] sm:w-[20px] sm:h-[20px] w-[25px] h-[25px] mt-1"
                    alt="Description of the image"
                  />
                  <h6 className="text-white roboto md:text-lg sm:text-sm font-medium my-0">
                    <SupportContent
                      key={point._id || `point-content-${index}`}
                      block={{
                        ...point,
                        style: validateBlockStyle(point.style),
                        children: point.children || [], // Ensure children is always an array
                      }}
                    />
                  </h6>
                </div>
              ))}
            </div>
            <Link
              href="/impact"
              className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center"
            >
              <Button buttonText={pageData?.button_text || "Our Impact"} />
            </Link>
          </div>
          <div>
            <Image
              width={552}
              height={552}
              src={
                pageData?.image?.asset?.image_url ||
                "/assets/soldiertraining.png"
              }
              className="w-[552px] md:h-[552px] h-auto"
              alt="Description of the image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeteranCommunity;
