"use client";
import GetListedLenders from "@/components/GetListedLenders/GetListedLendersContactDiane";
import GetListedLendersProfileInfo from "@/components/GetListedLenders/GetListedLendersProfileInfo";
import GetListedLendersProfileInfoWantShareMore from "@/components/GetListedLenders/GetListedLendersProfileInfoWantShareMore";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="container mx-auto w-full">
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5">
          <div>
            <Image
              src="/assets/Logo.png"
              className="w-[238px] h-[62px]"
              alt="contact us"
              width={400}
              height={400}
            />
          </div>
          <div>
              <button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                >
                  <path
                    d="M38 12.82L35.18 10L24 21.18L12.82 10L10 12.82L21.18 24L10 35.18L12.82 38L24 26.82L35.18 38L38 35.18L26.82 24L38 12.82Z"
                    fill="#E2E4E6"
                  />
                </svg>
              </button>
          </div>
        </div>
        
        <div className="md:w-[456px] w-auto md:mx-auto md:-mt-6 mt-10 mx-5">
          <div className="flex md:justify-start justify-center">
            <div className="flex items-center gap-4">
              <span className="border rounded-full w-5 h-5 p-[1px] bg-[#000080]"></span>
              <span className="border w-10 p-[1px] bg-[#000080]"></span>
              <span className="border rounded-full w-5 h-5 p-[1px] bg-[#000080]"></span>
              <span className="border w-10 p-[1px] bg-[#B9B9C3]"></span>
              <span className="border border-[#B9B9C3] rounded-full w-5 h-5 p-[1px] bg-[#FFFFFF]"></span>
            </div>
          </div>
        </div>
        
        
        <GetListedLenders />
        <GetListedLendersProfileInfo />
        <GetListedLendersProfileInfoWantShareMore />
      </div>
    </>
  );
}
