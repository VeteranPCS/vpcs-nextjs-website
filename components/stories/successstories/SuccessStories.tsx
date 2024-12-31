import React from "react";
import "@/styles/globals.css";
import storiesService from "@/services/storiesService";
import { VideoSuccessStory } from '@/services/storiesService'
import { ChildrenProps } from '@/services/storiesService'

const SuccessStories = async () => {
  let successStories: VideoSuccessStory[] = [];

  try {
    successStories = await storiesService.fetchVideoSuccessStories();
  } catch (error) {
    console.error("Error fetching Video Success Stories", error);
  }

  if (!successStories) {
    return <p>Failed to load the blog.</p>;
  }

  const generateHTML = (description: ChildrenProps[]) => {
    return description.map((item) => {
      const text = item.children[0].text;
      return (
        <h6 key={item._key} className="text-[#000000] text-[18px] font-medium m-0 p-0">
          {text}
        </h6>
      );
    });
  };

  return (
    <div className="relative">
      <div>
        <div className="container mx-auto pt-20 lg:pb-10 md:pb-10 sm:pb-5 pb-5">
          <div className="mx-auto text-center w-full sm:order-2 order-2 lg:order-1 md:order-1 px-6 sm:px-0">
            <p className="text-[#292F6C] font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins leading-[1.3] tahoma">
              Check out our success stories
            </p>
            <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-[#7E1618] poppins lg:mb-10 mb:mb-10 sm:mb-2 mb-2 tahoma">
              Military community helping military community move.
            </h1>
          </div>
          <div className="sm:mt-32 mt-5">
            {successStories.map((story, index) => (
              index % 2 === 0 ? (
                <div key={story._id} className="lg:bg-[#FFFFFF] md:bg-[#FFFFFF] sm:bg-[#EDEDED] bg-[#EDEDED] px-5 py-5 grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4 lg:mb-5 md:mb-5">
                  <div className="lg:order-1 md:oreder-1 sm:order-2 order-2">
                    <iframe
                      loading="lazy"
                      title={story?.title}
                      src={story?.videoUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                      className="w-full h-[500px] object-cover"
                    ></iframe>
                  </div>
                  <div className="lg:ml-10 md:ml-10 sm:ml-0 ml-0 lg:order-0 md:oreder-0 sm:order-1 order-1">
                    <h1 className="text-[#003486] poppins lg:text-[41px] md:text-[41px] sm:text-[27px] text-[27px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                      {story?.title}<br></br>
                    </h1>
                    <div className="mt-8">
                      {generateHTML(story?.description)}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={story._id} className="bg-[#EDEDED] grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4 lg:mb-5 md:mb-5 p-5">
                  <div className="lg:ml-10 md:ml-10 sm:ml-0 ml-0">
                    <h1 className="text-[#003486] poppins lg:text-[41px] md:text-[41px] sm:text-[27px] text-[27px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                      {story?.title}<br></br>
                    </h1>
                    <div className="mt-8">
                      {generateHTML(story?.description)}
                    </div>
                  </div>
                  <div>
                    <iframe
                      loading="lazy"
                      title={story?.title}
                      src={story?.videoUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                      className="w-full h-[500px] object-cover"
                    ></iframe>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessStories;
