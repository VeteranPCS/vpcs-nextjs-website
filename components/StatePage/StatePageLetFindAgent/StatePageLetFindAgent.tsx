"use client";

import React from "react";
import Button from "@/components/common/Button";
import Link from "next/link";
import { trackCtaClicked } from "@/lib/analytics/client";
import { buildStateContactCtaProperties } from "@/lib/analytics/state-cta";
import { buildContactCtaHref } from "@/lib/contactAgentUrl";

const StatePageCityAgents = ({
  stateSlug,
  stateCode,
}: {
  stateSlug?: string;
  stateCode?: string;
}) => {
  return (
    <div className="bg-[#292F6C]">
      <div className="container mx-auto">
        <div className="flex justify-around flex-wrap items-center p-2 sm:py-2 py-8">
          <div>
            <h6 className="text-[#FFFFFF] text-enter text-[19px] md:text-[31px] px-8 text-center sm:text-left font-normal md:font-bold leading-none md:leading-[34px]">Don’t see an agent for your area?</h6>
          </div>
          <div className="mt-8 sm:mt-0">
            <Link
              href={buildContactCtaHref({ stateSlug, form: 'agent' })}
              onClick={() => trackCtaClicked(buildStateContactCtaProperties({
                ctaId: 'state_page_find_agent_fallback', position: 'state_agent_list_footer', state: stateSlug ?? stateCode,
              }))}
            >
              <Button buttonText="Let us find you an agent" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatePageCityAgents;
