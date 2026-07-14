import Image from "next/image";
import aboutService from "@/services/aboutService";
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';
import BioToggle from "@/components/About/BioToggle";
import { getTeamBio } from "@/components/About/teamBios";

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
          <div className="mx-auto">
            <div>
              <span className="text-[#282828] flex justify-center lg:text-[21px] text-[18px] font-bold">
                CEO & FOUNDER
              </span>
            </div>
            <div>
              <h2 className="text-[#292F6C] font-bold text-center lg:text-[55px] md:text-[60px] text-[30px]">
                Meet Our Founder
              </h2>
            </div>
            <div>
              <p className="text-[#161C2Db3] text-center font-normal sm:text-[24px] text-[14px] mx-auto px-9 sm:px-4">
                VeteranPCS was created to be different. A site dedicated to
                equally serving the agents as much as the military families
                going through a PCS or move.
              </p>
            </div>

            {CEODetails.map((details) => (
              <div key={details._id} className="border border-[#EAECF0] bg-white w-full max-w-[417px] mx-auto mt-5">
                <div>
                  <Image
                    src={details?.image?.asset?.image_url || "/assets/CeoPasteimage.png"}
                    alt={details.name}
                    width={417}
                    height={400}
                    className="object-cover"
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
            {/* </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeoFounder;
