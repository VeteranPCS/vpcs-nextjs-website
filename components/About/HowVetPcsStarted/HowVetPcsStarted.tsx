import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import Link from "next/link";

interface ImageAsset {
  image_url?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
  alt?: string;
}

interface PageData {
  foreground_image?: ForegroundImage;
  header?: string;
  description?: string;
  buttonText?: string;
  background_image?: ForegroundImage;
}

export interface AboutVetPcsResponse extends PageData {}

const HowVetPcsStarted = async () => {
  let pageData: AboutVetPcsResponse | null = null;

  try {
    pageData = await aboutService.fetchOverviewDetails('how_veternce_pcs_started');
  } catch (error) {
    console.error('Error fetching About Overview:', error);
    return <p>Failed to load the Digital Innovation Team&apos;s Data.</p>;
  }

  return (
    <div className="bg-[#EEEEEE] pt-14 pb-8 md:pb-0">
      <div>
        <div className="container mx-auto">
          <div className="lg:w-[700px] mx-auto px-12 md:px-0 pt-4 md:pt-0">
            <div>
              <Image
                width={700}
                height={523}
                src={
                  pageData?.foreground_image?.asset?.image_url ||
                  "/assets/Aboutflight.png"
                }
                alt="hand"
                className="lg:w-[700px] lg:h-[523px] md:w-full md:h-full w-auto h-auto pb-6 md:pb-0"
              />
            </div>
            <div className="lg:mt-16 lg:mb-7">
              <h2 className="text-[#292F6C] text-center font-tahoma text-[32px] leading-[32px] font-bold md:pb-0 pb-5 my-4">
                {pageData?.header}
              </h2>
            </div>
            <div className="px-5">
              {pageData?.description?.split("\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="text-black tahoma text-lg font-normal mb-4"
                >
                  {paragraph.trim()}
                </p>
              ))}
            </div>
            <Link href="/how-it-works" className="flex justify-center">
              <Button
                buttonText={pageData.buttonText || "Default Button"}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowVetPcsStarted;
