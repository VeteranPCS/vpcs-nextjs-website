import Image from 'next/image';
import Link from 'next/link';
import LeadCaptureDialog from '@/components/redesign/LeadCaptureDialog';
import VALoanCta from './VALoanCta';
import QuestionForm from './QuestionForm';
import LoanIcon from './LoanIcon';
import styles from './VALoanLanding.module.css';
const benefits = [
  ['home-dollar.webp','$0 Down Payment','Eligible borrowers may buy with no down payment when the price does not exceed the appraised value.'],
  ['shield','No PMI','VA-backed loans do not require private mortgage insurance.'],
  ['percent','Competitive Rates','Compare lender offers to find terms that fit your needs.'],
  ['Loan.svg','Closing Cost Options','Some costs may be paid by the seller. A VA funding fee may apply.'],
] as const;
const steps = [
  ['document','Get Pre-Approved','Connect with a VA loan expert to review your options.'],
  ['search-home','Find Your Home','Work with a local agent who knows your area.'],
  ['checklist','Close with Confidence','Get guidance from contract through closing.'],
  ['home','Move In & Save','Enjoy your new home and your VA benefits.'],
] as const;
export default function VALoanLanding() {
  return <main className={`steph-design ${styles.page}`}>
    <section className={styles.hero} aria-labelledby="va-hero-title">
      <div className={`steph-container ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><span>VA Loan</span></nav>
          <h1 id="va-hero-title">VA Loan<br/>Made for <span>You.</span></h1>
          <p>VA loans are one of the most powerful benefits you’ve earned. Our local VA loan experts make the process simple from start to home.</p>
          <ul className={styles.heroChecks}><li>Eligible for $0 Down</li><li>No PMI</li><li>Competitive Rates</li></ul>
          <div className={styles.heroActions}><VALoanCta href="/contact-lender" id="va_hero_preapproval">Get Pre-Approved Today</VALoanCta><VALoanCta href="/va-loan-calculator" id="va_hero_calculator" intent="calculator_navigation" className={styles.textLink}>Calculate Your Payment <span aria-hidden="true">›</span></VALoanCta></div>
          <p className={styles.heroNote}>Support from Veteran and Military Spouse loan experts.</p>
        </div>
        <div className={styles.heroVisual} data-testid="va-hero-visual"><Image src="/images/redesign/va-hero-photo-region.png" width={462} height={219} priority sizes="(max-width:767px) 100vw, 55vw" alt="Military service member and partner in front of a home" className={styles.heroPhoto}/>
          <div className={styles.calculatorInvitation} data-testid="va-calculator-invitation"><h2>How Much Home Can You Afford?</h2><p>Use our VA loan calculator to explore your estimated payment.</p><VALoanCta href="/va-loan-calculator" id="va_hero_calculator_card" intent="calculator_navigation">Try Our VA Loan Calculator <span aria-hidden="true">›</span></VALoanCta><small>Estimates are for planning; lender approval is required.</small></div>
        </div>
      </div>
    </section>
    <section className={`steph-container ${styles.benefitSection}`} aria-labelledby="va-benefits-title"><header className="steph-heading"><h2 id="va-benefits-title">Why Choose a VA Loan?</h2><p>Understand the benefits available to eligible borrowers.</p></header><div className={styles.benefitGrid}>{benefits.map(([icon,title,copy])=><article key={title}><div className={styles.iconCircle}>{icon.includes('.')?<Image src={`/icon/${icon}`} width={54} height={54} alt=""/>:<LoanIcon kind={icon}/>}</div><h3>{title}</h3><p>{copy}</p></article>)}</div><p className={styles.benefitSource}>VA and lender credit, income, entitlement, and occupancy requirements apply. <a href="https://www.va.gov/housing-assistance/home-loans/loan-types/purchase-loan/">Review VA purchase loan benefits</a>.</p></section>
    <section className={styles.processSection}><div className={`steph-container ${styles.processLayout}`}><div><h2>VA Loan in 4 Simple Steps</h2><p>We handle the details so you can focus on your next move.</p><ol className={styles.steps}>{steps.map(([icon,title,copy],index)=><li key={title}><div className={styles.iconCircle}><LoanIcon kind={icon}/></div><span className={styles.stepNumber}>{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></div><aside className={styles.eligibility} aria-labelledby="va-eligibility-title"><h2 id="va-eligibility-title">VA Loan Eligibility</h2><ul><li>Confirm your Certificate of Eligibility (COE)</li><li>Meet qualifying service requirements</li><li>Meet VA and lender credit and income standards</li><li>Plan to use the home as your primary residence</li></ul><VALoanCta href="/contact-lender" id="va_eligibility" className={styles.whiteButton}>Check Your Eligibility <span aria-hidden="true">›</span></VALoanCta></aside></div></section>
    <section className={`steph-container ${styles.resources}`} aria-labelledby="va-resources-title"><header className="steph-heading"><h2 id="va-resources-title">VA Loan Resources</h2><p>Helpful guides and tools to make informed decisions.</p></header><div className={styles.resourceGrid}>
      <article><div className={styles.cardImage}><Image src="/images/redesign/va-resource-guide.png" fill sizes="(max-width:767px) 90vw, 25vw" alt="Paperwork for a home purchase"/><span>GUIDE</span></div><div className={styles.cardCopy}><h3>VA Loan Guide</h3><p>Learn how your VA loan benefit can work for you.</p><LeadCaptureDialog kind="va-guide" triggerLabel="Get Your Free Guide" className={styles.cardLink}/></div></article>
      <article><div className={styles.cardImage}><Image src="/images/redesign/va-resource-calculator.png" fill sizes="(max-width:767px) 90vw, 25vw" alt="Planning a home loan payment"/><span>CALCULATOR</span></div><div className={styles.cardCopy}><h3>VA Loan Calculator</h3><p>Estimate payments and explore what you can afford.</p><VALoanCta href="/va-loan-calculator" id="va_resource_calculator" intent="calculator_navigation" className={styles.cardLink}>Calculate Now <span aria-hidden="true">›</span></VALoanCta></div></article>
      <article><div className={styles.cardImage}><Image src="/images/redesign/va-resource-moving.png" fill sizes="(max-width:767px) 90vw, 25vw" alt="Preparing for a move into a new home"/><span>GUIDE</span></div><div className={styles.cardCopy}><h3>Home Buying Guide</h3><p>Move through your first VA home purchase step by step.</p><VALoanCta href="/blog/complete-guide-to-buying-your-first-home-with-a-va-loan" id="va_resource_buying" intent="blog_navigation" className={styles.cardLink}>Read Guide <span aria-hidden="true">›</span></VALoanCta></div></article>
      <article><div className={styles.cardImage}><Image src="/images/redesign/va-resource-family.png" fill sizes="(max-width:767px) 90vw, 25vw" alt="Military family outside a home"/><span>GUIDE</span></div><div className={styles.cardCopy}><h3>VA Loan Eligibility</h3><p>Explore service requirements and common eligibility questions.</p><VALoanCta href="/blog/va-loan-eligibility-requirements-how-to-know-if-you-qualify-for-the-va-loan" id="va_resource_eligibility" intent="blog_navigation" className={styles.cardLink}>Read Guide <span aria-hidden="true">›</span></VALoanCta></div></article>
    </div></section>
    <section className={`steph-container ${styles.contactPanel}`}><div className={styles.questionPanel}><h2>Have Questions About VA Loans?</h2><p>Our VA loan experts are here to help you every step of the way. Ask a question and get a personalized answer.</p><QuestionForm/></div><aside className={styles.contactOptions}><h2>Talk to a VA Loan Expert</h2><p>Prefer to speak with someone now? Connect with our trusted lending partners.</p><VALoanCta href="tel:7197825065" id="va_contact_phone" intent="contact_phone" className={styles.contactCard}><span className={styles.contactIcon} aria-hidden="true">☎</span><span>Call Us<strong>719-782-5065</strong></span><span aria-hidden="true">›</span></VALoanCta><VALoanCta href="/contact" id="va_contact_callback" className={styles.contactCard}><span className={styles.contactIcon} aria-hidden="true"><LoanIcon kind="calendar" size={28}/></span><span>Request a Call<small>Connect with a VA loan expert.</small></span><span aria-hidden="true">›</span></VALoanCta><VALoanCta href="mailto:info@veteranpcs.com" id="va_contact_email" intent="contact_email" className={styles.emailLink}>info@veteranpcs.com</VALoanCta></aside></section>
    <section className={`steph-container ${styles.finalCta}`}><div><h2>Ready to Take the Next Step?</h2><p>Get pre-approved and start your journey home.</p></div><div><VALoanCta href="/contact-lender" id="va_final_preapproval">Get Pre-Approved <span aria-hidden="true">›</span></VALoanCta><small>Our matching service is 100% FREE for military families.</small></div></section>
  </main>;
}
