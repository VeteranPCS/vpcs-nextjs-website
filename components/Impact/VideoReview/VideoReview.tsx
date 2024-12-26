"use client"
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import commonService from "@/services/commonServices";

export interface VideoReviewProps {
  _id: string;
  title?: string;
  videoUrl?: string;
}

const VideoReview = () => {
  const [videoDetails, setVideoDetails] = useState<VideoReviewProps | null>(null);
  
  const fetchVideoDetails = useCallback(async () => {
    try {
      const response = await commonService.fetchVideoReview();
      // if (!response.ok) throw new Error("Failed to fetch posts");
      // const data = await response.json();
      setVideoDetails(response);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, [])

  useEffect(() => {
    fetchVideoDetails()
  }, [fetchVideoDetails])

  return (
    <div className="container mx-auto bg-[#ffffff] shadow-lg sm:my-10 my-0 p-5">
      <div>
        <div className=" relative w-full">
          {/* <Image
            width={1000}
            height={1000}
            src="/icon/VideoReviewPlay.svg"
            alt="hand"
            className="w-[80px] h-[80px] cursor-pointer absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2"
          /> */}
          <iframe
            loading="lazy" // Native lazy loading
            title={videoDetails?.title || "VeteranPCS Customer Review"} 
            src={videoDetails?.videoUrl || "https://www.youtube.com/embed/QNY6vzSO9p4?autoplay=1&mute=1&modestbranding=1&rel=0"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-[315px] md:h-[560px] border-0" // Responsive sizing
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default VideoReview;
