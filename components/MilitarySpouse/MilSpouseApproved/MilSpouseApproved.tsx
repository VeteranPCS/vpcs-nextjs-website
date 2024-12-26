import "@/styles/globals.css";
import Image from "next/image";
import SliderValueLabel from "@/components/MilitarySpouse/SquaredAway/SquaredAwaySlider";
import { MilitarySpouseApprovedProps } from '@/services/militarySpouseService';
import militarySpouseService from "@/services/militarySpouseService";

const MilitarySpouseApproved = async () => {
  let milSpouseApproved: MilitarySpouseApprovedProps | null = null;

  try {
    milSpouseApproved = await militarySpouseService.fetchMilitarySpouseApproved();
  } catch (error) {
    console.error("Error fetching Military Spouse Approved Content", error);
  }

  if (!milSpouseApproved) {
    return <p>Failed to load the Military Spouse Approved Content.</p>;
  }

  return (
    <div className="w-full py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <div
          className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex justify-center">
            <Image
              src={milSpouseApproved?.image?.asset?.image_url || "/assets/milspouseapproved.png"}
              alt={milSpouseApproved?.image?.alt || "approved"}
              width={1000}
              height={1000}
              className="md:w-[613px] md:h-[613px] w-full h-full"
            />
          </div>
          <div>
            <div>
              <h2 className="text-[#292F6C] tahoma lg:text-[63px] md:text-[53px] sm:text-[43px] text-[35px] leading-[40px] md:leading-normal font-bold my-6 md:my-0">
                {milSpouseApproved?.component_title}
              </h2>
              <p className="text-[#292F6C] tahoma lg:text-[30px] md:text-[30px] sm:text-[20px] text-[20px] font-normal">
                {milSpouseApproved?.header}
              </p>
            </div>
            <div className="lg:ml-10 my-7">
              <ul>
                {milSpouseApproved.description.map((block) =>
                  block.listItem === "bullet" ? (
                    <li
                      key={block._key}
                      className="text-[#58595D] roboto lg:text-[20px] md:text-[20px] sm:text-[20px] text-[20px] font-medium list-disc mb-2 lg:w-[500px]"
                    >
                      {block.children.map((child) => child.text).join(" ")}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
            <div>
              <SliderValueLabel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitarySpouseApproved;
