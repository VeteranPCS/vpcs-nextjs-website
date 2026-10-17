'use client';
import HomeIcon from './HomeIcon';
import Image from 'next/image';
import { useImpactMetrics } from '@/components/redesign/ImpactProvider';
import HomeCta from './HomeCta';
import styles from './StephHomepage.module.css';
function ImpactIcon({ icon }: { icon: string }) {
  const source = icon === 'Resources.svg' ? 'impact-people' : icon === 'Star.svg' ? 'impact-star' : 'impact-giveback';
  return <span className={styles.impactIcon} aria-hidden="true"><HomeIcon name={source} eager /></span>;
}
export function LenderImpactBadge() {
  const { metrics } = useImpactMetrics();
  return <aside className={styles.lenderImpactBadge} aria-label="Verified community impact"><div><span className={styles.badgeHouse} aria-hidden="true"/><strong>{metrics?.available ? metrics.cashBackAmount : 'Giving Back'}</strong><small>Given Back To<br/>Military Families</small></div></aside>;
}
export default function HomeImpact() {
  const { metrics } = useImpactMetrics();
  const available = metrics?.available;
  return <section className={styles.impactRibbon} aria-label="Our community impact">
    <div className={styles.impactLead}><Image className={styles.impactEmblem} src="/icon/VeteranPCS-logo_wht-outline.svg" width={90} height={80} alt="VeteranPCS"/><span className={styles.mobileImpactIcon}><ImpactIcon icon="Loan.svg"/></span><strong>{available ? metrics.cashBackAmount : 'Giving Back'}<small>Given back to military families</small></strong></div>
    <div><ImpactIcon icon="Giveback.svg"/><p><strong>{available ? metrics.charityAmount : 'Supporting'}</strong><br/>Military Charities</p></div>
    <div className={styles.impactExperts}><ImpactIcon icon="Resources.svg"/><p>Veteran & Military<br/>Spouse Experts</p></div>
    <div><ImpactIcon icon="Star.svg"/><p>Military<br/>Focused</p></div>
    <HomeCta href="/impact" id="homepage_impact" intent="impact_navigation">See Our Impact <span aria-hidden="true">›</span></HomeCta>
    <svg className={styles.impactWave} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path fill="#a91f23" d="M0 65C350 -20 640 12 920 25S1240 52 1440 18V120H0Z"/><path fill="white" d="M0 120C440 -2 770 8 1090 30S1350 29 1440 28V120Z"/></svg>
  </section>;
}
