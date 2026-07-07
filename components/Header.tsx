"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import AgentCtaLink from "@/components/common/AgentCtaLink";
import LenderCtaLink from "@/components/common/LenderCtaLink";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [cashBackAmount, setCashBackAmount] = useState("$500,000");
  const submenuRef = useRef<HTMLLIElement>(null);
  const submenuToggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const navItemClass =
    "relative max-w-fit whitespace-nowrap pr-3 py-1 text-sm after:absolute after:bottom-0 after:left-0 after:h-1 after:w-0 after:bg-accent-red after:transition-all after:duration-300 hover:after:w-full focus-within:after:w-full min-[1400px]:pr-0 min-[1400px]:text-base";
  const navLinkClass =
    "text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white inline-flex items-center min-h-11 min-[1400px]:inline min-[1400px]:min-h-0";

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

    // The stat this feeds only renders at 2xl (1536px+); skip the fetch
    // entirely below that breakpoint until the viewport actually grows into it.
    const mql = window.matchMedia('(min-width: 1536px)');
    let fetched = false;

    const fetchOnce = () => {
      if (fetched) return;
      fetched = true;
      fetchMetrics();
    };

    if (mql.matches) {
      fetchOnce();
    } else {
      mql.addEventListener('change', fetchOnce);
    }

    return () => mql.removeEventListener('change', fetchOnce);
  }, []);

  // Close the Get Listed submenu and the mobile drawer on route change.
  useEffect(() => {
    setIsSubmenuOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  // Close the Get Listed submenu on Escape or outside click (only while open).
  useEffect(() => {
    if (!isSubmenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSubmenuOpen(false);
        submenuToggleRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        setIsSubmenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isSubmenuOpen]);

  const onMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="fixed left-0 top-0 z-nav w-full bg-primary px-5 shadow-lg min-[1400px]:px-0">
      <div className="container mx-auto w-full">
        <nav className="flex min-h-[64px] justify-between lg:min-h-[80px]" aria-label="Primary navigation">
          <TrackedCtaLink
            className="flex w-[130px] shrink-0 items-center md:w-[205px] xl:w-[220px] 2xl:w-[235px]"
            href="/"
            onClick={isMenuOpen ? onMenuToggle : undefined}
            cta={{
              ctaId: 'header_logo',
              ctaIntent: 'navigate_home',
              ctaPosition: 'header_logo',
              ctaComponent: 'site_header',
              ctaLabel: 'VeteranPCS logo',
              destination: '/',
            }}
          >
            <Image
              width={235}
              height={63}
              src="/icon/VeteranPCSlogo.svg"
              className="w-full h-auto"
              alt="VeteranPCS logo"
            />
          </TrackedCtaLink>
          <div className="flex min-w-0 items-center lg:gap-5 xl:gap-7">
            <div
              id="primary-navigation"
              className={`navLinks absolute top-full bg-primary px-5 py-5 min-[1400px]:static min-[1400px]:flex min-[1400px]:h-auto min-[1400px]:w-auto min-[1400px]:min-w-0 min-[1400px]:items-center min-[1400px]:bg-transparent min-[1400px]:px-0 min-[1400px]:py-0 ${isMenuOpen ? "left-0 flex w-[min(86vw,340px)] max-h-[calc(100vh-64px)] supports-[height:100dvh]:max-h-[calc(100dvh-64px)] lg:max-h-[calc(100vh-80px)] lg:supports-[height:100dvh]:max-h-[calc(100dvh-80px)] overflow-y-auto" : "hidden"}`}
            >
              <ul className="menu nav flex flex-col gap-6 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:gap-8">
                <li className="lg:hidden">
                  <AgentCtaLink
                    className="inline-flex min-h-11 rounded-2xl bg-accent-red px-5 py-3 text-white transition-colors hover:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    onClick={onMenuToggle}
                    ctaId="header_mobile_find_agent"
                    ctaPosition="mobile_primary_nav"
                    ctaComponent="site_header"
                  >
                    Find an Agent
                  </AgentCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/about"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_about',
                      ctaIntent: 'navigate',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'About',
                      destination: '/about',
                    }}
                  >
                    About
                  </TrackedCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/how-it-works"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_how_it_works',
                      ctaIntent: 'navigate',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'How It Works',
                      destination: '/how-it-works',
                    }}
                  >
                    How It Works
                  </TrackedCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/impact"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_impact',
                      ctaIntent: 'navigate',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'Impact',
                      destination: '/impact',
                    }}
                  >
                    Impact
                  </TrackedCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/blog"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_blog',
                      ctaIntent: 'navigate_content',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'Blog',
                      destination: '/blog',
                    }}
                  >
                    Blog
                  </TrackedCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/pcs-resources"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_pcs_resources',
                      ctaIntent: 'navigate_content',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'PCS Resources',
                      destination: '/pcs-resources',
                    }}
                  >
                    PCS Resources
                  </TrackedCtaLink>
                </li>
                <li className={navItemClass}>
                  <LenderCtaLink
                    className={navLinkClass}
                    onClick={onMenuToggle}
                    ctaId="header_find_lender"
                    ctaPosition="primary_nav"
                    ctaComponent="site_header"
                  >
                    Find a Lender
                  </LenderCtaLink>
                </li>
                <li className={navItemClass}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/contact"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_contact',
                      ctaIntent: 'contact_general',
                      ctaPosition: 'primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'Contact',
                      destination: '/contact',
                    }}
                  >
                    Contact
                  </TrackedCtaLink>
                </li>
                {/* Get Listed — plain inline items in the mobile drawer */}
                <li className={`min-[1400px]:hidden ${navItemClass}`}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/get-listed-agents"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_mobile_get_listed_agents',
                      ctaIntent: 'partner_recruiting_agent',
                      ctaPosition: 'mobile_primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'Get Listed Agents',
                      destination: '/get-listed-agents',
                    }}
                  >
                    Get Listed Agents
                  </TrackedCtaLink>
                </li>
                <li className={`min-[1400px]:hidden ${navItemClass}`}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/get-listed-lenders"
                    onClick={onMenuToggle}
                    cta={{
                      ctaId: 'header_mobile_get_listed_lenders',
                      ctaIntent: 'partner_recruiting_lender',
                      ctaPosition: 'mobile_primary_nav',
                      ctaComponent: 'site_header',
                      ctaLabel: 'Get Listed Lenders',
                      destination: '/get-listed-lenders',
                    }}
                  >
                    Get Listed Lenders
                  </TrackedCtaLink>
                </li>
                {/* Get Listed — desktop split control: parent link + submenu toggle */}
                <li
                  ref={submenuRef}
                  data-submenu-open={isSubmenuOpen}
                  className={`hidden min-[1400px]:block ${navItemClass}`}
                >
                  <div className="flex items-center">
                    <TrackedCtaLink
                      className={navLinkClass}
                      href="/get-listed-agents"
                      cta={{
                        ctaId: 'header_get_listed',
                        ctaIntent: 'partner_recruiting',
                        ctaPosition: 'primary_nav',
                        ctaComponent: 'site_header',
                        ctaLabel: 'Get Listed',
                        destination: '/get-listed-agents',
                      }}
                    >
                      Get Listed
                    </TrackedCtaLink>
                    <button
                      ref={submenuToggleRef}
                      type="button"
                      onClick={() => setIsSubmenuOpen((open) => !open)}
                      aria-expanded={isSubmenuOpen}
                      aria-controls="get-listed-submenu"
                      aria-label="Toggle Get Listed submenu"
                      className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 8L10 13L15 8"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <ul className="sub-menu" id="get-listed-submenu">
                    <li className="px-10 py-3 text-white">
                      <TrackedCtaLink
                        className="text-base font-normal"
                        href="/get-listed-agents"
                        onClick={() => setIsSubmenuOpen(false)}
                        cta={{
                          ctaId: 'header_get_listed_agents',
                          ctaIntent: 'partner_recruiting_agent',
                          ctaPosition: 'primary_nav_submenu',
                          ctaComponent: 'site_header',
                          ctaLabel: 'Get Listed Agents',
                          destination: '/get-listed-agents',
                        }}
                      >
                        Get Listed Agents
                      </TrackedCtaLink>
                    </li>

                    <li className="px-10 py-3 text-white">
                      <TrackedCtaLink
                        className="text-base font-normal"
                        href="/get-listed-lenders"
                        onClick={() => setIsSubmenuOpen(false)}
                        cta={{
                          ctaId: 'header_get_listed_lenders',
                          ctaIntent: 'partner_recruiting_lender',
                          ctaPosition: 'primary_nav_submenu',
                          ctaComponent: 'site_header',
                          ctaLabel: 'Get Listed Lenders',
                          destination: '/get-listed-lenders',
                        }}
                      >
                        Get Listed Lenders
                      </TrackedCtaLink>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <AgentCtaLink
                className="hidden min-h-11 shrink-0 items-center rounded-2xl bg-accent-red px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:inline-flex"
                ctaId="header_desktop_find_agent"
                ctaPosition="desktop_primary_cta"
                ctaComponent="site_header"
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
                className="relative min-h-11 min-w-11 cursor-pointer text-[30px] min-[1400px]:hidden"
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
