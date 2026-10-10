'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import AgentCtaLink from '@/components/common/AgentCtaLink';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import { BenefitItems, NavLink, Promo } from './navigation/HeaderContent';
import { navigation, type NavGroup, type NavItem, type NavSection } from './navigation/model';
import { useImpactMetrics } from '@/components/redesign/ImpactProvider';
import styles from './navigation/Header.module.css';

const desktopQuery = '(min-width: 1280px)';
const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

function MenuIcon({kind}: {kind: NavGroup['icon'] | NavItem['icon']}) {
  return <svg className={styles.itemIcon} data-menu-icon={kind} aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">{kind === 'giving' ? <><path d="M12 10C5 6 8 1 12 4c4-3 7 2 0 6Z"/><path d="M2 16h5l3-3h6c2 0 2 3 0 3h-5v2h6l5-5 2 2-7 7H2Z"/></> : kind === 'chat' ? <><path d="M5 3h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M7 8h10M7 12h8" stroke="currentColor" strokeWidth="1.6"/></> : kind === 'pin' ? <><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.5" fill="white"/></> : kind === 'home' ? <path d="m2 11 10-9 10 9-2 2-2-2v11h-5v-7h-2v7H6V11l-2 2Z"/> : kind === 'people' ? <><circle cx="12" cy="7" r="4"/><circle cx="3" cy="9" r="3"/><circle cx="21" cy="9" r="3"/><path d="M5 21v-4a7 7 0 0 1 14 0v4ZM0 19v-3a4 4 0 0 1 4-4v7Zm20 0v-7a4 4 0 0 1 4 4v3Z"/></> : <><circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7" fill="none" stroke="white" strokeWidth="2"/></>}</svg>;
}


function RootIcon({ kind }: { kind: NavSection['icon'] }) {
  return <svg className={styles.rootIcon} data-root-icon={kind} aria-hidden="true" viewBox="0 0 32 36" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 2 6 3 6 3 1 8-1 12-6 4-6 2-6-2-6-4-1-12 1-8 6-3Z" />
    {kind === 'loan' ? <><path d="m8 17 8-7 8 7M10 16v10h12V16M14 26v-7h4v7" /></> : kind === 'resources' ? <><path d="M12 20c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8M12 20h8M13 24h6M14 27h4M16 9v8" /></> : kind === 'mission' ? <><path d="m16 8 6 3v7c0 5-6 8-6 8s-6-3-6-8v-7Z"/><path d="m13 17 2 2 4-5" /></> : <><path d="M8 10h16v11h-8l-5 4v-4H8ZM12 14h8M12 17h6" /></>}
  </svg>;
}

export default function Header() {
  const [desktop, setDesktop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const { metrics } = useImpactMetrics();
  const impact = metrics?.available ? metrics : null;
  const headerRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastMobileSection = useRef<string | null>(null);
  const pathname = usePathname();
  const section = navigation.find((item) => item.id === sectionId);
  const close = () => { setMobileOpen(false); setSectionId(null); };

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    const update = () => { setDesktop(media.matches); setMobileOpen(false); setSectionId(null); };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => { setMobileOpen(false); setSectionId(null); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen || desktop) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // Native inert also removes the background page from assistive technology.
    const background: HTMLElement[] = [];
    // Follow the header's ancestor branch so div-based legacy pages, floating
    // widgets, and portal roots are covered without making the modal itself inert.
    let branch: HTMLElement | null = headerRef.current;
    while (branch && branch !== document.body) {
      const parent: HTMLElement | null = branch.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) background.push(sibling);
      }
      branch = parent;
    }
    const previous = background.map((element) => ({ element, inert: element.inert }));
    background.forEach((element) => { element.inert = true; });
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      previous.forEach(({ element, inert }) => { element.inert = inert; });
    };
  }, [mobileOpen, desktop]);

  useEffect(() => {
    if (!mobileOpen || desktop) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    drawer.scrollTop = 0;
    if (sectionId) {
      lastMobileSection.current = sectionId;
      backRef.current?.focus();
    } else {
      const previous = lastMobileSection.current;
      (previous ? mobileTriggerRefs.current[previous] : drawer.querySelector<HTMLElement>('button'))?.focus();
    }
  }, [mobileOpen, desktop, sectionId]);

  useEffect(() => {
    if (!(desktop ? sectionId : mobileOpen)) return;
    const dismiss = (restore: boolean) => {
      setMobileOpen(false); setSectionId(null);
      if (restore) {
        if (desktop && sectionId) triggerRefs.current[sectionId]?.focus();
        else requestAnimationFrame(() => toggleRef.current?.focus());
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(true); return; }
      if (event.key !== 'Tab' || desktop) return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const elements = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      const loop = elements;
      const current = loop.indexOf(document.activeElement as HTMLElement);
      const next = current < 0 ? 0 : (current + (event.shiftKey ? -1 : 1) + loop.length) % loop.length;
      if (loop[next]) { event.preventDefault(); loop[next].focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) dismiss(false);
    };
    const focusOutside = (event: FocusEvent) => {
      if (desktop && !headerRef.current?.contains(event.target as Node)) dismiss(false);
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', focusOutside);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', focusOutside);
    };
  }, [desktop, mobileOpen, sectionId]);

  const openDesktop = (id: string, focusFirst = false) => {
    setSectionId((current) => current === id && !focusFirst ? null : id);
    if (focusFirst) requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus());
  };

  const contents = (mobile: boolean) => section && <>
    <div data-section={section.id} className={`${styles.panelContent} ${section.id === 'pcs-resources' ? styles.resourcesContent : ''}`}>
      <div className={styles.groups}>{section.groups.map((group) => <section className={styles.group} key={group.title} aria-label={group.title}><h2>{group.title}</h2><ul>{group.items.map((item) => <li key={`${item.label}-${item.href}`}><MenuIcon kind={item.icon ?? group.icon} /><NavLink item={item} close={close} className={styles.menuLink} position={mobile ? 'mobile_primary_nav' : 'primary_nav'} /></li>)}</ul></section>)}</div>
      <Promo kind={section.promo} close={close} impact={impact} position={mobile ? 'mobile_nav_promo' : 'header_nav_promo'} />
    </div>
    <BenefitItems impact={impact} footer />
  </>;

  return <>
    {desktop && section && <div className={styles.backdrop} aria-hidden="true" onClick={close} />}
    <header ref={headerRef} className={styles.header} data-site-header>
      <div className={styles.navbar}>
        <TrackedCtaLink href="/" className={styles.logo} onClick={close} cta={{ ctaId: 'header_logo', ctaIntent: 'navigate_home', ctaPosition: 'header_logo', ctaComponent: 'site_header', ctaLabel: 'VeteranPCS logo', destination: '/' }}><Image src="/icon/VeteranPCSlogo.svg" alt="VeteranPCS logo" width={235} height={55} priority /></TrackedCtaLink>
        <nav className={styles.desktopNav} aria-label="Primary navigation"><ul>{navigation.map((item) => <li key={item.id}><button type="button" ref={(element) => { triggerRefs.current[item.id] = element; }} aria-expanded={desktop && sectionId === item.id} aria-controls="desktop-navigation-panel" onClick={() => openDesktop(item.id)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); openDesktop(item.id, true); } }} className={sectionId === item.id ? styles.activeTrigger : ''}>{item.label}<span className={styles.chevron} aria-hidden="true" /></button></li>)}</ul><AgentCtaLink className={styles.redButton} ctaId="header_desktop_find_agent" ctaPosition="desktop_primary_cta" ctaComponent="site_header">Find an Agent</AgentCtaLink></nav>
        <button type="button" ref={toggleRef} className={`${styles.mobileToggle} ${mobileOpen ? styles.hiddenToggle : ''}`} aria-hidden={mobileOpen || undefined} tabIndex={mobileOpen ? -1 : undefined} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => { if (mobileOpen) { close(); requestAnimationFrame(() => toggleRef.current?.focus()); } else { lastMobileSection.current = null; setSectionId(null); setMobileOpen(true); } }}><span aria-hidden="true" className={mobileOpen ? styles.closeIcon : styles.hamburger} /></button>
      </div>
      <div className={styles.benefitStrip}><div className={styles.stripInner}><div className={styles.stripImpact}><Image src="/assets/VeteranPCS-logo.png" alt="" width={46} height={46} /><div><strong>{impact ? impact.cashBackAmount : 'Giving back'}</strong><span>{impact ? 'Given back to military families' : 'To our military community'}</span></div></div><div className={styles.stripDesktop}><BenefitItems impact={impact} /></div><NavLink item={{ label: 'Learn More', href: '/impact' }} close={close} className={styles.learnMore} position="header_benefit_strip" /></div></div>
      <div id="desktop-navigation-panel" ref={panelRef} className={styles.desktopPanel} data-section={section?.id} hidden={!desktop || !section} aria-label={section ? `${section.label} navigation` : undefined}>{desktop && contents(false)}</div>
      {!desktop && mobileOpen && <div id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Mobile navigation" ref={drawerRef} className={`${styles.mobileDrawer} ${section ? styles.drilldown : ''}`}>
        {section ? <><div className={styles.mobileHeading}><button ref={backRef} type="button" onClick={() => setSectionId(null)}><span aria-hidden="true">‹</span> Back</button><h2>{section.label}</h2></div>{contents(true)}</> : <><nav aria-label="Mobile primary navigation" className={styles.mobileRoot}><ul>{navigation.map((item) => <li key={item.id}><button type="button" ref={(element) => { mobileTriggerRefs.current[item.id] = element; }} onClick={() => setSectionId(item.id)}><RootIcon kind={item.icon} /><span>{item.label}</span><span aria-hidden="true">›</span></button></li>)}</ul><AgentCtaLink onClick={close} className={styles.redButton} ctaId="header_mobile_find_agent" ctaPosition="mobile_primary_nav" ctaComponent="site_header">Find an Agent</AgentCtaLink></nav><BenefitItems impact={impact} footer /></>}
        <button type="button" className={`${styles.mobileToggle} ${styles.dialogClose}`} aria-label="Close navigation" onClick={() => { close(); requestAnimationFrame(() => toggleRef.current?.focus()); }}><span aria-hidden="true" className={styles.closeIcon} /></button>
      </div>}
    </header>
  </>;
}
