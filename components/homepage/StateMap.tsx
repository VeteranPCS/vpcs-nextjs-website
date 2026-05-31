"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/common/Button";
import { sendGTMEvent } from "@next/third-parties/google";
import StateMapSvg from "@/components/homepage/StateMapSvg";

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
    const dataName = target.getAttribute("data-name");
    sendGTMEvent({
      event: "map_interaction",
      state: href || dataName || "unknown", // Use `href` first, fallback to `data-name`, default to "unknown"
    });
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const states = [
    { name: 'Alabama', link: `${BASE_URL}/alabama` },
    { name: 'Alaska', link: `${BASE_URL}/alaska` },
    { name: 'Arizona', link: `${BASE_URL}/arizona` },
    { name: 'Arkansas', link: `${BASE_URL}/arkansas` },
    { name: 'California', link: `${BASE_URL}/california` },
    { name: 'Colorado', link: `${BASE_URL}/colorado` },
    { name: 'Connecticut', link: `${BASE_URL}/connecticut` },
    { name: 'Delaware', link: `${BASE_URL}/delaware` },
    { name: 'Florida', link: `${BASE_URL}/florida` },
    { name: 'Georgia', link: `${BASE_URL}/georgia` },
    { name: 'Hawaii', link: `${BASE_URL}/hawaii` },
    { name: 'Idaho', link: `${BASE_URL}/idaho` },
    { name: 'Illinois', link: `${BASE_URL}/illinois` },
    { name: 'Indiana', link: `${BASE_URL}/indiana` },
    { name: 'Iowa', link: `${BASE_URL}/iowa` },
    { name: 'Kansas', link: `${BASE_URL}/kansas` },
    { name: 'Kentucky', link: `${BASE_URL}/kentucky` },
    { name: 'Louisiana', link: `${BASE_URL}/louisiana` },
    { name: 'Maine', link: `${BASE_URL}/maine` },
    { name: 'Maryland', link: `${BASE_URL}/maryland` },
    { name: 'Massachusetts', link: `${BASE_URL}/massachusetts` },
    { name: 'Michigan', link: `${BASE_URL}/michigan` },
    { name: 'Minnesota', link: `${BASE_URL}/minnesota` },
    { name: 'Mississippi', link: `${BASE_URL}/mississippi` },
    { name: 'Missouri', link: `${BASE_URL}/missouri` },
    { name: 'Montana', link: `${BASE_URL}/montana` },
    { name: 'Nebraska', link: `${BASE_URL}/nebraska` },
    { name: 'Nevada', link: `${BASE_URL}/nevada` },
    { name: 'New Hampshire', link: `${BASE_URL}/new-hampshire` },
    { name: 'New Jersey', link: `${BASE_URL}/new-jersey` },
    { name: 'New Mexico', link: `${BASE_URL}/new-mexico` },
    { name: 'New York', link: `${BASE_URL}/new-york` },
    { name: 'North Carolina', link: `${BASE_URL}/north-carolina` },
    { name: 'North Dakota', link: `${BASE_URL}/north-dakota` },
    { name: 'Ohio', link: `${BASE_URL}/ohio` },
    { name: 'Oklahoma', link: `${BASE_URL}/oklahoma` },
    { name: 'Oregon', link: `${BASE_URL}/oregon` },
    { name: 'Pennsylvania', link: `${BASE_URL}/pennsylvania` },
    { name: 'Puerto Rico', link: `${BASE_URL}/puerto-rico` },
    { name: 'Rhode Island', link: `${BASE_URL}/rhode-island` },
    { name: 'South Carolina', link: `${BASE_URL}/south-carolina` },
    { name: 'South Dakota', link: `${BASE_URL}/south-dakota` },
    { name: 'Tennessee', link: `${BASE_URL}/tennessee` },
    { name: 'Texas', link: `${BASE_URL}/texas` },
    { name: 'Utah', link: `${BASE_URL}/utah` },
    { name: 'Vermont', link: `${BASE_URL}/vermont` },
    { name: 'Virginia', link: `${BASE_URL}/virginia` },
    { name: 'Washington', link: `${BASE_URL}/washington` },
    { name: 'Washington DC', link: `${BASE_URL}/washington-dc` },
    { name: 'West Virginia', link: `${BASE_URL}/west-virginia` },
    { name: 'Wisconsin', link: `${BASE_URL}/wisconsin` },
    { name: 'Wyoming', link: `${BASE_URL}/wyoming` }
  ];

  const filteredStates = states.filter((state) =>
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="z-0 w-full" id="state-map">
        <div className="bg-[#aeb0c7] lg:px-16 py-10 w-full">
          <div>
            <div className="text-center pb-5 w-full relative">
              <h2 className="text-[#292f6c] text-center text-shadow-lg tahoma font-bold leading-10 lg:text-[59px] md:text-[40px] sm:text-[32px] text-[32px]">
                {title}
              </h2>
              <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] text-[#292f6c] text-center text-shadow-lg font-normal lg:my-10 md:my-5 sm:my-5 my-5 tahoma px-2 sm:px-28 lg:px-36 max-w-screen-md mx-auto">
                {subTitle}
              </p>
            </div>
            <StateMapSvg
              onMouseEnter={handleMouseEnter}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onGtmEvent={handleSendGtmEvent}
            />
            <div className="dropdown md:hidden block">
              <div className="flex mb-2 bg-white w-[337px] mx-auto rounded-xl py-3">
                <button onClick={toggleDropdown} className="dropbtn ml-6 flex justify-between items-center w-[85%]">
                  Select State    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path id="Vector" d="M1.42857 -3.74668e-07L5 3.57143L8.57143 -6.24447e-08L10 0.714286L5 5.71429L-3.12225e-08 0.714285L1.42857 -3.74668e-07Z" fill="#252B42" />
                  </svg>

                </button>
              </div>
              {isOpen && (
                <div id="myDropdown" className="dropdown-content">
                  <div className="w-[337px] mx-auto">
                    <input
                      type="text"
                      id="stateSearch"
                      className="search-input h-[48px] w-full rounded-xl pl-3"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="bg-white mt-2 w-[337px] mx-auto h-[250px] overflow-auto rounded-lg">
                    {filteredStates.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-500">No data found</span>
                      </div>
                    ) : (
                      filteredStates.map((state) => (
                        <a key={state.name} href={state.link} className="py-2 flex justify-center border border-solid">
                          {state.name}
                        </a>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link href={buttonLink} className="md:py-8 py-2 flex justify-center" onClick={handleSendGtmEvent}>
              <Button buttonText={buttonText} />
            </Link>
          </div>
        </div>
      </div>
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
