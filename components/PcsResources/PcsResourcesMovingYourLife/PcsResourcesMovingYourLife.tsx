import React from "react";
import "@/app/globals.css";
import Image from "next/image";
import Link from "next/link";
import resourcesService from "@/services/resourcesService";

interface LifeResource {
  _id: string;
  name: string;
  description: string;
  url: string;
  logo: {
    asset: {
      image_url: string;
    };
    alt: string;
  };
}

const PcsResourcesMovingYourLife = async () => {
  let life_resources: LifeResource[] | null = null;

  try {
    life_resources = await resourcesService.fetchLifeResources(); // fetch data on the server side
  } catch (error) {
    console.error("Error fetching Life Resources", error);
  }

  if (!life_resources) {
    return <p>Failed to load the blog.</p>;
  }

  return (
    <div className="bg-[#E8E8E8] py-12 px-5">
      <div className="container mx-auto">
        <div>
          <h2 className="text-[#003486] tahoma lg:text-[43px] md:text-[43px] sm:text-[43px] text-[43px] font-bold leading-[46px]">
            Moving your life resources
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10">
          {life_resources.map((life_resource) => (
            <div key={life_resource._id}>
              <Image
                width={356}
                height={95}
                // item?.userImage?.asset?.image_url ||
                src={
                  life_resource?.logo?.asset?.image_url ||
                  "/assets/MovingLifeimg1.png"
                }
                alt={life_resource?.logo?.alt || "no alt"}
                className="md:w-[356px] md:h-[95px] sm:w-auto sm:h-auto w-auto h-auto"
              />
              <div className="mt-5">
                <Link
                  href={life_resource?.url}
                  className="text-[#292F6C] poppins lg:text-[21px] md:text-[21px] sm:text-[19px] text-[19px] font-bold underline"
                >
                  {life_resource?.name}
                </Link>
                <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[17px] text-[17px] font-light mt-1">
                  {life_resource?.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesMovingYourLife;
