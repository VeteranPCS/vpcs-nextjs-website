import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Link from "next/link";
import classes from "./internshipapplication.module.css";

const SkillFuturesBuild = () => {
  return (
    <div className="w-full relative">
      <div className={classes.internshipapplicationcontainer}>
        <div className="container mx-auto ">
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="text-center">
              <h1 className="text-white lg:text-[32px] md:text-[32px] sm:text-[32px] text-[32px] font-bold poppins lg:w-[800px] md:w-[800px] sm:w-full w-full mx-auto">
                Apply below to learn how you can kickstart your career in the
                real estate industry!
              </h1>
              <Link href="/kick-start-your-career">
                <Button buttonText="Internship Application" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
