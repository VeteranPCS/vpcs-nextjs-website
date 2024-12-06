"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "./AgentLoanExpert.module.css";

const AgentLoanExpert = () => {
  return (
    <div className="container mx-auto w-full mt-12 mb-12">
      <div className={classes.agentLoanExpertContainer}>
        <div className="items-center grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 mt-10 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 ">
          <div className="lg:text-left sm:text-center text-center py-10">
            <h4 className="text-white poppins text-3xl font-bold ">
              Are you an agent or VA loan<br></br> expert?
            </h4>
            <p className="roboto text-xl italic font-medium text-white m-0 pt-5">
              Want to be featured?
            </p>
            <Button buttonText="Sign-up here" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLoanExpert;
