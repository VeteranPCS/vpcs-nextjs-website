import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";

const PcsResourcesTrustedResources = () => {
  return (
    <div className="py-12 px-5">
      <div className="container mx-auto">
        <div>
          <h2 className="text-[#003486] tahoma lg:text-[43px] md:text-[43px] sm:text-[31px] text-[31px] font-bold text-center">
            VeteranPCS Trusted Resources
          </h2>
          <p className="text-[#878787] text-center mx-auto roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-medium  mt-2 italic ">
            Trusted veteran and military spouse owned resources, businesses and
            organizations.
          </p>
        </div>
        <div className="grid lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-2 grid-cols-2 gap-5 lg:mt-10 md:mt-10 sm:mt-5 mt-5">
          <div>
            <Link href="https://spouse-ly.com/">
              <Image
                width={128}
                height={36}
                src="/assets/spouselylogomain.png"
                alt="check"
                className="w-[128px] mt-10 h-[36px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://apps.apple.com/us/app/mil-vets/id1643182823">
              <Image
                width={128}
                height={128}
                src="/assets/MILVETS.png"
                alt="check"
                className="w-[128px] mt-10 h-[128px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://packingprops.com/">
              <Image
                width={128}
                height={36}
                src="/assets/packingpropsprops.png"
                alt="check"
                className="w-[128px] mt-10 h-[36px]"
              />
            </Link>
          </div>
          <div>
            <Image
              width={128}
              height={30}
              src="/assets/militaryonesource.png"
              alt="check"
              className="w-[128px] mt-10 h-[30px]"
            />
          </div>
          <div>
            <Link href="https://epub.stripes.com/?issue=Transition-Guide_180523">
              <Image
                width={128}
                height={16}
                src="/assets/starsandstipes.png"
                alt="check"
                className="w-[128px] mt-10 h-[16px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://porch.com/advice/expert-moving-tips">
              <Image
                width={128}
                height={33}
                src="/assets/porch-logo.png"
                alt="check"
                className="w-[128px] mt-10 h-[33px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://carey.jhu.edu/">
              <Image
                width={128}
                height={31}
                src="/assets/johnshopkins.png"
                alt="check"
                className="w-[128px] mt-10 h-[31px]"
              />
            </Link>
          </div>
          <div>
            <Image
              width={128}
              height={38}
              src="/assets/instant-teams.png"
              alt="check"
              className="w-[128px] mt-10 h-[38px]"
            />
          </div>
          <div>
            <Link href="https://www.wearethemighty.com/feature/veteranpcs/">
              <Image
                width={161}
                height={23}
                src="/assets/WE-AR-ETHE-MIGHTY-FEATURE-LOGO.png"
                alt="check"
                className="w-[161px] mt-10 h-[23px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://www.empoweremploy.us/veteranpcs/">
              <Image
                width={128}
                height={44}
                src="/assets/empoweremploy.png"
                alt="check"
                className="w-[128px] mt-10 h-[44px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://www.gosquaredaway.com/">
              <Image
                width={128}
                height={47}
                src="/assets/squaredaway.png"
                alt="check"
                className="w-[128px] mt-10 h-[47px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://www.hireheroesusa.org/">
              <Image
                width={128}
                height={28}
                src="/assets/hire-heroes-color.png"
                alt="check"
                className="w-[128px] mt-10 h-[28px]"
              />
            </Link>
          </div>
          <div>
            <Link href="https://www.etsy.com/listing/818347878/room-id-moving-system-o-color-coded-room?etsrc=sdt">
              <Image
                width={128}
                height={26}
                src="/assets/BoxOps-Logo.png"
                alt="check"
                className="w-[128px] mt-10 h-[26px]"
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesTrustedResources;
