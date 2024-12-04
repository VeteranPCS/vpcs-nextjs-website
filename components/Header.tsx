"use client";
import React, { useState } from "react";
import "@/styles/globals.css";

const Header = () => {
  return (
    <div className="bg-[#292f6c] fixed top-0 left-0 w-full z-50 header px-5">
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-4 ">
          <div className="py-5">
            <img
              src="/icon/VeteranPCSlogo.svg"
              className="lg:w-[235px] lg:h-[63px] md:w-[235px] md:h-[63px] sm:w-[200px] sm:h-[63px] w-[200px] h-[63px]"
              alt="Description of the image"
            />
          </div>
          <div className="py-5">
            <nav className="menu-nav">
              <div className="lg:hidden md:hidden sm:block block">
                <button>
                  <img src="/icon/bars.svg" alt="Menu" className="w-8 h-8" />
                </button>
              </div>
              <ul className="menu nav flex items-center lg:gap-20 md:gap-10 sm:gap-5 gap-5 ml-5 lg:flex md:flex sm:hidden hidden">
                <li>
                  <a className="text-base font-normal text-white" href="#">
                    About
                  </a>
                  <ul className="sub-menu bg-[#292E6C] border-t-2 border-[#003486] p-5">
                    <li className="px-10 py-3 text-white">
                      <a className="text-base font-normal" href="#">
                        How It Works
                      </a>
                    </li>
                    <li className="px-10 py-3 text-white">
                      <a className="text-base font-normal" href="#">
                        Stories
                      </a>
                    </li>
                    <li className="px-10 py-3 text-white">
                      <a className="text-base font-normal" href="/blog-list">
                        Blog
                      </a>
                    </li>
                  </ul>
                </li>
                <li>
                  <a className="text-base font-normal text-white" href="#">
                    PCS Resources
                  </a>
                </li>
                <li>
                  <a className="text-base font-normal text-white" href="#">
                    Impact
                  </a>
                </li>
                <li>
                  <a className="text-base font-normal text-white" href="#">
                    Contact
                  </a>
                  <ul className="sub-menu">
                    <li className="px-10 py-3 text-white">
                      <a className="text-base font-normal" href="#">
                        Get Listed Agents
                      </a>
                    </li>
                    <li className="px-10 py-3 text-white">
                      <a className="text-base font-normal" href="#">
                        Get Listed Lenders
                      </a>
                    </li>
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
          <div className="text-sm bg-[#7e1618] px-5 lg:block md:hidden sm:hidden hidden">
            <div className="text-center py-[28px]">
              <p className="text-white text-[33px]">
                <strong className="text-[33px] text-white font-bold">
                  $247,500<strong></strong>
                </strong>
              </p>
              <p className="py-4 text-white mb-0 pb-0 text-xs">
                Given Back to Military Families
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
