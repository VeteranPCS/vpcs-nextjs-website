import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";
import aboutService from "@/services/aboutService";
import { TeamMember } from '@/components/About/AdminTeam/AdminTeam';

const DigitalTeam = async () => {
  let DigitalTeamDetails: TeamMember[] | null = null;

  try {
    DigitalTeamDetails = await aboutService.fetchMembersDetail('digital_innovation');
  } catch (error) {
    console.error('Error fetching Digital Innovation Team&apos;s Data:', error);
    return <p>Failed to load the Digital Innovation Team&apos;s Data.</p>;
  }

  return (
    <div className="bg-white py-3">
      <div className="mt-10">
        <h1 className="text-[#292F6C] text-center font-tahoma lg:text-[55px] md:text-[60px] sm:text-[40px] text-[40px] font-bold px-24 sm:px-0 pb-10 sm:pb-0">
          Meet the <span className="font-normal">Veteran</span>PCS team
        </h1>
      </div>
      <div className="bg-[#EEEEEE] pt-7 pb-14 px-9 sm:px-0">
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px] tahoma">
              DIGITAL INNOVATION AND TECH
            </h6>
            <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Immersive creative experiences, sophisticated marketing and
              innovative technology for our customers safety and substantial
              user experience.
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
                    className="w-full sm:h-[350px] h-auto"
                  />
                </div>
                <div className="px-5 py-5">
                  <h6 className="text-black tahoma font-semibold text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-lg font-light">
                    {details.designation}
                  </span>
                  <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                    I am a lifelong learner, passionate about my family and
                    friends, the outdoors,
                  </p>
                  <Link
                    href="#"
                    className="text-[#292F6C] text-lg font-bold tahoma mt-4"
                  >
                    Read More
                  </Link>
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
