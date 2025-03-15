import "@/app/globals.css";
import Image from "next/image";
import { MovingYourLifeProps } from '@/services/militarySpouseService';
import militarySpouseService from "@/services/militarySpouseService";
import Link from "next/link";

const MovingOurLife = async () => {
  let employmentData: MovingYourLifeProps[] = [];

  try {
    employmentData = await militarySpouseService.fetchMovingYourLife();
  } catch (error) {
    console.error("Error fetching Moving Your Life", error);
  }

  if (!employmentData) {
    return <p>Failed to load Moving Your Life.</p>;
  }
  return (
    <div className="w-full py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <div>
          <h1 className="text-[#292F6C] text-center tahoma lg:text-[43px] md:text-[30px] sm:text-[30px] text-[30px] leading-[32px] md:leading-normal mb-10 md:mb-0 font-bold">
            Moving Your Life
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
        </div>
      </div>
    </div>
  );
};

export default MovingOurLife;
