import React from "react"; // No need for useState or useEffect
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const WhyVeteranPcs = () => {
  return (
    <div className="w-full py-10 px-5">
      <div>
        <div className="container mx-auto w-full">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-10">
              <div className="sm:text-left text-left md:order-0 sm:order-1 order-1">
                <h3 className="text-[#002258] tahoma lg:text-[42px] md:text-[42px] sm:text-[31px] text-[31px] font-bold ">
                  Employment
                </h3>
                <p className="text-[#161C2D] tahoma lg:text-[20px] md:text-[20px] sm:text-[12px] text-[12px] font-normal mt-5 mb-5">
                  Transitioning Military{" "}
                </p>
                <div>
                  <Button buttonText="Veteran Employment Articles" />
                </div>
              </div>
              <div className="md:order-1 sm:order-0 order-0 md:text-left text-left">
                <div className="flex gap-4 items-center">
                  <Image
                    width={465}
                    height={465}
                    className="w-full h-full"
                    src="/assets/military-image-2.png"
                    alt="Move in bonus"
                  />
                </div>
              </div>
              <div className="md:order-0 sm:order-1 order-1">
                <div>
                  <Link href="https://www.hiringourheroes.org/">
                    <Image
                      width={250}
                      height={75}
                      className="w-[250px] h-[75px]"
                      src="/assets/hiring-our-heros.png"
                      alt="Move in bonus"
                    />
                  </Link>
                  <div>
                    <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                      Hiring Our Heroes (HOH) connects the military
                      community—service members, military spouses, and veterans
                      —with American businesses to create economic opportunity
                      and a strong and diversified workforce.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="https://www.hireheroesusa.org/">
                    <Image
                      width={250}
                      height={75}
                      className="w-[250px] h-[75px]"
                      src="/assets/hiring-our-heros2.png"
                      alt="Move in bonus"
                    />
                  </Link>
                  <div>
                    <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1">
                      Hire Heroes USA provides free job search assistance to
                      U.S. military members, veterans and their spouses, and we
                      help companies connect with opportunities to hire them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyVeteranPcs;
