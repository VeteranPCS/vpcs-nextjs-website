import "@/app/globals.css";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import BlockContent from "@/components/Blog/BlockContent";
import { validateBlockStyle } from "@/components/Blog/BlogDetail";

const DigitalTeam = async () => {
  let DigitalTeamDetails: TeamMember[] | null = null;

  try {
    DigitalTeamDetails = await aboutService.fetchMembersDetail('digital_innovation');

    // Sort team members by specific order
    if (DigitalTeamDetails) {
      const nameOrder = ['Stephanie Camfield', 'Harper Foley', 'Michelle Bowler'];
      DigitalTeamDetails.sort((a, b) => {
        const aIndex = nameOrder.indexOf(a.name);
        const bIndex = nameOrder.indexOf(b.name);
        return aIndex - bIndex;
      });
    }
  } catch (error) {
    console.error('Error fetching Digital Innovation Team&apos;s Data:', error);
    return <p>Failed to load the Digital Innovation Team&apos;s Data.</p>;
  }

  return (
    <div className="bg-white py-3 px-5 mt-10">
      <div className="bg-[#EEEEEE] px-9 sm:px-0 pb-14">
        <div className="mt-10 pt-7 pb-14 ">
          <h1 className="text-[#292F6C] font-bold xl:text-[55px] lg:text-[50px] sm:text-[40px] text-[40px] leading-[54px] tahoma text-center">
            Meet the <span className="font-normal">Veteran</span>PCS team
          </h1>
        </div>
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px] tahoma">
              OPERATIONS & TECH
            </h6>
            <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Veterans and Military Spouses, Just Like You
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9 mt-10">
            {DigitalTeamDetails.map((details) => (
              <div
                key={details._id}
                className="border border-[#EAECF0] bg-white mx-auto mt-5"
              >
                <div>
                  <Image
                    src={
                      details?.image?.asset?.image_url ||
                      "/assets/CeoPasteimage.png"
                    }
                    alt="Jason"
                    width={417}
                    height={400}
                    className="w-full sm:h-[350px] h-auto object-cover"
                  />
                </div>
                <div className="px-5 py-5">
                  <h6 className="text-black tahoma font-semibold text-lg md:text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-sm md:text-lg font-light">
                    {details.designation}
                  </span>
                  <div className="relative">
                    {/* Hidden checkbox to track toggle state */}
                    <input type="checkbox" id={`toggle-${details._id}`} className="peer hidden" />

                    {/* Text that expands/collapses */}
                    <p className="text-[#5F6980] max-h-28 text-sm md:text-lg font-light mt-3 mb-3 overflow-hidden peer-checked:max-h-full transition-all duration-300">
                      {details?.description?.map((block, index) => (
                        <BlockContent
                          key={block._key || index}
                          blocks={[
                            {
                              ...block,
                              style: validateBlockStyle(block.style),
                            },
                          ]}
                        />
                      ))}
                    </p>

                    {/* Single label that toggles state */}
                    <label htmlFor={`toggle-${details._id}`} className="cursor-pointer text-[#292F6C] tahoma text-sm font-bold absolute bottom-[-1] left-0 bg-white peer-checked:before:content-['Read_Less'] before:content-['Read_More'] before:bg-white before:block">
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTeam;
