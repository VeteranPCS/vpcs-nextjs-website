import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import classes from "./VeteranPCSWorksComp.module.css";
import Image from "next/image";
import Link from "next/link";

// Define the type for the `veteranpcs` prop
interface VeteranPCSWorksCompProps {
  veteranpcs: {
    img: string;
    title: string;
    subTitle: string;
    link: string;
  };
}

const VeteranPCSWorksComp: React.FC<VeteranPCSWorksCompProps> = ({
  veteranpcs,
}) => {
  const { img, title, subTitle, link } = veteranpcs;
  return (
    <Link className={classes.veteranpcsworkscontainer} href={link}>
      <div className="xl:p-9 lg:p-9 md:p-9 sm:p-2 p-4 lg:w-[300px] lg:h-[340px] sm:w-[250px] w-[250px] md:py-0 sm:py-20 py-10 lg:mb-0 mb-4 flex flex-col justify-center items-center">
        <div className="text-center ">
          <div className="xl:block lg:block md:block items-center justify-center">
            <div className="flex justify-center mx-auto w-[60px] h-[60px]">
              <Image
                width={1000}
                height={1000}
                className="w-full h-full"
                src={img}
                alt=""
              />
            </div>
            <div className="xl:text-center lg:text-center md:text-center">
              <div className="mt-6 mb-3">
                <h4 className="text-[#A81F23] lg:text-[24px] md:text-[19px] sm:text-[16px] text-[18px] font-bold tahoma">
                  {title}
                </h4>
              </div>
              <div>
                <p className="text-[#5A5A5A] lg:text-[18px] md:text-[18px] sm:text-[16px] text-[13px] font-normal tahoma">
                  {subTitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VeteranPCSWorksComp;
