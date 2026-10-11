import BAHCalculator from '@/components/BAHCalculator';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BAH_YEAR } from '@/lib/bah/year';
import styles from './page.module.css';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://veteranpcs.com';
const META_TITLE = `${BAH_YEAR} BAH Calculator - Military Housing Allowance Calculator`;
const META_DESCRIPTION = `Calculate your ${BAH_YEAR} Basic Allowance for Housing (BAH). Enter your pay grade, dependent status, and duty station ZIP code to see monthly and annual amounts.`;
export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL), title: META_TITLE, description: META_DESCRIPTION,
    alternates: { canonical: '/bah-calculator' },
    keywords: ['BAH calculator', 'Basic Allowance for Housing', `${BAH_YEAR} BAH rates`, 'BAH rates by ZIP code'],
    openGraph: { type: 'website', locale: 'en_US', url: '/bah-calculator', siteName: 'VeteranPCS', title: META_TITLE, description: META_DESCRIPTION, images: [{ url: '/opengraph/og-logo.png', width: 1200, height: 630, alt: 'VeteranPCS BAH Calculator' }] },
    twitter: { card: 'summary_large_image', title: META_TITLE, description: META_DESCRIPTION, images: ['/opengraph/og-logo.png'] },
};

const tools = [
    { title: 'PCS Checklists', description: 'Check out our PCS checklists', href: '/blog/the-ultimate-pcs-checklist-and-timeline-for-active-duty-military-personnel', icon: 'clipboard' },
    { title: 'VA Loan Calculator', description: 'Estimate your VA loan payment and buying power', href: '/va-loan-calculator', icon: 'house' },
    { title: 'First Time Home Buyer Guide', description: 'Step-by-step guidance for military buyers', href: '/guides#homebuyer-guide', icon: 'check' },
];

export default function BAHPage() {
    return <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="bah-page-title"><div className={styles.container}>
            <h1 id="bah-page-title">{BAH_YEAR} Basic Allowance For Housing (BAH)</h1><p className={styles.subtitle}>Know your BAH before your next PCS.</p>
            <BAHCalculator fullPage />
        </div></section>
        <section className={`${styles.tools} ${styles.container}`} aria-labelledby="bah-tools-title">
            <div className={styles.star} aria-hidden="true">★</div><h2 id="bah-tools-title">Other Helpful Tools</h2>
            <div className={styles.toolGrid}>{tools.map(tool => <Link className={styles.toolCard} href={tool.href} key={tool.href}><span className={styles.toolIcon} aria-hidden="true">{tool.icon === 'check' ? <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" fill="currentColor" /><path d="m14 24 7 7 14-17" fill="none" stroke="white" strokeWidth="4" /></svg> : <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">{tool.icon === 'house' ? <path d="M3 22 24 5l21 17M9 20v24h12V30h8v14h10V20M34 6v10" /> : <><rect x="8" y="8" width="32" height="37" rx="3" /><path d="M17 8V3h14v5M16 19h16M16 27h16M16 35h16" /></>}</svg>}</span><div><h3>{tool.title}</h3><p>{tool.description}</p></div><span className={styles.chevron} aria-hidden="true">›</span></Link>)}</div>
        </section>
    </div>;
}
