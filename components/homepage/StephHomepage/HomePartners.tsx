'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { HomePartner } from './partners';
import { SectionStar } from './HomeMap';
import styles from './StephHomepage.module.css';

export default function HomePartners({ partners }: { partners: readonly HomePartner[] }) {
  const [start, setStart] = useState(0);
  const [visible, setVisible] = useState(2);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateSize = () => setVisible(window.innerWidth >= 1280 ? 5 : window.innerWidth >= 768 ? 3 : 2);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion(); updateSize(); updateVisibility();
    motion.addEventListener('change', updateMotion);
    window.addEventListener('resize', updateSize);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { motion.removeEventListener('change', updateMotion); window.removeEventListener('resize', updateSize); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  const maxStart = Math.max(0, partners.length - visible);
  const activeStart = Math.min(start, maxStart);
  const rotating = !paused && !hovered && !focused && !hidden && !reducedMotion;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setStart(index => (Math.min(index, maxStart) + 1) % (maxStart + 1)), 3000);
    return () => window.clearInterval(timer);
  }, [rotating, maxStart]);
  const move = (delta: number) => setStart(index => (Math.min(index, maxStart) + delta + maxStart + 1) % (maxStart + 1));
  return <section className={styles.partners} aria-labelledby="home-partners" aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <SectionStar /><h2 id="home-partners">Features & Partners</h2>
    <div className={styles.partnerViewport}><ul className={styles.partnerSlides} style={{ transform: `translateX(-${activeStart * 100 / visible}%)`, '--partner-count': visible } as React.CSSProperties} aria-live={rotating ? 'off' : 'polite'}>
      {partners.map((partner, index) => {
        const inView = index >= activeStart && index < activeStart + visible;
        return <li key={partner.id} data-partner-id={partner.id} inert={!inView} aria-hidden={!inView}><a href={partner.url} target="_blank" rel="noopener noreferrer" aria-label={partner.name}><Image src={partner.image} width={partner.width} height={partner.height} alt={partner.alt} loading="eager" sizes="(max-width:767px) 40vw, 240px" /></a></li>;
      })}
    </ul></div>
    <div className={styles.partnerControls}><button type="button" onClick={() => move(-1)} aria-label="Previous partners">‹</button><button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Play partner carousel' : 'Pause partner carousel'}</button><button type="button" onClick={() => move(1)} aria-label="Next partners">›</button></div>
  </section>;
}
