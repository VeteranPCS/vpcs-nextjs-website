"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import AgentCtaLink from "@/components/common/AgentCtaLink";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cashBackAmount, setCashBackAmount] = useState("$500,000");
  const navItemClass =
    "relative max-w-fit whitespace-nowrap pr-3 py-1 text-sm after:absolute after:bottom-0 after:left-0 after:h-1 after:w-0 after:bg-accent-red after:transition-all after:duration-300 hover:after:w-full focus-within:after:w-full md:pr-0 xl:text-base";
  const navLinkClass =
    "text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/impact');
        const data = await response.json();

        if (data.success && data.data) {
          setCashBackAmount(data.data.cashBackAmount);
        }
      } catch (error) {
        console.error('Error fetching impact metrics:', error);
        // Keep default value on error
      }
    };

    fetchMetrics();
  }, []);

  const onMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="fixed left-0 top-0 z-50 w-full bg-primary px-5 shadow-lg lg:px-0">
      <div className="container mx-auto w-full">
        <nav className="flex min-h-[64px] justify-between lg:min-h-[80px]" aria-label="Primary navigation">
          <Link className="flex w-[130px] shrink-0 items-center md:w-[190px] xl:w-[200px]" href="/">
            <Image
              width={235}
              height={63}
              src="/icon/VeteranPCSlogo.svg"
              className="h-auto w-[200px] md:w-[205px] xl:w-[220px] 2xl:w-[235px]"
              alt="VeteranPCS logo"
              onClick={isMenuOpen ? onMenuToggle : undefined}
            />
          </Link>
          <div className="flex min-w-0 items-center lg:gap-5 xl:gap-7">
            <div
              id="primary-navigation"
              className={`navLinks absolute top-full bg-primary px-5 py-5 md:static md:flex md:h-auto md:w-auto md:min-w-0 md:items-center md:bg-transparent md:px-0 md:py-0 ${isMenuOpen ? "left-0 flex h-[calc(100vh-64px)] w-[min(86vw,340px)]" : "hidden"}`}
            >
              <ul className="menu nav flex flex-col gap-6 md:flex-row md:items-center md:gap-5 lg:gap-6 xl:gap-8">
                <li className="md:hidden">
                  <AgentCtaLink
                    className="inline-flex min-h-11 rounded-2xl bg-accent-red px-5 py-3 text-white transition-colors hover:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    onClick={onMenuToggle}
                  >
                    Find an Agent
                  </AgentCtaLink>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/about" onClick={onMenuToggle}>
                    About
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/how-it-works" onClick={onMenuToggle}>
                    How It Works
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/impact" onClick={onMenuToggle}>
                    Impact
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/blog" onClick={onMenuToggle}>
                    Blog
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/pcs-resources" onClick={onMenuToggle}>
                    PCS Resources
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/contact-lender" onClick={onMenuToggle}>
                    Find a Lender
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/contact" onClick={onMenuToggle}>
                    Contact
                  </Link>
                </li>
                <li className={navItemClass}>
                  <Link className={navLinkClass} href="/get-listed-agents" onClick={onMenuToggle}>
                    Get Listed
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
              <AgentCtaLink
                className="hidden min-h-11 shrink-0 items-center rounded-2xl bg-accent-red px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:inline-flex"
              >
                Find an Agent
              </AgentCtaLink>
              <div className="hidden shrink-0 bg-accent-red-dark px-4 text-sm 2xl:block">
                <div className="text-center py-4">
                  <p className="text-white text-xl">
                    <strong className="text-xl text-white font-bold">
                      {cashBackAmount}
                    </strong>
                  </p>
                  <p className="pt-1 text-white mb-0 pb-0 text-xs">
                    Given Back to Military Families
                  </p>
                </div>
              </div>
              <button
                type="button"
                name={isMenuOpen ? "close" : "menu"}
                onClick={onMenuToggle}
                className="relative min-h-11 min-w-11 cursor-pointer text-[30px] md:hidden"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMenuOpen}
                aria-controls="primary-navigation"
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
