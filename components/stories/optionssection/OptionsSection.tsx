// "use client"
import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";
// import { useState, useEffect, useCallback } from "react";
import impactService from "@/services/impactService";
// import SupportContent from "@/components/homepage/FamilySupport/SupportContent";

interface ForegroundImage {
  asset?: ImageAsset;
  alt?: string;
}

interface Description {
  _id?: string;
  _key?: string;
  style?: string;
  children?: Child[];
}

interface Child {
  _key: string;
  marks: string[];
  text: string;
}

interface ImageAsset {
  image_url?: string;
}

export interface additionalStoriesProps {
  _id: string;
  image?: ForegroundImage;
  title?: string;
  Description?: Description[];
  button_text?: string;
}

const HeroSec = async () => {
  let pageData: additionalStoriesProps[] | null = null;

  try {
    pageData = await impactService.fetchAdditionalStories();
  } catch (error) {
    console.error('Failed to fetch Additional Impact Stories:', error);
    return <p>Failed to load Additional Impact Stories.</p>;
  }

  const renderDescription = (description: Description[]) => {
    return description.map((desc, index) => (
      <div key={desc._key || index}>
        {desc.children?.map((child, childIndex) => {
          // Check for "marks" to apply styles (if any)
          const textContent = child.text;
          const hasMarks = child.marks && child.marks.length > 0;

          return (
            <p
              key={child._key || childIndex}
              className={hasMarks ? 'marked-text-class' : ''} // You can add classes based on marks
            >
              {textContent}
            </p>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="relative py-12 sm:px-5 px-10">
      <div>
        <div className="container mx-auto">
          <div>
            <div className="grid lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-16 mb-5">
              {pageData?.map((story) => (
                <div key={story._id}>
                  <Image
                    width={1000}
                    height={1000}
                    src={story?.image?.asset?.image_url || "/assets/optionimage1.png"}
                    alt={story?.image?.alt || "Tyler Success Story"}
                    className="w-full sm:h-[233px] h-auto object-cover"
                  />
                  <div className="mt-4">
                    <h1 className="text-[#003486] poppins lg:text-[31px] md:text-[31px] sm:text-[25px] text-[25px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                      {story?.title}
                    </h1>
                    <div className="text-[#000000] text-[18px] font-medium mt-5 p-0">
                      {story?.Description && renderDescription(story?.Description)}
                    </div>
                    <div className="mt-5">
                      <Link
                        href="#"
                        className="text-[#292F6C] text-[21px] font-medium border-b border-[#292F6C]"
                      >
                        Read More
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;