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
  alt?: string;
}

interface PageData {
  _id: string;
  image?: ForegroundImage;
  description?: string;
  buttonText?: string;
  name?: string;
  designation?: string;
}

const AdminTeam = () => {
  const [DigitalAdminDetails, setDigitalAdminDetails] = useState<PageData[]>([]);

  const fetchDigitalAdminDetails = useCallback(async () => {
    try {
      const response = await aboutService.fetchMembersDetail('administration')
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setDigitalAdminDetails(data)
    } catch (error) {
      console.error('Error fetching Admin Team Data:', error)
      return (
        <div>
          <p>Failed to load Admin Team&apos;s Data. Please try again later.</p>
        </div>
      );
    }
  }, [])

  useEffect(() => {
    fetchDigitalAdminDetails()
  }, [fetchDigitalAdminDetails])

  return (
    <div>
      <div className="bg-[#FFFFFF] pt-7 pb-14 px-9 sm:px-0">
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px] tahoma">
              ADMINISTRATION
            </h6>
            <p className="text-[#000000] text-center tahoma font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Management of VeteranPCSs resources, people, and time to ensure
              your experience is seamless and an extraordinary move or PCS.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9 mt-10">
            {DigitalAdminDetails.map((details) => (
              <div key={details._id} className="border border-[#EAECF0] bg-white mx-auto mt-5">
                <div>
                <Image
                  src={details?.image?.asset?.image_url || "/assets/adminpasteimage.png"}  
                  alt={details?.image?.alt || "Profile image"} 
                  width={417}
                  height={400}
                  className="w-full sm:h-[350px] h-auto"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeam;
