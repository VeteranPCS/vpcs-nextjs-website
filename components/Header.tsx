"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const onMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-[#292f6c] fixed top-0 left-0 w-full z-50 shadow-lg lg:px-0 px-5">
      <div className="container mx-auto w-full">
        <nav className="flex justify-between">
          <Link className="w-[130px] md:w-[200px] flex items-center" href="/">
            <Image
              width={235}
              height={63}
              src="/icon/VeteranPCSlogo.svg"
              className="lg:w-[235px] lg:h-[63px] md:w-[235px] md:h-[63px] sm:w-[200px] sm:h-[63px] w-[200px] h-[63px]"
              alt="VeteranPCS logo"
              onClick={isMenuOpen ? onMenuToggle : undefined}
            />
          </Link>
          <div className="flex items-center lg:gap-8 xl:gap-10">
            <div
              className={`navLinks duration-500 absolute md:static md:w-auto ${isMenuOpen ? "w-[60%]" : "w-full"} w-full md:h-auto ${isMenuOpen ? "h-[100vh]" : "h-[100vh]"}  bg-[#292f6c] flex md:items-center gap-[1.5vw] top-[100%] ${isMenuOpen ? "left-[0%]" : "left-[-100%]"} px-5 md:py-0 py-5`}
            >
              <ul className="menu nav flex md:flex-row flex-col md:items-center xl:gap-12 gap-6">
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/about" onClick={onMenuToggle}>
                    About
                  </Link>
                </li>
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/how-it-works" onClick={onMenuToggle}>
                    How It Works
                  </Link>
                </li>
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/impact" onClick={onMenuToggle}>
                    Impact
                  </Link>
                </li>
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/blog" onClick={onMenuToggle}>
                    Blog
                  </Link>
                </li>
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/pcs-resources" onClick={onMenuToggle}>
                    PCS Resources
                  </Link>
                </li>
                <li className="relative xl:text-base text-sm max-w-fit pr-3 md:pr-0 py-1 after:bg-gradient-to-r from-[#A81F23] to-[#A81F23] after:absolute after:h-1 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300">
                  <Link className="text-white" href="/contact" onClick={onMenuToggle}>
                    Contact
                  </Link>
                  <ul className="sub-menu">
                    <li className="px-10 py-3 text-white">
                      <Link
                        className="text-base font-normal"
                        href="/get-listed-agents"
                        onClick={onMenuToggle}
                      >
                        Get Listed Agents
                      </Link>
                    </li>

                    <li className="px-10 py-3 text-white">
                      <Link
                        className="text-base font-normal"
                        href="/get-listed-lenders"
                        onClick={onMenuToggle}
                      >
                        Get Listed Lenders
                      </Link>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm bg-[#7e1618] px-5 lg:block md:hidden sm:hidden hidden">
                <div className="text-center py-[28px]">
                  <p className="text-white text-[33px]">
                    <strong className="text-[33px] text-white font-bold">
                      $384,287<strong></strong>
                    </strong>
                  </p>
                  <p className="py-4 text-white mb-0 pb-0 text-xs">
                    Given Back to Military Families
                  </p>
                </div>
              </div>
              <button
                name={isMenuOpen ? "close" : "menu"}
                onClick={onMenuToggle}
                className="text-[30px] cursor-pointer md:hidden"
              >
                <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine):hidden]"></span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="18"
                  viewBox="0 0 25 18"
                  fill="none"
                >
                  <path
                    d="M1 1H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <path
                    d="M1 9H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <path
                    d="M1 17H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </div >
    </header >
  );
};

export default Header;
