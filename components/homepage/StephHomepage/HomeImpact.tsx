'use client';
import Image from 'next/image';
import { useImpactMetrics } from '@/components/redesign/ImpactProvider';
import HomeCta from './HomeCta';
import styles from './StephHomepage.module.css';
export default function HomeImpact() {
  const { metrics } = useImpactMetrics();
  const available = metrics?.available;
  return <section className={styles.impactRibbon} aria-label="Our community impact"><div><Image src="/icon/VeteranPCSlogo.svg" width={78} height={62} alt="VeteranPCS" /><strong>{available ? metrics.cashBackAmount : 'Giving Back'}<br /><small>given back to military families</small></strong></div><div><Image src="/icon/Giveback.svg" width={44} height={44} alt="" /><p><strong>{available ? metrics.charityAmount : 'Supporting'}</strong><br />Military Charities</p></div><div><Image src="/icon/Agents.svg" width={44} height={44} alt="" /><p>Veteran & Military<br />Spouse Experts</p></div><div><Image src="/icon/Star.svg" width={44} height={44} alt="" /><p>Military<br />Focused</p></div><HomeCta href="/our-impact" id="homepage_impact" intent="impact_navigation">See Our Impact</HomeCta></section>;
}
