import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import internshipPageService from "@/services/internshipPageService";

interface ActionImage {
  action_image?: {
    asset?: {
      _ref: string;
      image_url?: string; // Make sure image_url exists here
    };
  }
}
export interface InternshipActionDataProps {
  _id: string;
  title: string;
  description: string;
  action_image?: {
    alt?: string;
    asset?: {
      _ref: string;
      image_url?: string; // Make sure image_url exists here
    };
  }
}

const PcsResourcesCalculators = async () => {
  let internshipActionData: InternshipActionDataProps[] = [];

  try {
    internshipActionData = await internshipPageService.fetchActionItem();
  } catch (error) {
    console.error('Failed to fetch Internship Action Items:', error);
    return <p>Failed to load Internship Action Items.</p>;
  }

  return (
    <div className="bg-[#E8E8E8] py-12 px-5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10">
          {internshipActionData.map((data) => (
            <div key={data._id}>
              <div>
                <Image
                  width={1000}
                  height={237}
                  src={data?.action_image?.asset?.image_url || "/assets/successful-team1.png"}
                  alt={data?.action_image?.alt || "check"}
                  className="w-full lg:h-[356px] h-auto"
                />
                <div className="mt-5">
                  <h3 className="text-[#003486] poppins lg:text-[23px] md:text-[23px] sm:text-[17px] text-[17px] font-medium">
                    {data?.title}
                  </h3>
                  <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                    {data?.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesCalculators;
