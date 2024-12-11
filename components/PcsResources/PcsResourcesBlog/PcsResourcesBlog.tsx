import "@/styles/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesBlog.module.css";

const PcsResourcesBlog = () => {
  return (
    <div className="pt-6 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-5 items-end lg:justify-between md:justify-between sm:justify-center justify-center">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <h1 className="text-[#292F6C] lg:text-[42px] md:text-[42px] sm:text-[30px] text-[30px] font-bold tahoma lg:text-left md:text-left sm:text-center text-center">
              Let’s talk VA loan
            </h1>
            <p className="text-[#1F1D55] lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-normal tahoma lg:text-left md:text-left sm:text-center text-center">
              Our experts breakdown buying with a VA loan
            </p>
          </div>
          <div>
            <Link
              href="#"
              className="text-[#292F6C] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-bold roboto"
            >
              Learn more about the VA loan
            </Link>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-6 mt-10">
          <div className={classes.blogimageone}>
            <div className="rounded-lg bg-white/15 absolute top-4 right-4 px-4 py-2 text-white roboto text-xs font-bold">
              FASHION
            </div>
            <div className="absolute bottom-4 left-2 px-6 py-1">
              <p className="text-[#E5E5E5] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal leading-normal">
                08.08.2021
              </p>
              <h3 className="text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-bold my-3">
                Richird Norton photorealistic rendering as real photos
              </h3>
              <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px]">
                Progressively incentivize cooperative systems through
                technically sound functionalities. The credibly productivate
                seamless data.
              </p>
            </div>
          </div>
          <div className={classes.blogimagetwo}>
            <div className="rounded-lg bg-white/15 absolute top-4 right-4 px-4 py-2 text-white roboto text-xs font-bold">
              FASHION
            </div>
            <div className="absolute bottom-4 left-2 px-6 py-1">
              <p className="text-[#E5E5E5] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal leading-normal">
                08.08.2021
              </p>
              <h3 className="text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-bold my-3">
                Richird Norton photorealistic rendering as real photos
              </h3>
              <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px]">
                Progressively incentivize cooperative systems through
                technically sound functionalities. The credibly productivate
                seamless data.
              </p>
            </div>
          </div>
          <div className={classes.blogimageThree}>
            <div className="rounded-lg bg-white/15 absolute top-4 right-4 px-4 py-2 text-white roboto text-xs font-bold">
              FASHION
            </div>
            <div className="absolute bottom-4 left-2 px-6 py-1">
              <p className="text-[#E5E5E5] lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal leading-normal">
                08.08.2021
              </p>
              <h3 className="text-white tahoma lg:text-[21px] md:text-[21px] sm:text-[15px] text-[15px] font-bold my-3">
                Richird Norton photorealistic rendering as real photos
              </h3>
              <p className="text-[#E5E5E5] roboto lg:text-[14px] md:text-[14px] sm:text-[12px] text-[12px] font-normal lg:w-[370px]">
                Progressively incentivize cooperative systems through
                technically sound functionalities. The credibly productivate
                seamless data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesBlog;
