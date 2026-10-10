import Image from 'next/image';
import AgentCtaLink from '@/components/common/AgentCtaLink';
import LenderCtaLink from '@/components/common/LenderCtaLink';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import type { NavItem, NavSection } from './model';
import styles from './Header.module.css';

export type Impact = { cashBackAmount: string; charityAmount: string } | null;
export function NavLink({ item, close, className, position }: { item: NavItem; close: () => void; className?: string; position: string }) {
  const existingTracking: Record<string, { id: string; intent: string }> = {
    '/about': { id: 'about', intent: 'navigate' },
    '/how-it-works': { id: 'how_it_works', intent: 'navigate' },
    '/impact': { id: 'impact', intent: 'navigate' },
    '/blog': { id: 'blog', intent: 'navigate_content' },
    '/pcs-resources': { id: 'pcs_resources', intent: 'navigate_content' },
    '/contact': { id: 'contact', intent: 'contact_general' },
    '/contact-lender': { id: 'find_lender', intent: 'contact_lender' },
    '/get-listed-agents': { id: `${position.startsWith('mobile') ? 'mobile_' : ''}get_listed_agents`, intent: 'partner_recruiting_agent' },
    '/get-listed-lenders': { id: `${position.startsWith('mobile') ? 'mobile_' : ''}get_listed_lenders`, intent: 'partner_recruiting_lender' },
  };
  const tracking = existingTracking[item.href];
  const ctaId = `header_${tracking?.id ?? item.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const content = item.description ? <><span>{item.label}</span><small>{item.description}</small></> : item.label;
  const props = { className, onClick: close, ctaId, ctaPosition: position, ctaComponent: 'site_header' };
  if (item.partner === 'agent') return <AgentCtaLink {...props}>{content}</AgentCtaLink>;
  if (item.partner === 'lender') return <LenderCtaLink {...props}>{content}</LenderCtaLink>;
  return <TrackedCtaLink href={item.href} className={className} onClick={close} cta={{ ctaId, ctaIntent: tracking?.intent ?? 'navigate', ctaPosition: position, ctaComponent: 'site_header', ctaLabel: item.label, destination: item.href }}>{content}</TrackedCtaLink>;
}
export function BenefitItems({ impact, footer = false }: { impact: Impact; footer?: boolean }) {
  const items = [
    { icon: '/icon/Giveback.svg', title: impact ? impact.cashBackAmount : 'Giving back', text: 'To military families' },
    { icon: '/icon/Star.svg', title: 'Military & Veteran', text: 'Focused' },
    { icon: 'shield', title: 'VA Loan', text: 'Experts' },
    { icon: '/icon/Storiesred.svg', title: 'Military families', text: 'Helping military families' },
  ];
  return <div className={footer ? styles.benefitFooter : styles.benefitItems}>{items.map((item, index) => <div className={styles.benefit} key={item.title} data-benefit={index}>{item.icon === 'shield' ? <svg className={styles.shieldIcon} aria-hidden="true" viewBox="0 0 32 38" fill="none"><path d="M16 2C12 6 7 7 2 7v13c0 8 8 13 14 16 6-3 14-8 14-16V7c-5 0-10-1-14-5Z" stroke="currentColor" strokeWidth="2"/><path d="M16 6c-3 3-7 4-10 4v10c0 6 6 10 10 12 4-2 10-6 10-12V10c-3 0-7-1-10-4Z" fill="currentColor"/></svg> : <Image src={item.icon} alt="" width={38} height={38} />}<div><strong>{item.title}</strong><span>{item.text}</span></div></div>)}</div>;
}
export function Promo({ kind, close, impact, position }: { kind: NavSection['promo']; close: () => void; impact: Impact; position: string }) {
  if (kind === 'guides') return <aside className={`${styles.promo} ${styles.guidePromo}`} aria-label="Free guides"><Image src="/images/redesign/guide-covers.webp" alt="VeteranPCS first-time home buyer and VA loan guide covers" width={130} height={110} /><div><h3>FREE PCS<br />GUIDES</h3><p>Your step-by-step guide to a smooth military move.</p><NavLink item={{ label: 'Explore Free Guides', href: '/guides' }} close={close} position={position} className={styles.redButton} /></div></aside>;
  if (kind === 'contact') return <aside className={`${styles.promo} ${styles.contactPromo}`} aria-label="Contact details"><span className={styles.promoStar} aria-hidden="true">★</span><h3>Questions?<br />Buying or Selling?</h3><Image src="/icon/Resources.svg" alt="" width={44} height={44} /><a href="tel:7197825065" onClick={close}>719-782-5065</a><a href="mailto:info@veteranpcs.com" onClick={close}>info@veteranpcs.com</a><NavLink item={{ label: 'Contact Us', href: '/contact' }} close={close} position={position} className={styles.redButton} /></aside>;
  return <aside className={`${styles.promo} ${styles.missionPromo}`} aria-label="Our mission"><div><span className={styles.promoStar} aria-hidden="true">★</span><h3>Military Families<br /><span>Helping Military Families</span></h3><Image src="/icon/Giveback.svg" alt="" width={52} height={52} />{impact ? <><strong className={styles.metric}>{impact.cashBackAmount}</strong><p>Given back to military families</p><strong className={styles.metric}>{impact.charityAmount}</strong><p>Donated to military foundations</p></> : <p>Every move can help support our military community.</p>}<NavLink item={{ label: 'Our Impact', href: '/impact' }} close={close} position={position} className={styles.redButton} /></div><div><span className={styles.promoStar} aria-hidden="true">★</span><h3>Join Our Network</h3><Image src="/icon/Stories.svg" alt="" width={64} height={56} /><p>Real estate agents and VA loan experts supporting military families.</p><NavLink item={{ label: 'Get Listed', href: '/get-listed-agents' }} close={close} position={position} className={styles.redButton} /></div></aside>;
}
