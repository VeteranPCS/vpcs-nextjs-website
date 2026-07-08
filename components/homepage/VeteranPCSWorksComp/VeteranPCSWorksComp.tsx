import React from "react"; // No need for useState or useEffect
import classes from "./VeteranPCSWorksComp.module.css";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

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
    <TrackedCtaLink
      className={`${classes.veteranpcsworkscontainer} flex w-full sm:w-[300px]`}
      href={link}
      cta={{
        ctaId: 'homepage_how_it_works_card',
        ctaIntent: 'content_navigation',
        ctaPosition: 'homepage_veteranpcs_works',
        ctaComponent: 'veteranpcs_works_card',
        ctaLabel: title,
        destination: link,
        pageType: 'homepage',
      }}
    >
      <div className="flex flex-col justify-center items-center text-center w-full p-6 md:p-8">
        <div className="flex items-center justify-center h-[60px]">
          <Image
            width={60}
            height={60}
            className="h-14 w-auto object-contain"
            src={img}
            alt=""
          />
        </div>
        <h4 className="text-[#A81F23] lg:text-2xl md:text-xl text-lg font-bold mt-5 mb-2">
          {title}
        </h4>
        <p className="text-[#5A5A5A] lg:text-base md:text-base text-sm font-normal">
          {subTitle}
        </p>
      </div>
    </TrackedCtaLink>
  );
};

export default VeteranPCSWorksComp;
