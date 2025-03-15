import "@/app/globals.css";
import classes from "./ContactHeroSection.module.css";
import Image from "next/image";

const HeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.HeroSectionContainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto lg:text-left md:text-left sm:text-left text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <p className="text-white font-normal lg:text-[59px] md:text-[40px] sm:text-[40px] text-[40px] poppins leading-[1.3] tahoma">
                <b>Contact </b> Veteran<b>PCS</b>
              </p>
              <h1 className="lg:text-[18px] md:text-[18px] sm:text-[18px] text-[18px] font-normal text-white poppins mb-10 tahoma">
                Questions or remarks? Send us a message!
              </h1>
              <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center">
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
              <div className="absolute sm:bottom-[-15%] bottom-[-20%] xl:left-[45%] lg:left-[35%] md:left-[35%] sm:left-[26%] left-[26%] translate-[-45%] ">
                <Image
                  width={1000}
                  height={1000}
                  src="/icon/VeteranPCS-logo_wht-outline.svg"
                  alt="Description of the image"
                  className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
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
