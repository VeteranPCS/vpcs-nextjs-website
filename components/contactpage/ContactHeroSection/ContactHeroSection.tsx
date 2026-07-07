import "@/app/globals.css";
import classes from "./ContactHeroSection.module.css";
import Image from "next/image";

const HeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.HeroSectionContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto text-left w-full order-2 md:order-none">
              <p className="text-white font-normal lg:text-[59px] text-[40px] poppins leading-[1.3] tahoma">
                <b>Contact </b> Veteran<b>PCS</b>
              </p>
              <h1 className="text-[18px] font-normal text-white poppins mb-10 tahoma">
                Questions or remarks? Send us a message!
              </h1>
              <div className="flex justify-between md:justify-start gap-4 mb-10 mt-10 mx-auto text-center">
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Free To Use
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/checkred.svg"
                    alt="check"
                    className="w-6 h-6"
                  />
                  <p className="text-white font-medium text-sm tahoma">
                    Get Cash Back
                  </p>
                </div>
              </div>
              <div className="absolute sm:bottom-[-15%] bottom-[-20%] xl:left-[45%] md:left-[35%] left-[26%] pointer-events-none">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt=""
                  className="sm:w-[250px] w-[200px] h-auto"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
