import React from "react";
import "@/styles/globals.css";
import classes from "./BlogPageHeroSection.module.css";
import Image from "next/image";

const BlogPageHeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.blogpageherosectioncontainer}>
        <div className="flex flex-col justify-center items-center">
          <div>
            <div className="text-center">
              <span className="rounded-lg bg-white/15 py-1 px-3 text-white text-center roboto text-xsfont-bold mx-auto">
                PCS HELP
              </span>
              <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[31px] text-[31px] font-bold mt-8 mb-3 leading-normal">
                What you need to know
              </h1>
              <div className="flex items-center">
                <p className="text-white lora text-sm font-normal">
                  04.23.2024
                </p>
                <p className="bg-white w-[50px] p-[1px] mx-5"></p>
                <p className="text-white tahoma text-sm font-normal">
                  Navigating temporary housing during your PCS move
                </p>
              </div>
              <div>
                <p className="text-white text-center lora text-sm font-normal lg:w-[510px] w-full mx-auto mt-10 leading-6">
                  Progressively incentivize cooperative systems through
                  technically sound functionalities. The credibly productivate
                  seamless data.
                </p>
              </div>
              <div>
                <h6 className="text-white tahoma text-sm font-bold mt-10">
                  By Jennifer Lawrence
                </h6>
              </div>
              <div className="flex items-center justify-center sm:mt-10 mt-10 md:mt-0 md:hidden sm:ma-auto">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full max-w-md px-4 py-3 border bg-[#F9F9F9] border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 "
                />
                <button className="bg-[#003486] hover:bg-blue-600 text-white px-4 py-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <Image
                    src="/icon/search.svg"
                    width={20}
                    height={20}
                    alt="search"
                    loading="eager"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPageHeroSection;
