"use client";
import Image from "next/image";
import React from "react";

const VideoReview = () => {
  return (
    <div className="container mx-auto bg-[#ffffff] shadow-lg my-10 p-3">
      <div>
        <div className=" relative w-full">
          <Image
            width={1000}
            height={1000}
            src="./icon/VideoReviewPlay.svg"
            alt="hand"
            className="w-[80px] h-[80px] cursor-pointer absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2"
          />
          <iframe
            loading="lazy" // Native lazy loading
            title="VeteranPCS Customer Review"
            src="https://www.youtube.com/embed/QNY6vzSO9p4?autoplay=1&mute=1&modestbranding=1&rel=0"
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
