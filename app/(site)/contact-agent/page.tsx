"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContactAgents from "@/components/ContactAgents/ContactAgent";
import { submitContactAgentLead } from "./actions";
import { sendGTMEvent } from "@next/third-parties/google";
import { ContactAgentFormData } from "@/types";
import { normalizeStateCode, normalizeStateSlug } from "@/lib/states";
import { formTrackingPayload } from "@/lib/analytics/client";
import type { CustomerSubmitResult } from "@/lib/leads/submission-outcome";
import { CONTACT_AGENT_VARIANT_ATTRIBUTE } from "@/lib/experiments/desktop-contact-agent";
import { useDesktopContactAgentVariant } from "@/components/ContactAgents/useDesktopContactAgentVariant";
import v2 from "@/components/ContactAgents/ContactAgentV2.module.css";

/**
 * Reports the page's current query string, including changes made without a page load (a link
 * to another agent, Back and Forward). It renders nothing and sits in its own Suspense
 * boundary so that only this component opts out of static rendering; the form itself stays in
 * the prerendered HTML.
 */
function QueryStringWatcher({ onChange }: { onChange: (search: string) => void }) {
  const searchParams = useSearchParams();
  const query = searchParams ? searchParams.toString() : null;
  useEffect(() => {
    onChange(query === null ? window.location.search : query ? `?${query}` : '');
  }, [query, onChange]);
  return null;
}

export default function ContactAgentPage() {
  // null until the browser has reported the address; the selected agent and state live there.
  const [search, setSearch] = useState<string | null>(null);
  const followAddress = useCallback((next: string) => setSearch(next), []);
  const derivedStateCode = useMemo(
    () => (search === null ? null : normalizeStateCode(new URLSearchParams(search).get("state"))),
    [search],
  );
  const experiment = useDesktopContactAgentVariant();

  const handleSubmit = async (formData: ContactAgentFormData & { submission_attempt_id: string }): Promise<CustomerSubmitResult> => {
    const fullQueryString = window.location.search;
    const queryParams = new URLSearchParams(fullQueryString);
    const queryState = queryParams.get("state");

    let tracking = {};
    try { tracking = formTrackingPayload('contact_agent'); } catch { /* Optional attribution. */ }
    const result = await submitContactAgentLead({ ...formData, ...tracking }, fullQueryString);
    if (result.outcome === 'accepted') {
      try { sendGTMEvent({
        event: "conversion_contact_agent",
        agent_id: queryParams.get("id") || "",
        state: normalizeStateSlug(queryState) || "",
      }); } catch { /* Optional conversion telemetry. */ }
    }
    return result;
  };

  // const renderProgressBar = () => {
  //   return (
  //     <div className="flex md:justify-start justify-center">
  //       <div className="flex items-center gap-4">
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 1 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 2 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //         <span className={`border w-10 p-[1px] ${currentStep >= 3 ? 'bg-[#000080]' : 'bg-[#B9B9C3]'}`}></span>
  //         <span className={`border rounded-full w-5 h-5 p-[1px] ${currentStep >= 4 ? 'bg-[#000080]' : 'bg-[#FFFFFF] border-[#B9B9C3]'}`}></span>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <div
      className={`container mx-auto w-full ${v2.root}`}
      {...{ [CONTACT_AGENT_VARIANT_ATTRIBUTE]: experiment?.variant }}
    >
      <div className={`flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5 ${v2.spacer}`}>
      </div>
      <Suspense fallback={null}>
        <QueryStringWatcher onChange={followAddress} />
      </Suspense>
      <ContactAgents
        onSubmit={handleSubmit}
        derivedStateCode={derivedStateCode}
        urlSearch={search}
        experiment={experiment}
      />
    </div>
  );
}
