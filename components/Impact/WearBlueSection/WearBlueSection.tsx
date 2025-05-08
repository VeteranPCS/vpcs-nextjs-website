import React from "react";
import Button from "@/components/common/Button";
import "@/app/globals.css";
import "aos/dist/aos.css";
import Image from "next/image";
import impactService from "@/services/impactService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";
import Link from "next/link";
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
              {/* Wear blue's mission is to honor the service and sacrifice of the
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
              <Link href="https://www.wearblueruntoremember.org">
                <Button buttonText={storieDetails?.button_text || "Read More"} />
              </Link>
            </div>
          </div>
        </div>
        {/* Warrior Bonfire Program Section */}
        <div className="flex flex-col md:flex-row items-center justify-center py-10 md:py-20">
          <div className="w-full md:w-1/2 flex justify-center">
            <Image
              width={400}
              height={400}
              src={"/assets/warrior-bonfire-program.webp"} // Placeholder, replace with actual image if available
              alt="Warrior Bonfire Program"
              className="lg:w-[400px] w-[300px] lg:h-[400px] h-auto"
            />
          </div>
          <div className="w-full md:w-1/2 mt-10 md:mt-0">
            {/* <div>
              <Image
                width={273}
                height={63}
                src={"/assets/warriorbonfirelogo.png"} // Placeholder, replace with actual logo if available
                alt="Warrior Bonfire Program Logo"
                className="md:w-[273px] md:h-[63px] w-auto h-auto"
              />
            </div> */}
            <h6 className="lg:text-left md:text-left lg:text-[25px] font-bold text-[#292F6C] mt-5 tahoma uppercase">
              WARRIOR BONFIRE PROGRAM
            </h6>
            <p className="text-black font-roboto text-base font-medium ">
              The Warrior Bonfire Program is designed to meet a critical need throughout the United States to provide much needed mental health and peer support to combat wounded Veterans through recreational therapy, and Post-traumatic healing. We are a 501c3 organization founded and led by Veterans to support and honor the immense number of Purple Heart recipients throughout the nation. Our signature program, the Bonfire retreat, Bonfire Retreats are recreational therapy based, multi-day events that are reserved primarily for six Purple Heart Veterans. Bonfire retreats provide opportunities for wounded veterans, in small groups of six, to enjoy a favorite activity while partaking in the camaraderie and therapeutic value of spending time around the bonfire with fellow veterans while promoting Post-Traumatic Healing and the building of support communities, fostering healing and improving lives. Each retreat is concluded with a bonfire including a U.S. Flag retirement ceremony providing participants with an opportunity to honor fallen comrades.
            </p>
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center mt-4 md:mt-0">
              <Link href="https://warriorbonfireprogram.org">
                <Button buttonText="Warrior Bonfire Program" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitaryHomePage;
