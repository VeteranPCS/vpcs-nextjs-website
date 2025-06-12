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

  return (
    <div id={id} className="bg-[rgba(214,214,214,0.26)] shadow-[0px_12px_7px_-6px_rgba(0,_0,_0,_0.30)] mb-4 transition-all ease-in-out duration-700">
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors 
            ${isExpanded ? "bg-gray-100" : "hover:bg-gray-50"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4 w-full">
          <div className="flex-grow">
            <h3
              className={`poppins md:text-[23px] sm:text-[16px] font-medium leading-[25.3px] 
                  ${isExpanded ? "text-[#7E1618]" : "text-[#292F6C]"}`}
            >
              {title}
            </h3>
          </div>
        </div>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out 
            ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
        style={{ maxHeight: isExpanded ? "9999px" : "0px" }}
      >
        {isExpanded && (
          <div className="p-4 border border-white bg-white shadow-[0px_12px_7px_-6px_rgba(0,_0,_0,_0.30)]">
            <div className="text-gray-600">{content}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccordionItem;
