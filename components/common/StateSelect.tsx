"use client";
import { useEffect, useRef, useState } from "react";
import { US_STATE_CODES } from "@/constants/usStates";

interface StateSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export default function StateSelect({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Select State",
}: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={onBlur}
        className="flex w-full items-center justify-between border-b border-[#E2E4E5] px-2 py-1 text-left bg-white"
      >
        <span className={value ? "text-black" : "text-[#6B7280]"}>
          {value || placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5.5 7.5l4.5 4.5 4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto border border-[#E2E4E5] bg-white shadow-lg"
        >
          {US_STATE_CODES.map((code) => (
            <li
              key={code}
              role="option"
              aria-selected={value === code}
              onClick={() => {
                onChange(code);
                setOpen(false);
              }}
              className={`cursor-pointer px-2 py-1 hover:bg-[#F3F4F6] ${
                value === code ? "bg-[#E5E7EB]" : ""
              }`}
            >
              {code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
