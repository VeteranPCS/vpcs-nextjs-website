"use client"
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import aboutService from "@/services/aboutService";

interface ImageAsset {
  image_url?: string;
}

interface ForegroundImage {
  asset?: ImageAsset;
}

interface PageData {
  _id: string;
  image?: ForegroundImage;
  header?: string;
  description?: string;
  buttonText?: string;
  name?: string;
  designation?: string;
}

const CeoFounder = () => {
  const [CEODetails, setCEODetails] = useState<PageData[]>([]);

  const fetchCeoDetails = useCallback(async () => {
    try {
      const response = await aboutService.fetchMembersDetail('founder')
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setCEODetails(data)
    } catch (error) {
      console.error('Error fetching CEO Founder Data:', error)
      return (
        <div>
          <p>Failed to load CEO Founder Data. Please try again later.</p>
        </div>
      );
    }
  }, [])

  useEffect(() => {
    fetchCeoDetails()
  }, [fetchCeoDetails])

  return (
    <div className="pt-14">
      <div>
        <div className="container mx-auto">
          <div className=" mx-auto">
            <div>
              <span className="text-[#282828] flex justify-center tahoma text-[21px] font-bold">
                CEO & FOUNDER
              </span>
            </div>
            <div>
              <h1 className="text-[#292F6C] font-bold text-center tahoma lg:text-[55px] md:text-[60px] sm:text-[40px] text-[40px] ">
                Meet Our Founder
              </h1>
            </div>
            <div>
              <p className="text-[#161C2Db3] text-center font-normal sm:text-[24px] text-[14px] lg:w-[1000px] leading-[22px] mx-auto px-9 sm:px-0">
                VeteranPCS was created to be different. A site dedicated to
                equally serving the agents as much as the military families
                going through a PCS or move.
              </p>
            </div>
            
              {CEODetails.map((details) => (
                <div key={details._id} className="border border-[#EAECF0] bg-white sm:w-[417px] w-[330px] mx-auto mt-5">
                  <div>
                    <Image
                      src={details?.image?.asset?.image_url || "/assets/CeoPasteimage.png" }
                      alt="Jason"
                      width={417}
                      height={400}
                    />
                  </div>
                  <div className="px-5 py-5">
                    <h6 className="text-black tahoma font-semibold text-2xl">
                      {details.name}
                    </h6>
                    <span className="text-[#3E3E59] text-lg font-light">
                      {details.designation}
                    </span>
                    <p className="text-[#5F6980] text-lg font-light mt-3 mb-3">
                      I am a lifelong learner, passionate about my family and
                      friends, the outdoors,
                    </p>
                    <Link
                      href="#"
                      className="text-[#292F6C] text-lg font-bold tahoma mt-4"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              ))}
            {/* </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeoFounder;
