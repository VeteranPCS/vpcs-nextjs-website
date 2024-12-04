"use client";
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import styled from "styled-components";
import Button from "@/components/common/Button";

const Wrapper = styled.section``;

const FamilyVideo = () => {
  return (
    <div className="w-full relative">
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
        <div className="container mx-auto ">
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="text-center">
              <h1 className="text-white text-[72px] font-bold leading-[72px] tahoma">
                $247,500
              </h1>
              <p className="font-normal text-[27px] leading-[30px] text-white mt-5 tahoma">
                in bonus checks sent to military families!{" "}
              </p>
              <Button buttonText="How it Works" />
            </div>
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default FamilyVideo;
