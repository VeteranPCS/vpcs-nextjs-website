"use client";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import React, { useState } from "react";
import SliderValueLabel from "@/components/MilitarySpouse/SquaredAway/SquaredAwaySlider";

const SquaredAway = () => {
  return (
    <div className="container mx-auto w-full py-16">
      <div>
        <div
          className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
         grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
        >
          <div>
            <Image
              src="/assets/spouseaway.png"
              width={1000}
              height={869}
              alt="Description of the image"
              className="lg:w-full lg:h-[869px] md:w-full md:h-[530px] sm:w-full sm:h-[326px] w-full h-[326px]"
            />
          </div>
          <div>
            <div>
              <h2 className="text-[#292F6C] tahoma lg:text-[63px] md:text-[53px] sm:text-[43px] text-[43px] font-bold mb-3">
                Spouse Employment with Squared Away
              </h2>
            </div>
            <div>
              <ul>
                <li className="text-[#58595D] roboto lg:text-[20px] md:text-[18px] sm:text-[16px] text-[14px] font-medium list-disc mb-2">
                  Remote Work Opportunities: Our positions are entirely remote,
                  enabling your spouse to work from anywhere, providing
                  stability amidst the frequent moves.
                </li>
                <li className="text-[#58595D] roboto lg:text-[20px] md:text-[18px] sm:text-[16px] text-[14px] font-medium list-disc mb-2">
                  Career Growth: We offer roles that not only provide immediate
                  employment but also opportunities for professional development
                  and advancement within our company.
                </li>
                <li className="text-[#58595D] roboto lg:text-[20px] md:text-[18px] sm:text-[16px] text-[14px] font-medium list-disc mb-2">
                  Community and Support: Join a team of military spouses who
                  understand the lifestyle and are dedicated to supporting each
                  other’s success.
                </li>
                <li className="text-[#58595D] roboto lg:text-[20px] md:text-[18px] sm:text-[16px] text-[14px] font-medium list-disc mb-2">
                  Work-Life Balance: Our flexible work schedules ensure your
                  spouse can balance work commitments with family life,
                  deployments, and PCS moves.
                </li>
              </ul>
            </div>
            <div>
              <Button buttonText="Squared Away" />
            </div>
            <div className="container mx-auto w-full mt-5">
              <SliderValueLabel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SquaredAway;
