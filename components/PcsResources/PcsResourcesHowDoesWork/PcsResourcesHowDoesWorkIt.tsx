import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import classes from "./PcsResourcesHowDoesWorkIt.module.css";
import Link from "next/link";

const PcsResourcesHowDoesWorkIt = () => {
  return (
    <div className={classes.PcsResourcesHowDoesWorkItcontainer}>
      <div className="mx-auto text-center w-full max-w-[700px] px-5 py-10">
        <div>
          <h1 className="text-[#FFFFFF] text-center roboto md:text-[45px] text-[35px] font-bold px-10 sm:px-0">
            How Does The Move-In-Bonus Work?
          </h1>
          <p className="text-[#FFFFFF] text-center roboto md:text-[16px] text-[14px] font-medium my-3">
            The Bonus is available in most states, and only possible when
            working with a real estate agent from VeteranPCS. If the bonus is
            not legally allowed we will contact you to help in other ways.
          </p>
        </div>
        <Link href="/how-it-works" className="flex justify-center">
          <Button buttonText="HOW IT WORKS" />
        </Link>
      </div>
    </div>
  );
};

export default PcsResourcesHowDoesWorkIt;
