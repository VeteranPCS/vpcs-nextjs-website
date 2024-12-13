"use client";
import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./PcsResourcesHowDoesWorkIt.module.css";
import { useRouter } from "next/navigation";

const PcsResourcesHowDoesWorkIt = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/how-it-works"); // Navigate to the "stories" page
  };
  return (
    <div className={classes.PcsResourcesHowDoesWorkItcontainer}>
      <div className="mx-auto text-center lg:w-[700px] md:w-[500px] sm:w-[400px] w-[400px] py-10">
        <div>
          <h1 className="text-[#FFFFFF] text-center roboto lg:text-[45px] md:text-[45px] sm:text-[35px] text-[35px] font-bold px-10 sm:px-0">
            How Does The Move-In-Bonus Work?
          </h1>
          <p className="text-[#FFFFFF] text-center roboto lg:text-[16px] md:text-[16px] sm:text-[12px] text-[12px] font-medium my-3">
            The Bonus is available in most states, and only possible when
            working with a real estate agent from VeteranPCS. If the bonus is
            not legally allowed we will contact you to help in other ways.
          </p>
        </div>
        <div className="flex justify-center">
          <Button buttonText="HOW IT WORKS" onClick={handleButtonClick} />
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesHowDoesWorkIt;
