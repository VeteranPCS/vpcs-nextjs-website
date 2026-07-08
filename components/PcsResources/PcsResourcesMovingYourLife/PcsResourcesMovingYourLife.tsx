import React from "react";
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
          <h2 className="text-[#003486] md:text-[43px] text-[31px] font-bold leading-[46px]">
            Moving your life resources
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-16 mt-10">
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
                className="md:w-[356px] w-auto h-auto"
              />
              <div className="mt-5">
                <Link
                  href={life_resource?.url}
                  className="text-[#292F6C] poppins md:text-[21px] text-[19px] font-bold underline"
                >
                  {life_resource?.name}
                </Link>
                <p className="text-[#000000] roboto md:text-[18px] text-[17px] font-light mt-1">
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
