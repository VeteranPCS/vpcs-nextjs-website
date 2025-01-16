import "@/styles/globals.css";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import BlockContent from "@/components/Blog/BlockContent";
import { validateBlockStyle } from "@/components/Blog/BlogDetail";

const CeoFounder = async () => {
  let CEODetails: TeamMember[] | null = null;

  try {
    CEODetails = await aboutService.fetchMembersDetail('founder');
  } catch (error) {
    console.error('Error fetching Founder&apos;s Data:', error);
    return <p>Failed to load the Founder&apos;s Data.</p>;
  }

  return (
    <div className="pt-14">
      <div>
        <div className="container mx-auto">
          <div className=" mx-auto">
            <div>
              <span className="text-[#282828] flex justify-center tahoma text-[21px] font-bold">
                CEO & FOUNDER
              </span>
            </div>
            <div>
              <h1 className="text-[#292F6C] font-bold text-center tahoma lg:text-[55px] md:text-[60px] sm:text-[40px] text-[40px] ">
                Meet Our Founder
              </h1>
            </div>
            <div>
              <p className="text-[#161C2Db3] text-center font-normal sm:text-[24px] text-[14px] lg:w-[1000px] leading-[40px] py-10 mx-auto px-9 sm:px-0">
                VeteranPCS was created to be different. A site dedicated to
                equally serving the agents as much as the military families
                going through a PCS or move.
              </p>
            </div>

            {CEODetails.map((details) => (
              <div key={details._id} className="border border-[#EAECF0] bg-white sm:w-[417px] w-[330px] mx-auto mt-5">
                <div>
                  <Image
                    src={details?.image?.asset?.image_url || "/assets/CeoPasteimage.png"}
                    alt="Jason"
                    width={417}
                    height={400}
                    className="object-cover"
                  />
                </div>
                <div className="px-5 py-5">
                  <h6 className="text-black tahoma font-semibold text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-lg font-light">
                    {details.designation}
                  </span>
                  <div className="relative">
                    {/* Hidden checkbox to track toggle state */}
                    <input type="checkbox" id={`toggle-${details._id}`} className="peer hidden" />

                    {/* Text that expands/collapses */}
                    <p className="text-[#5F6980] max-h-28 text-lg font-light mt-3 mb-3 overflow-hidden peer-checked:max-h-full transition-all duration-300">
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
            {/* </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeoFounder;
