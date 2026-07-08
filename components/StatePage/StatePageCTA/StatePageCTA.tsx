"use client";

import Button from "@/components/common/Button";
import classes from "./StatePageCTA.module.css";
import Image from "next/image";
import Link from "next/link";
import { trackCtaClicked } from "@/lib/analytics/client";

const StatePageCTA = ({ cityName, stateSlug }: { cityName: string; stateSlug: string }) => {
  return (
    <div className="container mx-auto w-full py-16">
      <div className={classes.statepagectacontainer}>
        <div
          className="items-center grid lg:grid-cols-2 grid-cols-1 justify-center md:gap-10 gap-2 md:px-10 px-3 lg:py-12"
        >
          <div className="flex justify-center">
            <Image
              src="/assets/military-signing.png"
              width={530}
              height={530}
              alt="Real estate agent reviewing paperwork with a service member"
              sizes="(min-width: 768px) 530px, 326px"
              className="w-full max-w-[530px] h-auto object-cover"
            />
          </div>
          <div className="text-left">
            <div className="md:block hidden">
              <Image
                width={100}
                height={100}
                className="w-auto h-auto"
                src="/icon/userplus.svg"
                alt=""
              />
            </div>
            <div>
              <h2 className="text-white text-[31px] font-bold mt-5 md:text-left text-center lg:w-[500px]">
                Talk to our Agents in {cityName} Today
              </h2>
              <p className="text-white lg:text-[18px] md:text-[19px] text-[16px] font-normal leading-[25px] mt-4 md:text-left text-center">
                Are you a veteran or military spouse in search of a {cityName}{" "}
                realtor who understands your distinctive requirements?
                VeteranPCS is the answer. We are not serving merely as another
                real estate platform; we represent a community of veterans and
                military spouses committed to supporting one another throughout
                transitional periods. Connect with a military-friendly real
                estate agent in {cityName} today and initiate your PCS move with
                confidence.
              </p>
            </div>

            <div className="flex md:justify-start justify-center items-center gap-4">
              <Link
                href="/contact-agent"
                onClick={() => trackCtaClicked({
                  cta_id: 'state_page_agent_cta',
                  cta_intent: 'contact_agent',
                  cta_position: 'state_cta_band',
                  cta_component: 'state_page_cta',
                  destination_path: '/contact-agent',
                  state_slug: stateSlug,
                })}
              >
                <Button buttonText="Agent" />
              </Link>
              <Link
                href="/contact-lender"
                onClick={() => trackCtaClicked({
                  cta_id: 'state_page_lender_cta',
                  cta_intent: 'contact_lender',
                  cta_position: 'state_cta_band',
                  cta_component: 'state_page_cta',
                  destination_path: '/contact-lender',
                  state_slug: stateSlug,
                })}
              >
                <button
                  className="items-center border-2 border-[#A3161B] bg-white w-auto inline-flex lg:px-[30px] px-[20px] md:py-[14px] py-[12px] rounded-[16px] text-center tracking-[1px] text-[#A3161B] hover:bg-[#A3161B] hover:text-[#ffffff] all-duration transition-all duration-300 ease-in-out"
                >
                  <span className="md:text-[18px] text-[14px] font-normal leading-6 bg-cover text-nowrap">
                    Lender
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageCTA;
