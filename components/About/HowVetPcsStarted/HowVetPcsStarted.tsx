"use client";
import React, { useState, useEffect } from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";

const HowVetPcsStarted = () => {
  return (
    <div className="bg-[#EEEEEE] pt-14">
      <div>
        <div className="container mx-auto">
          <div className="lg:w-[700px] mx-auto">
            <div>
              <Image
                width={700}
                height={523}
                src="/assets/Aboutflight.png"
                alt="hand"
                className="w-[700px] h-[523px]"
              />
            </div>
            <div className="lg:mt-16 lg:mb-7">
              <h2 className="text-[#292F6C] text-center font-tahoma text-2xl font-bold">
                How <span className="font-normal">Veteran</span>PCS Got Started
              </h2>
            </div>
            <div>
              <p className="text-black tahoma text-lg font-normal mb-4">
                My name is Jason Anderson, founder and creator of VeteranPCS. I
                spent 7 years in the Army as an AH-64D Apache Helicopter Pilot.
                I moved 9 times in 7 years and after transitioning out I entered
                into a new career as a real estate agent.
              </p>
              <p className="text-black tahoma text-lg font-normal mb-4">
                I quickly realized real estate can be an expensive industry to
                get into. Many sites cost hundreds, thousands, or even tens of
                thousands of dollars per month to help grow your business. And
                with less reviews to show than others, it can be impossible to
                be found online, despite being a great agent.
              </p>
              <p className="text-black tahoma text-lg font-normal mb-4">
                When you get orders in the military, it can be hard to find an
                agent you can trust. There are designations like “military
                relocation professional,” but nothing compares to working with a
                recommended agent who has personally PCS’d.
              </p>
              <p className="text-black tahoma text-lg font-normal mb-4">
                VeteranPCS was created to be different. A site dedicated to
                equally serving the agents as much as the military families
                going through a PCS. A site that is open to anyone to use but
                features only veterans and military spouses now working as
                agents. No need to sift through reviews or stars, every agent on
                here has been recommended by military families that bought or
                sold a house through them.
              </p>
              <p className="text-black tahoma text-lg font-normal mb-4">
                VeteranPCS charges no annual or monthly fees. We simply collect
                a small percentage of the commission and then give back to both
                the military family as well as non-profits and charities.
              </p>
            </div>
            <div className="flex justify-center">
              <Button buttonText="How it works" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowVetPcsStarted;
