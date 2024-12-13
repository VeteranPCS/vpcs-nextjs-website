import React from "react";
import "@/styles/globals.css";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/common/Button";

const EndBlogPostDetails = () => {
  return (
    <div className="relative py-12 md:px-0 px-5">
      <div className="container mx-auto">
        <div className="w-4/5 mx-auto">
          <div className="">
            <h6 className="text-[#495057] text-xl font-bold roboto">
              Factors to Consider When Choosing Temporary Housing
            </h6>
          </div>
          <div>
            <div className="pl-5">
              <ul>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Proximity to New Duty Station:</b>  Consider the distance
                  from your temporary lodging to your new duty station.
                  Convenience can significantly impact your daily routine and
                  integration into your new role.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Family Needs:</b>If moving with family, consider the size
                  and amenities of the lodging to ensure comfort for everyone.
                  Facilities such as laundry, kitchens, and recreational areas
                  can make your stay more enjoyable.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Budget:</b>  Keep your budget in mind, especially if
                  considering off-base options. Factor in the cost of meals,
                  laundry, and commuting to the base.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Rent vs. Buy New Home:</b>The amount of time that you spend
                  in temporary housing will be in large part determined by your
                  decision to rent or buy your new home. Renting has the benefit
                  of larger supply and faster time to close and move in. If you
                  are looking to buy your home, we highly recommend
                  <Link
                    className="border-b"
                    href="https://veteranpcs.com/blog/military-transition-help/benefits-of-working-with-veteran-real-estate-agents-for-military-veterans/"
                  >
                    {" "}
                     our veteran real estate agents who have been through this
                    experience themselves.
                  </Link>{" "}
                  Our veteran agents are experts in their local markets around
                  their respective bases, helping you find and close on a home
                  that meets your unique needs as a military family. You can 
                  <Link className="border-b" href="https://veteranpcs.com/#map">
                    get in touch with them using our map feature.
                  </Link>
                </li>
              </ul>
            </div>
            <div className="mt-5">
              <h6 className="text-[#495057] text-xl font-bold roboto">
                Resources for Finding Temporary Housing
              </h6>
            </div>
            <div className="pl-5">
              <ul>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Military OneSource Website: </b>
                  <Link className="border-b" href="#">
                    Military OneSource
                  </Link>
                  offers a wealth of information, including a directory of
                  on-base lodging facilities and tips for securing temporary
                  housing.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  <b>Installation Relocation Office:  </b>Your new
                  installation’s relocation office is a valuable resource for
                  local housing options, both temporary and permanent. They can
                  provide insights into the local area and available
                  accommodations.
                </li>
              </ul>
            </div>
            <div className="mt-5">
              <h6 className="text-[#495057] text-xl font-bold roboto">
                Tips for Securing Temporary Housing During Peak PCS Seasons
              </h6>
            </div>
            <div className="pl-5">
              <ul>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  Book Early: The PCS season can significantly impact the
                  availability of temporary housing. Booking as early as
                  possible can ensure you secure the lodging you prefer.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  Explore Multiple Options: Don’t limit your search to one type
                  of accommodation. Exploring all available options can uncover
                  the best fit for your needs and budget.
                </li>
                <li className="text-[#495057] roboto text-sm font-normal list-disc leading-6 ">
                  Utilize Military Networks: Reach out to your military network
                  for recommendations and insights. Fellow service members can
                  offer valuable advice based on their experiences.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[#495057] roboto text-sm font-normal">
                Conclusion
              </p>
              <p className="text-[#495057] roboto text-sm font-normal">
                Navigating temporary housing during a PCS move requires early
                planning and consideration of your unique needs. By exploring
                all available options, utilizing military resources, and
                planning ahead, you can find temporary lodging that offers
                comfort and convenience during your transition. Remember,
                securing the right temporary housing is the first step in making
                your PCS move as smooth and stress-free as possible.
              </p>
            </div>
            <div>
              <p className="bg-[#E5E5E5] p-[1px] w-full my-5"></p>
            </div>
            <div>
              <div className="flex items-start gap-4">
                <div>
                  <Image
                    width={150}
                    height={150}
                    src="/assets/bloguser.png"
                    alt="check"
                    className="w-[150px] h-[150px]"
                  />
                </div>
                <div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndBlogPostDetails;
