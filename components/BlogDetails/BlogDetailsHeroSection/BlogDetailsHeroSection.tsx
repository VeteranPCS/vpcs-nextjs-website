import React from "react";
import "@/styles/globals.css";
import classes from "./BlogDetailsHeroSection.module.css";

const BlogDetailsHeroSection = () => {
  return (
    <div className="relative">
      <div className={classes.blogdetailspageherosectioncontainer}>
        <div className="flex flex-col justify-center items-center">
          <div>
            <div className="text-center">
              <h1 className="text-white text-center tahoma lg:text-[36px] md:text-[36px] sm:text-[36px] text-[36px] font-bold mt-8 mb-3">
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
                  By VA Loan Expert <br></br>Jennifer Lawrence
                </h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailsHeroSection;
