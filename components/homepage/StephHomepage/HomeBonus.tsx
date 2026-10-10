'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { calculateMovingBonus } from '@/lib/bonus/calculate';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import HomeCta from './HomeCta';
import styles from './StephHomepage.module.css';
const currency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
export default function HomeBonus() {
  const [price, setPrice] = useState(300000);
  const bonus = calculateMovingBonus(price);
  function update(value: number) { setPrice(Math.max(0, Math.min(10000000, value))); }
  useEffect(() => { if (price === 300000) return; const timer = setTimeout(() => captureAnalyticsEvent('moving_bonus_calculated', { calculator_id: 'homepage_bonus', bonus_amount: bonus, charity_amount: Math.round(bonus * 0.1) }), 750); return () => clearTimeout(timer); }, [price, bonus]);
  return <section className={styles.bonusBand} aria-labelledby="home-bonus-title"><div className={styles.bonusLayout}><div className={styles.bonusPhoto}><Image src="/images/redesign/home-lender-family.webp" width={480} height={480} alt="VeteranPCS family with a move-in bonus check" /></div><div className={styles.bonusCard}><div className={styles.bonusHeading}><Image src="/icon/home-calculator-icon.webp" width={62} height={62} alt="" /><div><h2 id="home-bonus-title">Estimated VeteranPCS Bonus</h2><p>Adjust the slider to estimate your VeteranPCS bonus. We can confirm your options when we match you with an agent.</p></div></div><label className={styles.srOnly} htmlFor="homepage-price-slider">Estimated home price</label><input id="homepage-price-slider" type="range" min={50000} max={1000000} step={10000} value={Math.min(1000000, Math.max(50000, price))} onChange={(event) => update(Number(event.target.value))} /><div className={styles.bonusFields}><label htmlFor="homepage-price-input">Home Price<input id="homepage-price-input" type="number" min={0} max={10000000} step={1000} value={price} onChange={(event) => update(Number(event.target.value))} /></label><div><p>VeteranPCS Bonus</p><output aria-live="polite">{currency(bonus)}</output></div><HomeCta href="/contact-agent" id="homepage_calculator_agent">Find an Agent</HomeCta></div></div></div><p className={styles.bonusDisclaimer}>* Bonus amounts are estimates and may vary based on final purchase price and actual commission rates.</p></section>;
}
