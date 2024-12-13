"use client";
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import classes from "./SkillsFuturesBuild.module.css";
import { useRouter } from "next/navigation";

const SkillFuturesBuild = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/internship"); // Navigate to the "stories" page
  };
  return (
    <div className="w-full relative mb-8 sm:mb-0">
      <div className={classes.SkillsFuturesBuildContainer}>
        <div className="container mx-auto">
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="text-center">
              <h1 className="text-white lg:text-[48px] text-[40px] font-bold poppins px-10 sm:px-0">
                Skills to share. Futures to build
              </h1>
              <p className="font-medium text-[18px] leading-[30px] text-white roboto lg:w-full w-[300px] mx-auto">
                Interested in Starting a Career as a Real Estate Agent or
                Mortgage Loan Officer?
              </p>
              <Button
                buttonText="Learn about our internship"
                onClick={handleButtonClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
