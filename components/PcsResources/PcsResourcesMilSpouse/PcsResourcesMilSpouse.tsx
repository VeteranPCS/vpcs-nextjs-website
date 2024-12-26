import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const PcsResourcesMilitarySpouse = () => {
  return (
    <div className="w-full py-10 mb-5 px-5">
      <div>
        <div className="container mx-auto w-full">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-10">
              <div className="sm:order-1 order-3">
                <h3 className="text-[#003486] tahoma lg:text-[42px] md:text-[42px] sm:text-[31px] text-[31px] font-bold ">
                  Military Spouse<br></br> Resources
                </h3>
                <p className="text-[#747D88] tahoma lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-normal mt-5 mb-5">
                  The backbone of our Armed forces. Thank you for supporting our
                  services members. We’re here to support you!  Check out
                  Squared Away and other military spouse resources.
                </p>
                <div>
                  <Button buttonText="Mil Spouse Employment Articles" />
                  <Link href="/militaryspouse">
                      <Button
                        buttonText="More Mil Spouse Resources"
                      />
                  </Link>                
                </div>
              </div>
              <div className="sm:order-2 order-1">
                <div className="flex gap-4 items-center">
                  <Image
                    width={465}
                    height={465}
                    className="w-full h-full"
                    src="/assets/MIlSpacefamily.png"
                    alt="Move in bonus"
                  />
                </div>
              </div>
              <div className="sm:order-3 order-2">
                <div>
                  <Link href="https://www.gosquaredaway.com/">
                    <Image
                      width={250}
                      height={85}
                      className="w-[250px] h-[85px]"
                      src="/assets/milspaceous.png"
                      alt="Move in bonus"
                    />
                  </Link>
                  <div>
                    <p className="text-[#000000] roboto lg:text-[18px] md:text-[18px] sm:text-[13px] text-[13px] font-light mt-1 lg:w-[259px]">
                      We exist to make work better by letting you focus solely
                      on what matters. We are your trusted assistants
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

export default PcsResourcesMilitarySpouse;
