"use client";
import { useState } from "react";

const AccordionItem = ({
  id,
  title,
  content,
}: {
  id: string;
  title: string;
  content: string | React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = `${id}-panel`;

  return (
    <div id={id} className="bg-[rgba(214,214,214,0.26)] shadow-[0px_12px_7px_-6px_rgba(0,_0,_0,_0.30)] mb-4 transition-all ease-in-out duration-700 motion-reduce:transition-none">
      <h3>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex min-h-11 items-center justify-between p-4 cursor-pointer transition-colors w-full text-left bg-transparent border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
              ${isExpanded ? "bg-gray-100" : "hover:bg-gray-50"}`}
        >
          <span
            className={`poppins md:text-[23px] sm:text-[16px] font-medium leading-[25.3px]
                ${isExpanded ? "text-[#7E1618]" : "text-[#292F6C]"}`}
          >
            {title}
          </span>
        </button>
      </h3>
      {/* Panel is always in the DOM (server HTML / crawlers see the copy);
          collapsed state hides it visually and removes it from the tab order. */}
      <div
        id={panelId}
        aria-hidden={!isExpanded}
        className={`overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none
            ${isExpanded ? "visible max-h-96 opacity-100" : "invisible max-h-0 opacity-0"}`}
        style={{ maxHeight: isExpanded ? "9999px" : "0px" }}
      >
        <div className="p-4 border border-white bg-white shadow-[0px_12px_7px_-6px_rgba(0,_0,_0,_0.30)]">
          <div className="text-gray-600">{content}</div>
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
