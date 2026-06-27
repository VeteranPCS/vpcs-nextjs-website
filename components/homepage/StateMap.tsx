"use client";
import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Button from "@/components/common/Button";
import { sendGTMEvent } from "@next/third-parties/google";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { trackCtaClicked } from "@/lib/analytics/client";
import { buildCtaProperties } from "@/lib/analytics/cta";

const StateMapSvg = dynamic(() => import("@/components/homepage/StateMapSvg"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] items-center justify-center text-primary tahoma">
      Loading state map...
    </div>
  ),
});

interface TooltipState {
  display: boolean;
  name: string;
  x: number;
  y: number;
}

const StateMap = ({ title, subTitle, buttonText, buttonLink }: { title: string, subTitle: string, buttonText: string, buttonLink: string }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    display: false,
    name: "",
    x: 0,
    y: 0,
  });
  const [showDesktopMap, setShowDesktopMap] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const updateMapVisibility = () => setShowDesktopMap(desktopQuery.matches);

    updateMapVisibility();
    desktopQuery.addEventListener("change", updateMapVisibility);

    return () => desktopQuery.removeEventListener("change", updateMapVisibility);
  }, []);

  // NOTE: these handlers are wrapped in useCallback with empty deps so they keep
  // a stable identity across renders. The tooltip-position state above changes on
  // every mousemove; if these handlers were re-created each render they would
  // break React.memo on <StateMapSvg> and force the ~1500-line SVG to re-diff.
  // They only read from the event argument and the stable setTooltip/sendGTMEvent
  // references, so empty deps are correct.
  const handleMouseEnter = useCallback((event: React.MouseEvent<SVGElement>) => {
    const name = event.currentTarget.getAttribute("id");
    setTooltip({
      display: true,
      name: name || "",
      x: event.pageX,
      y: event.pageY,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip({ display: false, name: "", x: 0, y: 0 });
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    setTooltip((prev) => ({
      ...prev,
      x: event.pageX + 10,
      y: event.pageY + 10,
    }));
  }, []);

  const handleSendGtmEvent = useCallback((event: React.MouseEvent<SVGElement> | React.MouseEvent<HTMLAnchorElement>) => {
    const target = event.currentTarget as HTMLElement;
    const href = target.getAttribute("href");
    const dataName = target.getAttribute("data-name")
      || target.querySelector("[data-name]")?.getAttribute("data-name");
    sendGTMEvent({
      event: "map_interaction",
      state: href || dataName || "unknown", // Use `href` first, fallback to `data-name`, default to "unknown"
    });
    const isStateLink = Boolean(dataName);
    trackCtaClicked(buildCtaProperties({
      ctaId: isStateLink ? 'state_map_state' : 'state_map_primary_cta',
      ctaIntent: isStateLink ? 'state_page' : 'contact_agent',
      ctaPosition: isStateLink ? 'desktop_state_map' : 'state_map_footer',
      ctaComponent: 'homepage_state_map',
      ctaLabel: dataName || buttonText,
      destination: href || buttonLink,
      pageType: 'homepage',
      stateSlug: isStateLink && href ? href.replace(/^\//, '') : undefined,
    }));
  }, [buttonLink, buttonText]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const states = [
    { name: 'Alabama', link: `/alabama` },
    { name: 'Alaska', link: `/alaska` },
    { name: 'Arizona', link: `/arizona` },
    { name: 'Arkansas', link: `/arkansas` },
    { name: 'California', link: `/california` },
    { name: 'Colorado', link: `/colorado` },
    { name: 'Connecticut', link: `/connecticut` },
    { name: 'Delaware', link: `/delaware` },
    { name: 'Florida', link: `/florida` },
    { name: 'Georgia', link: `/georgia` },
    { name: 'Hawaii', link: `/hawaii` },
    { name: 'Idaho', link: `/idaho` },
    { name: 'Illinois', link: `/illinois` },
    { name: 'Indiana', link: `/indiana` },
    { name: 'Iowa', link: `/iowa` },
    { name: 'Kansas', link: `/kansas` },
    { name: 'Kentucky', link: `/kentucky` },
    { name: 'Louisiana', link: `/louisiana` },
    { name: 'Maine', link: `/maine` },
    { name: 'Maryland', link: `/maryland` },
    { name: 'Massachusetts', link: `/massachusetts` },
    { name: 'Michigan', link: `/michigan` },
    { name: 'Minnesota', link: `/minnesota` },
    { name: 'Mississippi', link: `/mississippi` },
    { name: 'Missouri', link: `/missouri` },
    { name: 'Montana', link: `/montana` },
    { name: 'Nebraska', link: `/nebraska` },
    { name: 'Nevada', link: `/nevada` },
    { name: 'New Hampshire', link: `/new-hampshire` },
    { name: 'New Jersey', link: `/new-jersey` },
    { name: 'New Mexico', link: `/new-mexico` },
    { name: 'New York', link: `/new-york` },
    { name: 'North Carolina', link: `/north-carolina` },
    { name: 'North Dakota', link: `/north-dakota` },
    { name: 'Ohio', link: `/ohio` },
    { name: 'Oklahoma', link: `/oklahoma` },
    { name: 'Oregon', link: `/oregon` },
    { name: 'Pennsylvania', link: `/pennsylvania` },
    { name: 'Puerto Rico', link: `/puerto-rico` },
    { name: 'Rhode Island', link: `/rhode-island` },
    { name: 'South Carolina', link: `/south-carolina` },
    { name: 'South Dakota', link: `/south-dakota` },
    { name: 'Tennessee', link: `/tennessee` },
    { name: 'Texas', link: `/texas` },
    { name: 'Utah', link: `/utah` },
    { name: 'Vermont', link: `/vermont` },
    { name: 'Virginia', link: `/virginia` },
    { name: 'Washington', link: `/washington` },
    { name: 'Washington DC', link: `/washington-dc` },
    { name: 'West Virginia', link: `/west-virginia` },
    { name: 'Wisconsin', link: `/wisconsin` },
    { name: 'Wyoming', link: `/wyoming` }
  ];

  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <section className="z-0 w-full scroll-mt-24" id="state-map" aria-labelledby="state-map-title">
        <div className="w-full bg-primary-light px-4 py-10 lg:px-16">
          <div>
            <div className="text-center pb-5 w-full relative">
              <h2 id="state-map-title" className="text-center text-[2rem] font-bold leading-tight text-primary tahoma sm:text-[2.4rem] md:text-[2.75rem] lg:text-[3.4rem]">
                {title}
              </h2>
              <p className="mx-auto my-5 max-w-[46rem] px-2 text-center text-base font-normal leading-7 text-primary tahoma md:my-6 md:text-lg">
                {subTitle}
              </p>
            </div>
            <div className="dropdown mx-auto block w-full max-w-[360px] md:hidden">
              <div className="mb-2 flex w-full rounded-xl bg-white py-3 shadow-sm">
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className="dropbtn mx-5 flex min-h-11 w-full items-center justify-between text-left font-medium text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-expanded={isOpen}
                  aria-controls="mobile-state-list"
                >
                  Choose your destination state
                  <svg aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path id="Vector" d="M1.42857 -3.74668e-07L5 3.57143L8.57143 -6.24447e-08L10 0.714286L5 5.71429L-3.12225e-08 0.714285L1.42857 -3.74668e-07Z" fill="#252B42" />
                  </svg>
                </button>
              </div>
              {isOpen && (
                <div id="mobile-state-list" className="dropdown-content">
                  <div className="mx-auto w-full">
                    <label htmlFor="stateSearch" className="sr-only">
                      Search destination states
                    </label>
                    <input
                      type="text"
                      id="stateSearch"
                      className="search-input h-12 w-full rounded-xl px-3 text-base text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      placeholder="Search by state"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="mx-auto mt-2 h-[250px] w-full overflow-auto rounded-lg bg-white">
                    {filteredStates.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-500">No states found</span>
                      </div>
                    ) : (
                      filteredStates.map((state) => (
                        <TrackedCtaLink
                          key={state.name}
                          href={state.link}
                          className="flex min-h-11 items-center justify-center border border-solid px-3 py-2 text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                          cta={{
                            ctaId: 'state_map_mobile_state',
                            ctaIntent: 'state_page',
                            ctaPosition: 'mobile_state_dropdown',
                            ctaComponent: 'homepage_state_map',
                            ctaLabel: state.name,
                            destination: state.link,
                            pageType: 'homepage',
                            stateSlug: state.link.replace(/^\//, ''),
                          }}
                        >
                          {state.name}
                        </TrackedCtaLink>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="hidden md:block" aria-describedby="state-map-help">
              <p id="state-map-help" className="sr-only">
                Select a state on the map to view VeteranPCS agents and lenders for that destination.
              </p>
              {showDesktopMap && (
                <StateMapSvg
                  onMouseEnter={handleMouseEnter}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onGtmEvent={handleSendGtmEvent}
                />
              )}
            </div>
            <Link href={buttonLink} className="flex justify-center py-4 md:py-8" onClick={handleSendGtmEvent}>
              <Button buttonText={buttonText} />
            </Link>
          </div>
        </div>
      </section>
      {tooltip.display && (
        <div
          className="tooltip"
          style={{ top: `${tooltip.y}px`, left: `${tooltip.x}px` }}
        >
          {tooltip.name}
        </div>
      )}
    </>
  );
};

export default StateMap;
