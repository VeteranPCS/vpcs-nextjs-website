import "@/app/globals.css";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import classes from "./StatePageCTA.module.css";
import Image from "next/image";
import Link from "next/link";

const StatePageCTA = ({ cityName }: { cityName: string }) => {
  return (
    <div className="container mx-auto w-full py-16">
      <div className={classes.statepagectacontainer}>
        <div
          className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div className="flex justify-center">
            <Image
              src="/assets/military-signing.png"
              width={530}
              height={530}
              alt="Description of the image"
              className="lg:w-[530px] lg:h-[530px] md:w-[530px] md:h-[530px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px] object-cover"
            />
          </div>
          <div className="text-left">
            <div className="lg:block md:block sm:hidden hidden ">
              <Image
                width={100}
                height={100}
                className=" w-auto h-auto"
                src="/icon/userplus.svg"
                alt="Description of the image"
              />
            </div>
            <div>
              <h1 className="text-white tahoma lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-center lg:w-[500px]">
                Talk to our Agents in {cityName} Today
              </h1>
              <p className="text-white tahoma lg:text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-normal leading-[25px] mt-4 lg:text-left md:text-left sm:text-center text-center">
                Are you a veteran or military spouse in search of a {cityName}{" "}
                realtor who understands your distinctive requirements?
                VeteranPCS is the answer. We are not serving merely as another
                real estate platform; we represent a community of veterans and
                military spouses committed to supporting one another throughout
                transitional periods. Connect with a military-friendly real
                estate agent in {cityName} today and initiate your PCS move with
                confidence.
              </p>
            </div>

            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center gap-4">
              <Link href="/contact-agent">
                <Button buttonText="Agent" />
              </Link>
              <Link href="/contact-lender">
                <button
                  className="items-center border-2 border-[#A3161B] bg-white w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[20px]
               px-[20px] md:py-[14px] py-[12px] rounded-[16px] text-center tracking-[1px] text-[#A3161B] hover:bg-[#A3161B] hover:text-[#ffffff] all-duration transition-all duration-300 ease-in-out"
                >
                  <span className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal leading-6 bg-cover text-nowrap tahoma">
                    Lender
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageCTA;
