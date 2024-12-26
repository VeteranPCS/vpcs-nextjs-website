import "@/styles/globals.css";
import Image from "next/image";
import militarySpouseService from "@/services/militarySpouseService";
import { EmploymentDataProps } from '@/services/militarySpouseService';
import Link from "next/link";

const MilitarySpouseEmployment = async () => {
  let employmentData: EmploymentDataProps[] = [];

  try {
    employmentData = await militarySpouseService.fetchMilitarySpouseEmployment();
  } catch (error) {
    console.error("Error fetching Military Spouse Employment", error);
  }

  if (!employmentData) {
    return <p>Failed to load Military Spouse Employment.</p>;
  }

  return (
    <div className="w-full py-10 lg:px-0 px-5 bg-[#E8E8E8]">
      <div className="container mx-auto">
        <div>
          <h1 className="text-[#292F6C] text-center tahoma lg:text-[43px] md:text-[30px] sm:text-[30px] text-[30px] leading-[32px] md:leading-normal mb-10 md:mb-0 font-bold">
            Military Spouse Employment
          </h1>
        </div>
        <div
          className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          {employmentData.map((item) => (
            <div key={item._id}>
              <Link href={item?.url} className="md:h-[115px] h-auto">
                <Image
                  src={item?.logo?.asset?.image_url || "/assets/empoweremploy.png"}
                  width={1000}
                  height={1000}
                  alt={item?.logo?.alt || "Description of the image"}
                  className="w-[300px] h-auto object-cover"
                />
              </Link>
              <div>
                <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                  {item?.description}
                </p>
              </div>
            </div>
          ))}
          {/* <div>
            <div className="md:h-[115px] h-auto">
              <Image
                src="/assets/instant-teams.png"
                width={1000}
                height={1000}
                alt="Description of the image"
                className="w-[300px] h-auto  object-cover"
              />
            </div>
            <div>
              <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                We use innovative technology and a focus on skills-based hiring
                to create dynamic talent and outsourcing solutions for employers
                and remote careers for military spouses.
              </p>
            </div>
          </div>
          <div>
            <div className="md:h-[115px] h-auto">
              <Image
                src="/assets/squaredaway.png"
                width={1000}
                height={1000}
                alt="Description of the image"
                className="w-[300px] h-auto  object-cover"
              />
            </div>
            <div>
              <p className="text-[#000000] roboto lg:text-lg md:text-lg sm:text-sm text-sm font-light md:pt-5 pt-4 mb-5 md:mb-0">
                At Squared Away, we understand the unique challenges of frequent
                relocations, especially when it comes to ensuring your spouse
                can find fulfilling employment.
              </p>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default MilitarySpouseEmployment;
