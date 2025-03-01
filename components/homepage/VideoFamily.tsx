"use client";
import React from "react";
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";
import { useRouter } from "next/navigation";

const Wrapper = styled.section``;

const FamilyVideo = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/how-it-works"); // Navigate to the "stories" page
  };
  return (
    <div className="w-full relative overflow-hidden">
      <div>
        <video
          loop
          autoPlay
          playsInline
          muted
          preload="auto"
          src="/assets/military-families.mp4"
          className="w-full"
        >
          <source type="video/mp4" src="/assets/military-families.mp4 " />
          <source type="video/webm" src="/assets/military-families.mp4" />
        </video>
      </div>
      <Wrapper>
        <div className="container mx-auto overflow-hidden">
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="text-center">
              <h1 className="text-white lg:text-[72px] md:text-[62px] sm:text-[36px] text-[36px] font-bold tahoma">
                $317,000
              </h1>
              <p className="font-normal lg:text-[27px] md:text-[27px] sm:text-[17px] text-[17px] leading-[30px] text-white lg:mt-5 tahoma">
                in bonus checks sent to military families!{" "}
              </p>
              <Button buttonText="How it Works" onClick={handleButtonClick} />
            </div>
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default FamilyVideo;
