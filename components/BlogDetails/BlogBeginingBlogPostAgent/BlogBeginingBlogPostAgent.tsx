import React from "react";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";

const BlogBeginingBlogPostAgent = () => {
  return (
    <div className="relative py-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div className="flex flex-wrap lg:gap-0 gap-10">
          <div className="lg:w-1/5 md:w-1/5 sm:w-full w-full">
            <div className="flex justify-around items-center mb-4">
              <p className="text-[#495057] lora text-sm font-bold">
                04.23.2024
              </p>
              <p className="text-[#495057] lora text-sm font-bold">4 minutes</p>
            </div>
            <div className="bg-[#E5E5E5] rounded-2xl p-10 text-center">
              <div className="flex justify-center">
                <Image
                  width={150}
                  height={150}
                  src="/assets/bloguser.png"
                  alt="check"
                  className="w-[150px] h-[150px]"
                />
              </div>
              <p className="text-[#6C757D] roboto text-sm font-normal mt-5">
                <b className="text-[#495057] tahoma">Jim Wilson</b>
                <br></br> Birmingham, AL<br></br>{" "}
                <b className="text-[#495057]">
                  Active Duty Army <br></br>Lokation Real Estate
                </b>
              </p>
              <div>
                <Button buttonText="Get in Touch" />
              </div>
            </div>
          </div>
          <div className="lg:w-4/5 md:w-4/5 sm:w-full w-full lg:pl-10">
            <p className="text-[#495057] roboto text-sm font-normal">
              A Permanent Change of Station (PCS) move is a hallmark of military
              life, bringing with it the challenge of finding temporary housing.
              Whether you’re awaiting permanent on-base housing or searching for
              a place to stay while you house hunt, understanding your temporary
              housing options is crucial. This blog post aims to guide active
              duty military personnel through the different temporary housing
              options available during a PCS move, including factors to
              consider, resources for finding housing, and tips for securing
              accommodations during the busy PCS season.<br></br> Temporary
              housing solutions vary widely, offering flexibility to meet the
              diverse needs of military families. From on-base lodging to
              extended-stay hotels, there are several options to consider. By
              planning ahead and utilizing available resources, you can find a
              temporary housing solution that best fits your situation.
            </p>
            <h6 className="text-[#495057] roboto text-[20px] font-bold mt-5">
              Temporary Housing Options
            </h6>
            <div className="mt-2 mb-2">
              <p className="text-[#495057] text-base font-semibold ">
                On-Base Housing
              </p>
            </div>
            <div className="pl-5">
              <ul>
                <li className="text-[#495057] roboto text-sm font-normal list-disc ">
                  <b>Temporary Lodging Facilities (TLF):</b> On-base temporary
                  lodging is often the first choice for many military families.
                  TLFs are convenient and cost-effective, offering furnished
                  accommodations within the security of the base. Availability
                  can be limited, so early booking is recommended.
                </li>
              </ul>
            </div>
            <div className="mt-2 mb-2">
              <p className="text-[#495057] text-base font-semibold ">
                Temporary Lodging Allowance (TLA)
              </p>
            </div>
            <div className="pl-5">
              <ul>
                <li className="text-[#495057] roboto text-sm font-normal list-disc ">
                  TLA: For those stationed overseas, TLA is designed to
                  partially reimburse for the cost of temporary lodging and
                  meals. Understanding the specifics of TLA and how to apply it
                  towards your lodging choice is essential for effective
                  budgeting.
                </li>
              </ul>
            </div>
            <div className="mt-2 mb-2">
              <p className="text-[#495057] text-base font-semibold ">
                Extended-Stay Hotels
              </p>
            </div>
            <div >
              <p className="text-[#495057] roboto text-sm font-normal">
                Hotels: Extended-stay hotels are a popular option, providing
                amenities such as kitchenettes, which can be ideal for longer
                stays. Many hotels offer military discounts, so be sure to
                inquire when booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogBeginingBlogPostAgent;
