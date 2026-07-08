import React from "react"; // No need for useState or useEffect
import classes from "./Mission.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import Link from "next/link";
import { AboutVetPcsResponse } from '@/components/About/HowVetPcsStarted/HowVetPcsStarted'

const Mission = async () => {
  let pageData: AboutVetPcsResponse | null = null;

  try {
    pageData = await aboutService.fetchOverviewDetails('move_with_a_mission');
  } catch (error) {
    console.error("Error fetching blogs", error);
  }

  if (!pageData) {
    return <p>Failed to load the blog.</p>;
  }

  return (

    <div className="container mx-auto w-full sm:py-16 py-0">
      <div className={classes.missioncontainer}>
        <div
          className="items-center grid lg:grid-cols-2 grid-cols-1 justify-center md:gap-10 gap-2 md:px-10 px-3 lg:py-12"
        >
          <div className="flex lg:justify-end justify-center">
            <Image
              width={1000}
              height={1000}
              src={pageData?.foreground_image?.asset?.image_url || "/assets/Mission.png"}
              className="w-full max-w-[552px] h-auto"
              alt={pageData?.foreground_image?.alt || "Real estate agent with a clipboard outside a home for sale"}
            />
          </div>
          <div className="text-left">
            <div>
              <h2 className="text-white poppins text-[31px] font-bold mt-5 md:text-left sm:text-center text-left">
                {pageData?.header}
              </h2>
              <p className="text-white lg:text-[20px] md:text-[19px] text-[16px] font-normal leading-[30px] mt-4 md:text-left sm:text-center text-left">
                {pageData?.description}
              </p>
            </div>
            <Link href="/how-it-works" className="flex md:justify-start sm:justify-center justify-start items-center mt-2">
              <Button buttonText={pageData?.buttonText || "Default Button"} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;
