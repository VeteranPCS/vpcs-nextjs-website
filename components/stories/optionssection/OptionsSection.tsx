"use client"
import React from "react";
import "@/styles/globals.css";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import impactService from "@/services/impactService";
import SupportContent from "@/components/homepage/FamilySupport/SupportContent";

type BlockStyle = "h1" | "h2" | "h3" | "normal";

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

interface PageData {
  _id: string;
  image?: ForegroundImage;
  title?: string;
  Description?: Description[];
  button_text?: string;
}

const HeroSec = () => {
  const [additionalStories, setAdditionalStories] = useState<PageData[]>([]);

  const fetchAdditionalStories = useCallback(async () => {
    try {
      const response = await impactService.fetchAdditionalStories();
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setAdditionalStories(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, []);

  useEffect(() => {
    fetchAdditionalStories();
  }, [fetchAdditionalStories]);

  const validateBlockStyle = (style: string): BlockStyle => {
    const validStyles: BlockStyle[] = ["h1", "h2", "h3", "normal"];
    return validStyles.includes(style as BlockStyle)
      ? (style as BlockStyle)
      : "normal";
  };

  const shouldRenderBlock = (block: any) => {
    if (!block?.children?.length) return false;
    
    const lastChild = block.children[block.children.length - 1];
    
    if (
      lastChild?._type === 'span' && 
      lastChild?.text === '\n' &&
      !lastChild?.marks?.length
    ) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="relative py-12 sm:px-5 px-10">
      <div>
        <div className="container mx-auto">
          <div>
            <div className="grid lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-16 mb-5">
              <div>
                <Image
                  width={1000}
                  height={1000}
                  src="/assets/optionimage1.png"
                  alt="Tyler Success Story"
                  className="w-full sm:h-[233px] h-auto object-cover"
                />
                <div className="mt-4">
                  <h1 className="text-[#003486] poppins lg:text-[31px] md:text-[31px] sm:text-[25px] text-[25px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                    Honor Flight
                  </h1>
                  <h6 className="text-[#000000] text-[18px] font-medium mt-5 p-0">
                    Civilians can use VeteranPCS. They get to choose a military
                    affliated charity to donate their
                  </h6>
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
              <div>
                <Image
                  width={1000}
                  height={1000}
                  src="/assets/optionimage2.png"
                  alt="Tyler Success Story"
                  className="w-full h-[233px] object-cover"
                />
                <div className="mt-4">
                  <h1 className="text-[#003486] poppins lg:text-[31px] md:text-[31px] sm:text-[25px] text-[25px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                    Buying & Selling?
                  </h1>
                  <h6 className="text-[#000000] text-[18px] font-medium mt-5 p-0">
                    This Veteran family was selling a home and buying a home at
                    the same time.  They received
                  </h6>
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
              <div>
                <Image
                  width={1000}
                  height={1000}
                  src="/assets/optionimage3.png"
                  alt="Tyler Success Story"
                  className="w-full h-[233px] object-cover"
                />
                <div className="mt-4">
                  <h1 className="text-[#003486] poppins lg:text-[31px] md:text-[31px] sm:text-[25px] text-[25px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                    Flying Solo?
                  </h1>
                  <h6 className="text-[#000000] text-[18px] font-medium mt-5 p-0">
                    Is your Veteran deployed or away at training? We get it and
                    understand exactly how to
                  </h6>
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
              <div>
                <Image
                  width={1000}
                  height={1000}
                  src="/assets/optionimage4.png"
                  alt="Tyler Success Story"
                  className="w-full h-[233px] object-cover"
                />
                <div className="mt-4">
                  <h1 className="text-[#003486] poppins lg:text-[31px] md:text-[31px] sm:text-[25px] text-[25px] font-bold lg:leading-[45px] md:leading-[45px] sm:leading-[40px] leading-[40px]">
                    Testimonial
                  </h1>
                  <h6 className="text-[#000000] text-[18px] font-medium mt-5 p-0">
                    “I had an incredible experience working personally with
                    Jason as I prepared my PCS to California. Since Jason is a
                  </h6>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSec;