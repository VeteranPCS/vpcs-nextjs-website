"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import AgentCtaLink from "@/components/common/AgentCtaLink";
import LenderCtaLink from "@/components/common/LenderCtaLink";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

// The desktop nav renders inline at >=1280px; below that the SAME markup is a
// right-side, full-width slide-in drawer. We track the breakpoint with matchMedia
// (not a CSS-only guess) so the drawer-only JS behaviors — scroll lock, focus
// trap, Escape, `inert` — never run against the visible desktop nav. `isMounted`
// gates anything that must match between SSR and the first client render (the
// `inert` attribute in particular): it stays false until after mount.
const DESKTOP_NAV_MEDIA_QUERY = "(min-width: 1280px)";

const useIsDesktopNav = () => {
  const [state, setState] = useState({ isMounted: false, isDesktop: false });
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_NAV_MEDIA_QUERY);
    // Set both flags together so `inert` can never briefly apply to the desktop nav.
    const update = () => setState({ isMounted: true, isDesktop: mql.matches });
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return state;
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [cashBackAmount, setCashBackAmount] = useState("$500,000");
  const submenuRef = useRef<HTMLLIElement>(null);
  const submenuToggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { isMounted, isDesktop } = useIsDesktopNav();

  // Shared with the desktop nav. Every mobile rule is scoped so the >=1280px
  // output stays byte-for-byte identical to before: max-w-fit / whitespace-nowrap /
  // the smaller text + right-padding only apply at min-[1280px]; the underline
  // pseudo-element is inert on touch. Mobile rows are full-width tap targets.
  const navItemClass =
    "relative py-3.5 text-lg after:absolute after:bottom-0 after:left-0 after:h-1 after:w-0 after:bg-accent-red after:transition-all after:duration-300 hover:after:w-full focus-within:after:w-full min-[1280px]:max-w-fit min-[1280px]:whitespace-nowrap min-[1280px]:py-1 min-[1280px]:pr-0 min-[1280px]:text-base";
  const navLinkClass =
    "text-white inline-flex w-full items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white min-[1280px]:inline min-[1280px]:w-auto min-[1280px]:min-h-0";
  // Quieter secondary group (Get Listed) — mobile drawer only (min-[1280px]:hidden).
  const secondaryNavItemClass = "min-[1280px]:hidden py-2.5 text-base";
  const secondaryNavLinkClass =
    "text-white/80 inline-flex w-full items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

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

  // If the viewport grows into the desktop nav while the drawer is open, close it
  // so the scroll lock (released by the effect cleanup below) can't strand the page.
  useEffect(() => {
    if (isDesktop && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isDesktop, isMenuOpen]);

  // Lock background scroll while the mobile drawer is open, saving and restoring the
  // prior inline values so it coexists with AgentFinderPopup's own overflow lock.
  useEffect(() => {
    if (!isMenuOpen || isDesktop) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMenuOpen, isDesktop]);

  // Mobile drawer focus management: move focus in on open, trap Tab within the
  // drawer + the hamburger, and close on Escape returning focus to the hamburger.
  useEffect(() => {
    if (!isMenuOpen || isDesktop) return;
    const drawer = navRef.current;
    if (!drawer) return;

    const getFocusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    // First focusable is queried at open time — the CTA pill is lg:hidden, so
    // between 1024–1279px this is the About link, not the pill. Focus must wait
    // for the visibility transition to start: at effect time the drawer's
    // computed visibility is still `hidden` (it only interpolates to `visible`
    // once transition progress > 0), and .focus() on a hidden element no-ops.
    // Double rAF lands after the first painted frame of the open transition.
    let focusFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => {
        getFocusable()[0]?.focus();
      });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      // Loop = the drawer's focusables followed by the hamburger button.
      const loop = [...getFocusable(), menuButtonRef.current].filter(
        (el): el is HTMLElement => el !== null
      );
      if (loop.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? loop.indexOf(active) : -1;
      // Pull stray focus back into the loop; otherwise wrap at the boundaries.
      const nextIndex =
        currentIndex === -1
          ? 0
          : event.shiftKey
            ? (currentIndex - 1 + loop.length) % loop.length
            : (currentIndex + 1) % loop.length;
      event.preventDefault();
      // nextIndex is derived modulo loop.length (> 0), so it is always in-bounds.
      loop[nextIndex]!.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, isDesktop]);

  const onMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed left-0 top-0 z-nav w-full overflow-x-clip bg-primary px-5 shadow-lg min-[1280px]:px-0">
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
              ref={navRef}
              inert={isMounted && !isDesktop && !isMenuOpen}
              className={`absolute top-full inset-x-0 w-full h-[calc(100vh-64px)] supports-[height:100dvh]:h-[calc(100dvh-64px)] lg:h-[calc(100vh-80px)] lg:supports-[height:100dvh]:h-[calc(100dvh-80px)] overflow-y-auto bg-primary transition-[transform,visibility] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none min-[1280px]:static min-[1280px]:flex min-[1280px]:h-auto min-[1280px]:w-auto min-[1280px]:min-w-0 min-[1280px]:items-center min-[1280px]:overflow-visible min-[1280px]:bg-transparent min-[1280px]:translate-x-0 min-[1280px]:visible min-[1280px]:transition-none ${isMenuOpen ? "translate-x-0 visible duration-300" : "translate-x-full invisible duration-[225ms]"}`}
            >
              <ul className="menu nav mx-auto flex w-full max-w-sm flex-col gap-0 divide-y divide-white/10 px-6 pt-8 pb-12 min-[1280px]:mx-0 min-[1280px]:w-auto min-[1280px]:max-w-none min-[1280px]:flex-row min-[1280px]:items-center min-[1280px]:gap-6 min-[1280px]:divide-y-0 min-[1280px]:px-0 min-[1280px]:py-0">
                <li className="mb-4 lg:hidden">
                  <AgentCtaLink
                    className="inline-flex w-full min-h-11 justify-center rounded-2xl bg-accent-red px-5 py-3 text-white transition-colors hover:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    onClick={closeMenu}
                    ctaId="header_mobile_find_agent"
                    ctaPosition="mobile_primary_nav"
                    ctaComponent="site_header"
                  >
                    Match Me With An Agent
                  </AgentCtaLink>
                </li>
                {/* lg–1279px hides the CTA pill above, but divide-y still counts it
                    as a sibling and would paint a stray hairline above this first
                    visible row; `!` is needed to out-rank divide-y's compound selector.
                    max-[1279.98px] (not 1280) so fractional viewports just under the
                    min-[1280px] desktop cutover are still covered. */}
                <li className={`${navItemClass} lg:max-[1279.98px]:!border-t-0`}>
                  <TrackedCtaLink
                    className={navLinkClass}
                    href="/about"
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                    onClick={closeMenu}
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
                {/* Get Listed — quieter secondary group in the mobile drawer */}
                <li className={`mt-4 ${secondaryNavItemClass}`}>
                  <TrackedCtaLink
                    className={secondaryNavLinkClass}
                    href="/get-listed-agents"
                    onClick={closeMenu}
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
                <li className={secondaryNavItemClass}>
                  <TrackedCtaLink
                    className={secondaryNavLinkClass}
                    href="/get-listed-lenders"
                    onClick={closeMenu}
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
                  className={`hidden min-[1280px]:block ${navItemClass}`}
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
                Match With An Agent
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
                ref={menuButtonRef}
                type="button"
                name={isMenuOpen ? "close" : "menu"}
                onClick={onMenuToggle}
                className="relative min-h-11 min-w-11 cursor-pointer text-[30px] min-[1280px]:hidden"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMenuOpen}
                aria-controls="primary-navigation"
              >
                <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"></span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="18"
                  viewBox="0 0 25 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      transform: isMenuOpen ? "translateY(8px) rotate(45deg)" : "translateY(0) rotate(0deg)",
                    }}
                  />
                  <path
                    d="M1 9H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className={`transition-opacity duration-200 motion-reduce:transition-none ${isMenuOpen ? "opacity-0" : "opacity-100"}`}
                  />
                  <path
                    d="M1 17H24"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      transform: isMenuOpen ? "translateY(-8px) rotate(-45deg)" : "translateY(0) rotate(0deg)",
                    }}
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
