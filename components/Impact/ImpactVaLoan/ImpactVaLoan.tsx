"use client";
import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import Head from "next/head";
import Button from "@/components/common/Button";
import classes from "./ImpactVaLoan.module.css";
import Image from "next/image";

const ImpactVaLoan = () => {
  return (
    <div className={classes.ImpactVaLoanContainer}>
      <div className="container mx-auto px-8">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 gap-10 items-center justify-center">
          <div className="lg:pl-10 md:pl-0 sm:pl-0 pl-0">
            <div>
              <h1 className="text-white font-tahoma lg:text-[42px] md:text-[42px] sm:text-[32px] text-[32px] font-bold leading-[50.4px] capitalize">
                VA loan
              </h1>
              <p className="text-white font-montserrat lg:text-[26px] md:text-[26px] sm:text-[20px] text-[20px] font-medium">
                Your service is your <b> downpayment </b>
              </p>
            </div>
            <div className="flex justify-start flex-wrap items-start lg:gap-20 md:gap-5 sm:gap-0 gap-0 mt-10">
              <div className="flex flex-col justify-center">
                <div className="mx-auto">
                  <Image
                    width={50}
                    height={50}
                    src="./icon/yoursymbolmeet.svg"
                    alt="hand"
                    className="w-[50px] h-[50px]"
                  />
                </div>
                <div>
                  <h2 className="text-white font-bold lg:text-[42px] md:text-[32px] sm:text-[32px] text-[32px] tahoma text-center mt-2 mb-2">
                    200
                  </h2>
                  <p className="text-white text-center font-tahoma text-sm font-normal lg:w-[120px]">
                    VA Loans used through VeteranPCS
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="mx-auto">
                  <Image
                    width={1000}
                    height={1000}
                    src="./icon/yoursymbousers.svg"
                    alt="hand"
                    className="w-[50px] h-[50px]"
                  />
                </div>
                <div>
                  <h2 className="text-white font-bold lg:text-[42px] md:text-[32px] sm:text-[32px] text-[32px] tahoma text-center mt-2 mb-2">
                    12
                  </h2>
                  <p className="text-white text-center font-tahoma text-sm font-normal lg:w-[150px]">
                    VA Loan Experts
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="mx-auto">
                  <Image
                    width={1000}
                    height={1000}
                    src="./icon/yourhome.svg"
                    alt="hand"
                    className="w-[50px] h-[50px]"
                  />
                </div>
                <div>
                  <h2 className="text-white font-bold lg:text-[42px] md:text-[32px] sm:text-[32px] text-[32px] tahoma text-center mt-2 mb-2">
                    300
                  </h2>
                  <p className="text-white text-center font-tahoma text-sm font-normal lg:w-[150px]">
                    Veterans & their families buy & sell homes
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <Button buttonText="More info on VA Loan" />
            </div>
          </div>
          <div className="lg:ml-10 md:ml-0 sm:ml-0 ml-0">
            <Image
              width={1000}
              height={1000}
              src="/assets/imageslider3.png"
              alt="hand"
              className="lg:w-[445px] lg:h-[445px] md:w-full md:h-full sm:w-full sm:h-full w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactVaLoan;
