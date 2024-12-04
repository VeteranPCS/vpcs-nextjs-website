"use client";
import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import Head from "next/head";
import "@/styles/globals.css";

const Button = ({ buttonText }) => {
  return (
    <div className="lg:py-8 md:py-8 sm:py-2 py-2">
      <a
        className="items-center bg-[#A81F23] w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[15px] px-[20px] xl:py-5 lg:py-5 sm:py-2 py-3 rounded-[16px] text-center tracking-[1px] hover:tracking-[5px] duration-500 transition-all "
        href="#"
      >
        <span
          className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[12px] text-[12px] font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
        >
          {buttonText}
        </span>
      </a>
    </div>
  );
};

export default Button;
