"use client";
import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PcsResourcesMovingYourLife = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/blog"); // Navigate to the "stories" page
  };
  return (
    <div className="py-12 px-5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-16 mt-10 justify-center items-center">
          <div className="flex justify-center">
            <Image
              width={356}
              height={290}
              src="/assets/Vetpvd-blog-posts.png"
              alt="check"
              className="w-[356px] h-[290px]"
            />
          </div>
          <div>
            <h1 className="text-[#292F6C] poppins text-center  lg:text-[35px] md:text-[35px] sm:text-[35px] text-[35px] font-bold uppercase mb-5">
              MOVING OR PCSING IN 2024?
            </h1>
            <div className="flex justify-center">
              <Button buttonText="Articles" onClick={handleButtonClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesMovingYourLife;
