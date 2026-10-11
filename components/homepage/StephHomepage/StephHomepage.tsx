import Image from 'next/image';
import { fetchGoogleReviews } from '@/utils/googleBusinessProfile';
import { REAL_STATE_AGENTS } from '@/lib/content/homepage';
import AgentLoanExpert from '@/components/homepage/AgentLoanExpert/AgentLoanExpert';
import SkillFuturesBuild from '@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild';
import KeepInTouch from '@/components/homepage/KeepInTouch/KeepInTouch';
import LeadCaptureDialog from '@/components/redesign/LeadCaptureDialog';
import HomeSearch from './HomeSearch';
import HomeMap, { Benefits, SectionStar } from './HomeMap';
import HomeReviews from './HomeReviews';
import HomeBonus from './HomeBonus';
import HomeCta from './HomeCta';
import HomeImpact, { LenderImpactBadge } from './HomeImpact';
import styles from './StephHomepage.module.css';

function Guide({ lender = false }: { lender?: boolean }) {
  return <div className={styles.guide}><Image src="/images/redesign/guide-covers.webp" width={136} height={115} alt="Free home buying guides" /><div><h3>{lender ? 'Get the Free VA Loan Guide' : 'FREE HOMEBUYER GUIDE'}</h3>{lender && <p>Everything you need to know about your VA home loan benefits.</p>}{!lender && <LeadCaptureDialog kind={lender ? 'va-guide' : 'homebuyer-guide'} triggerLabel={lender ? 'Download Guide' : 'Download Now'} className={styles.button} />}</div>{lender && <LeadCaptureDialog kind="va-guide" triggerLabel="Download Guide" className={styles.button}/>}</div>;
}
export default async function StephHomepage() {
  const { reviews } = await fetchGoogleReviews();
  const written = reviews.filter((review) => review.comment?.trim()).slice(0, 6);
  const steps = [ ['Missionred.svg', 'Tell us where you’re moving', 'Share a few details about your move.'], ['Agents.svg', 'Agent & VA Loan Expert', 'We connect you with trusted experts.'], ['Moveinbonus.svg', 'Receive your Move-In Bonus', 'Get cash back up to $4,000 at closing.'], ['Giveback.svg', '10% back', 'A portion of every closing goes back to military charities.'] ];
  const featured = ['Instant Teams', 'Better Business Bureau', 'Hire Our Heros', 'We Are The Mighty'];
  const logos = REAL_STATE_AGENTS.filter((logo) => featured.some((name) => logo.title.toLowerCase().includes(name.toLowerCase())));
  return <main className={styles.home}>
    <section className={styles.hero} aria-labelledby="home-hero-title"><div className={styles.heroInner}><div className={styles.heroCopy}><p className={styles.heroEyebrow}><span aria-hidden="true">★</span> Free Military-Friendly Agent Matching</p><h1 id="home-hero-title">Together,<br />We’ll Make <span className={styles.brush}>It Home.</span></h1><p className={styles.heroSubtitle}>Veteran & Military Spouse Real Estate Agents and VA Loan Experts You Can Trust.</p><div className={styles.heroChecks}><p><Image src="/icon/checkred.svg" width={24} height={24} alt="" />Free to Use</p><p><Image src="/icon/checkred.svg" width={24} height={24} alt="" />Get Cash Back</p></div></div><div className={styles.heroArt}><Image className={styles.heroComposite} src="/images/redesign/home-hero-family.webp" alt="Military family holding their VeteranPCS move-in bonus check in front of their home" width={1600} height={1327} priority /></div></div><div className={styles.heroSearch}><HomeSearch guide={<Guide />} /></div></section>
    <section className={styles.mission} aria-labelledby="homepage-mission"><div className={styles.missionIntro}><h2 id="homepage-mission">Our Mission. Your <span>Move.</span></h2><p>We make your PCS move easier, more rewarding, and give back along the way.</p><small><Image src="/icon/Loan.svg" width={16} height={16} alt="" />Our service is 100% FREE for military families.</small></div><ol>{steps.map(([icon, title, copy], index) => <li key={title}><span className={styles.stepNumber}>{index + 1}</span><Image src={`/icon/${icon}`} width={44} height={44} alt="" /><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol><small className={styles.missionMobileFree}>Our service is 100% FREE<br /> for military families.</small></section>
    <HomeMap /><HomeBonus /><HomeReviews reviews={written} />
    <HomeImpact />
    <section className={styles.partners} aria-labelledby="home-partners"><SectionStar /><h2 id="home-partners">Features & Partners</h2><div>{logos.map((logo) => <a href={logo.url} key={logo._id} target="_blank" rel="noopener noreferrer"><Image src={logo.mainImage.path} width={logo.mainImage.width} height={logo.mainImage.height} alt={logo.mainImage.alt} loading="eager" /></a>)}</div></section>
    <section className={styles.lender} aria-labelledby="home-lender-title"><div className={styles.lenderInner}><div className={styles.lenderPhoto}><LenderImpactBadge/><Image src="/images/redesign/home-lender-family.webp" width={560} height={560} alt="VeteranPCS military family holding their move-in bonus check" loading="eager" /></div><div className={styles.lenderCopy}><SectionStar /><h2 id="home-lender-title">Together, We’ll<br /> Make It <span className={styles.brush}>Home.</span></h2><p>Connect with our veteran and military spouse<br className={styles.desktopOnly} /> VA loan experts to guide you through your next move.</p><Benefits lender /><HomeCta href="/contact-lender" id="homepage_lender_expert" intent="contact_lender">Contact a VA Loan Expert</HomeCta><small>Our service is 100% FREE</small><Guide lender /></div></div></section>
    <div className={styles.legacySections}><AgentLoanExpert /><SkillFuturesBuild /><KeepInTouch /></div>
  </main>;
}
