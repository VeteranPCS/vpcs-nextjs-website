import React from "react";
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
      const text = item.children[0]?.text;
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
        <div className="container mx-auto pt-20 md:pb-10 pb-5">
          <div className="mx-auto text-center w-full order-2 md:order-1 px-6 sm:px-0">
            <p className="text-[#292F6C] font-bold lg:text-[59px] md:text-[29px] text-[32px] poppins leading-[1.3]">
              Check out our success stories
            </p>
            <h1 className="md:text-[18px] text-[16px] font-normal text-[#7E1618] poppins lg:mb-10 mb:mb-10 mb-2">
              Military community helping military community move.
            </h1>
          </div>
          <div className="sm:mt-32 mt-5">
            {successStories.map((story, index) => (
              index % 2 === 0 ? (
                <div key={story._id} className="md:bg-[#FFFFFF] bg-[#EDEDED] p-5 xl:p-0 grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4 md:mb-5">
                  <div className="md:order-1 order-2">
                    <iframe
                      loading="lazy"
                      title={story?.title}
                      src={story?.videoUrl}
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                      className="w-full lg:h-[280px] xl:h-[360px] h-[280px] md:h-[431px] sm:h-[360px] object-cover"
                    ></iframe>
                  </div>
                  <div className="lg:ml-10 ml-0 md:order-0 order-1">
                    <h1 className="text-[#003486] poppins md:text-[41px] text-[27px] font-bold md:leading-[45px] leading-[40px]">
                      {story?.title}<br></br>
                    </h1>
                    <div className="mt-8">
                      {generateHTML(story?.description)}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={story._id} className="bg-[#EDEDED] grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4 md:mb-5 p-5">
                  <div className="ml-0">
                    <h1 className="text-[#003486] poppins md:text-[41px] text-[27px] font-bold md:leading-[45px] leading-[40px]">
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
                      className="w-full lg:h-[280px] xl:h-[360px] h-[280px] md:h-[431px] sm:h-[360px] object-cover"
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
