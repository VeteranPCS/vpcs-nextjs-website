"use client";

import { useState } from "react";

interface BioToggleProps {
  id: string;
  children: React.ReactNode;
}

/**
 * Accessible expand/collapse control for team-bio cards.
 * The team pages (DigitalTeam, AdminTeam, CeoFounder) are async server
 * components and cannot own useState themselves, so this shared client
 * component owns the toggle state and reproduces the prior checkbox-hack
 * visuals (max-h collapse + Read More/Read Less label) with a real button.
 */
const BioToggle = ({ id, children }: BioToggleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = `bio-content-${id}`;

  return (
    <div className="relative">
      <div
        id={contentId}
        className={`text-[#5F6980] text-sm md:text-lg font-light mt-3 mb-3 overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-full" : "max-h-28"}`}
      >
        {children}
      </div>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="cursor-pointer text-[#292F6C] tahoma text-sm font-bold bg-white min-h-11 inline-flex items-center"
      >
        {isExpanded ? "Read Less" : "Read More"}
      </button>
    </div>
  );
};

export default BioToggle;
