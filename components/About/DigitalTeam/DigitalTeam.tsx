import Image from "next/image";
import aboutService from "@/services/aboutService";
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import BioToggle from "@/components/About/BioToggle";
import { getTeamBio } from "@/components/About/teamBios";

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
      <div className="bg-[#EEEEEE] px-9 sm:px-4 pb-14">
        <div className="mt-10 pt-7 pb-14">
          <h2 className="text-[#292F6C] font-bold xl:text-[55px] lg:text-[50px] text-[40px] leading-[54px] text-center">
            Meet the <span className="font-normal">Veteran</span>PCS team
          </h2>
        </div>
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px]">
              OPERATIONS & TECH
            </h6>
            <p className="text-[#000000] text-center font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
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
                    alt={details.name}
                    width={417}
                    height={400}
                    className="w-full sm:h-[350px] h-auto object-cover"
                  />
                </div>
                <div className="px-5 py-5">
                  <h6 className="text-black font-semibold text-lg md:text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-sm md:text-lg font-light">
                    {details.designation}
                  </span>
                  <BioToggle id={details._id}>
                    {getTeamBio(details._id)}
                  </BioToggle>
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
