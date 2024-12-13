"use client"
import React from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import { useState, useEffect, useCallback } from "react";
import internshipPageService from "@/services/internshipPageService";

interface pageData {
  title: string;
  details: string;
  button_text: string;
}

const SkillFuturesBuild = () => {
  const [internshipOffer, setInternshipOffer] = useState<pageData>()

  const fetchActionData = useCallback(async () => {
    try {
      const response = await internshipPageService.fetchInternshipOffer()
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setInternshipOffer(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, [])

  useEffect(() => {
    fetchActionData()
  }, [fetchActionData])

  return (
    <div className="w-full">
      <div className="bg-[#002258] lg:py-12 sm:py-5 py-5 lg:px-0 px-5">
        <div className="container mx-auto ">
          <div className="">
            <div className="text-center">
              <h1 className="text-white lg:text-[32px] md:text-[32px] sm:text-[32px] text-[32px] font-bold poppins lg:w-[800px] md:w-[800px] sm:w-full w-full mx-auto">
                {internshipOffer?.title}
              </h1>
              <p className="text-[#FFFFFF] text-center roboto lg:text-lg md:text-lg sm:text-sm text-sm font-medium lg:w-[900px] md:w-[900px] sm:w-full w-full mx-auto pt-5">
                {/* VeteranPCS has partnered with the CE Shop to offer a 40%
                discount to get your real estate license. Discount is available
                for active duty, veterans, and military spouses. */}
                {internshipOffer?.details}
              </p>
              <Button buttonText={internshipOffer?.button_text || "40% off training"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
