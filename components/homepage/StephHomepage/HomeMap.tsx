'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StateMapSvg from '@/components/homepage/StateMapSvg';
import { US_STATES } from '@/constants/usStates';
import TrackedCtaLink from '@/components/common/TrackedCtaLink';
import { sendGTMEvent } from '@next/third-parties/google';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import HomeCta from './HomeCta';
import HomeSymbol from './HomeSymbol';
import styles from './StephHomepage.module.css';
const popular = ['Texas', 'Florida', 'California', 'North Carolina', 'Virginia', 'Colorado'];
export function SectionStar() { return <div className={styles.sectionStar} aria-hidden="true">★</div>; }
export function Benefits({ lender = false }: { lender?: boolean }) {
  const benefits = lender ? [ ['home-dollar.webp', '0% Down Payment', ''], ['Loan.svg', 'No PMI', ''], ['Agents.svg', 'Local Military Experts', ''] ] : [ ['Agents.svg', 'Local Agents Who Get It', 'Veteran and military spouse agents who get military moves'], ['Loan.svg', 'VA Loan Experts You Can Trust', 'Connect with lenders who specialize in VA loans'], ['Giveback.svg', 'Move With Confidence', 'We help you every step of the way, from base to home'] ];
  return <div className={`${styles.benefits} ${lender ? styles.lenderBenefits : ''}`}>{benefits.map(([icon, title, description], index) => <div key={title}>{lender && index>0?<span className={styles.lenderBenefitIcon}><HomeSymbol kind={index===1?'shield':'users'}/></span>:<Image src={`/icon/${icon}`} width={42} height={42} alt="" />}<div><h3>{title}</h3><p>{description}</p></div></div>)}</div>;
}
export default function HomeMap() {
  const router = useRouter();
  const track = useCallback((event: React.MouseEvent<SVGElement> | React.MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href') ?? '';
    const name = event.currentTarget.querySelector('[data-name]')?.getAttribute('data-name') ?? href;
    sendGTMEvent({ event: 'map_interaction', state: href });
    trackCtaClicked(buildCtaProperties({ ctaId: 'state_map_state', ctaIntent: 'state_page', ctaPosition: 'homepage_map', ctaComponent: 'homepage_state_map', ctaLabel: name, destination: href, pageType: 'homepage', stateSlug: href.replace(/^\//, '') }));
  }, []);
  const noop = useCallback(() => {}, []);
  return <section id="state-map" className={styles.mapSection} aria-labelledby="home-map-title"><SectionStar /><h2 id="home-map-title">Where are you moving?</h2><p className={styles.sectionIntro}>Choose your destination state to see military-friendly agents<br className={styles.desktopOnly} /> and VA loan experts, or let us match you directly.</p>
    <div className={styles.mapLayout}><div className={styles.mapGraphic} data-testid="homepage-state-map"><StateMapSvg onMouseEnter={noop} onMouseMove={noop} onMouseLeave={noop} onGtmEvent={track} /></div>
      <div className={styles.stateCard}><h3>Find Your New Home</h3><label><span className={styles.srOnly}>Select a State</span><select defaultValue="" onChange={(event) => { const slug = event.target.value; if (!slug) return; trackCtaClicked(buildCtaProperties({ ctaId: 'homepage_state_select', ctaIntent: 'state_page', ctaPosition: 'homepage_map', ctaComponent: 'homepage_state_map', ctaLabel: slug, destination: `/${slug}`, pageType: 'homepage', stateSlug: slug })); router.push(`/${slug}`); }}><option value="">Search for a state</option>{US_STATES.map((state) => <option key={state.code} value={state.slug}>{state.name}</option>)}</select></label>
        <p>Popular States</p><div className={styles.stateChips}>{popular.map((name) => { const state = US_STATES.find((item) => item.name === name); if (!state) return null; return <TrackedCtaLink className={name === 'Texas' ? styles.activeChip : ''} key={name} href={`/${state.slug}`} cta={{ ctaId: 'homepage_popular_state', ctaIntent: 'state_page', ctaPosition: 'homepage_map', ctaComponent: 'homepage_state_map', ctaLabel: name, destination: `/${state.slug}`, pageType: 'homepage', stateSlug: state.slug }}>{name}</TrackedCtaLink>; })}</div>
        <SectionStar /><h4>Not sure where you’re headed?</h4><p>Let us match you with an agent who knows your next duty station.</p><HomeCta href="/contact-agent" id="homepage_map_match">Match Me Now</HomeCta>
      </div>
    </div><Benefits />
  </section>;
}
