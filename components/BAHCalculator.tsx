'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import type { BAHData } from '@/lib/bah-scraper';
import { BAH_API_YEAR, BAH_YEAR } from '@/lib/bah/year';
import { calculateMovingBonus } from '@/lib/bonus/calculate';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { zipPrefix } from '@/lib/analytics/sanitizer';
import { buildCtaProperties } from '@/lib/analytics/cta';
import styles from './BAHCalculator.module.css';

const ranks = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'W-1', 'W-2', 'W-3', 'W-4', 'W-5', 'O1E', 'O2E', 'O3E', 'O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'O-7/O-7+'];
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
interface Snapshot { zipCode: string; rank: string; dependents: boolean }
interface Result { data: BAHData; submitted: Snapshot }
interface ApiResponse { success: boolean; data?: BAHData; error?: string }

function Icon({ kind = 'calculator' }: { kind?: 'calculator' | 'house' | 'shield' | 'check' | 'star' | 'clipboard' }) {
    return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        {kind === 'calculator' && <><rect x="11" y="3" width="26" height="42" rx="3" /><path d="M16 9h16v7H16zM16 23h4m5 0h4m-13 8h4m5 0h4m-13 8h4m5 0h4M33 23v16" /></>}
        {kind === 'clipboard' && <><rect x="9" y="8" width="30" height="37" rx="3" /><path d="M17 8V3h14v5M16 19h16M16 26h16M16 33h16M16 40h16" /></>}
        {kind === 'house' && <><path d="M3 22 24 5l21 17M9 20v24h12V30h8v14h10V20" /><path d="M34 6v10" /></>}
        {kind === 'shield' && <path d="M24 3c6 5 12 6 18 7v14c0 10-8 17-18 21C14 41 6 34 6 24V10c6-1 12-2 18-7Z" />}
        {kind === 'check' && <><circle cx="24" cy="24" r="21" fill="currentColor" /><path d="m14 24 7 7 13-16" stroke="white" strokeWidth="4" /></>}
        {kind === 'star' && <path d="m24 3 5 15h16L32 28l5 16-13-10-13 10 5-16L3 18h16Z" />}
    </svg>;
}

export default function BAHCalculator({ fullPage = false }: { fullPage?: boolean }) {
    const id = useId();
    const [form, setForm] = useState<Snapshot>({ zipCode: '', rank: '', dependents: false });
    const [result, setResult] = useState<Result | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ rank?: string; zipCode?: string }>({});
    const [homePrice, setHomePrice] = useState('');
    const request = useRef<{ sequence: number; controller: AbortController | null; busy: boolean }>({ sequence: 0, controller: null, busy: false });
    const resultRef = useRef<HTMLDivElement>(null);
    const rankRef = useRef<HTMLSelectElement>(null);
    const zipRef = useRef<HTMLInputElement>(null);

    useEffect(() => () => { request.current.sequence += 1; request.current.controller?.abort(); }, []);

    function updateLookup(field: 'rank' | 'zipCode', value: string) {
        request.current.sequence += 1;
        request.current.controller?.abort();
        request.current.busy = false;
        setLoading(false);
        setResult(null);
        setError(null);
        setFieldErrors({});
        setForm(previous => ({ ...previous, [field]: value }));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (request.current.busy) return;
        const errors = {
            ...(!ranks[Number(form.rank) - 1] && { rank: 'Select your pay grade.' }),
            ...(!/^\d{5}$/.test(form.zipCode) && { zipCode: 'Enter a 5-digit duty station ZIP code.' }),
        };
        setFieldErrors(errors);
        if (errors.rank || errors.zipCode) {
            if (errors.rank) rankRef.current?.focus(); else zipRef.current?.focus();
            return;
        }
        const submitted = { ...form };
        const sequence = ++request.current.sequence;
        const controller = new AbortController();
        request.current.controller?.abort();
        request.current.controller = controller;
        request.current.busy = true;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const response = await fetch('/api/v1/bah', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zipCode: submitted.zipCode, rank: submitted.rank, year: BAH_API_YEAR }),
                signal: controller.signal,
            });
            const payload: ApiResponse = await response.json();
            if (sequence !== request.current.sequence) return;
            if (!response.ok || !payload.success || !payload.data) {
                setError(payload.error || 'We couldn’t find that BAH rate. Check your ZIP code and try again.');
                return;
            }
            const data = payload.data;
            if (!data.isValid || Number(data.year.length === 2 ? `20${data.year}` : data.year) !== BAH_YEAR || data.zipCode !== submitted.zipCode || !Number.isFinite(data.withDependents) || !Number.isFinite(data.withoutDependents)) {
                setError('BAH rates are unavailable for that ZIP code. Check your duty station ZIP code and try again.');
                return;
            }
            setResult({ data, submitted });
            sendGTMEvent({ event: 'bah_calculator_use', bah_zip_prefix: zipPrefix(submitted.zipCode), bah_paygrade: ranks[Number(submitted.rank) - 1] });
            captureAnalyticsEvent('bah_calculator_used', {
                zip_prefix: zipPrefix(submitted.zipCode),
                paygrade: ranks[Number(submitted.rank) - 1],
                dependents: submitted.dependents,
                year: BAH_YEAR.toString(),
                mha: data.mha,
            });
            resultRef.current?.focus();
        } catch {
            if (sequence !== request.current.sequence || controller.signal.aborted) return;
            setError('We couldn’t calculate your BAH. Please try again.');
        } finally {
            if (sequence === request.current.sequence) { request.current.busy = false; setLoading(false); }
        }
    }

    const monthly = result ? (form.dependents ? result.data.withDependents : result.data.withoutDependents) : null;
    const price = Number(homePrice.replaceAll(',', ''));
    const bonus = homePrice && Number.isFinite(price) && price > 0 ? calculateMovingBonus(price) : null;
    return <div className={`${styles.calculator} ${fullPage ? '' : styles.embedded}`} id="bah-calculator">
        <div className={styles.cards}>
            <section className={styles.formCard} aria-labelledby={`${id}-heading`}>
                <div className={styles.formHeading}><span className={styles.calculatorIcon}><Icon /></span><div><h2 id={`${id}-heading`}>Let’s Calculate your BAH</h2><p>Provide your information below to see your {BAH_YEAR} BAH rate.</p></div></div>
                <form onSubmit={submit} noValidate>
                    <div className={styles.inputRow}>
                        <div><label htmlFor={`${id}-rank`}>Pay Grade</label><select ref={rankRef} id={`${id}-rank`} value={form.rank} onChange={event => updateLookup('rank', event.target.value)} aria-invalid={!!fieldErrors.rank} aria-describedby={fieldErrors.rank ? `${id}-rank-error` : undefined}><option value="">Select</option>{ranks.map((rank, index) => <option key={rank} value={String(index + 1)}>{rank}</option>)}</select>{fieldErrors.rank && <p className={styles.fieldError} id={`${id}-rank-error`}>{fieldErrors.rank}</p>}</div>
                        <div><label htmlFor={`${id}-dependents`}>Dependents</label><select id={`${id}-dependents`} value={form.dependents ? 'yes' : 'no'} onChange={event => setForm(previous => ({ ...previous, dependents: event.target.value === 'yes' }))}><option value="no">No</option><option value="yes">Yes</option></select></div>
                    </div>
                    <div className={styles.zipField}><label htmlFor={`${id}-zip`}>Duty Station ZIP Code</label><input ref={zipRef} id={`${id}-zip`} inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="e.g. 48329" value={form.zipCode} onChange={event => updateLookup('zipCode', event.target.value.replace(/[^0-9]/g, '').slice(0, 5))} aria-invalid={!!fieldErrors.zipCode} aria-describedby={fieldErrors.zipCode ? `${id}-zip-error` : undefined} />{fieldErrors.zipCode && <p className={styles.fieldError} id={`${id}-zip-error`}>{fieldErrors.zipCode}</p>}</div>
                    <button className={styles.redButton} type="submit" disabled={loading}>{loading ? 'Calculating…' : 'Calculate My BAH'}<span aria-hidden="true">›</span></button>
                    <p className={styles.privacy}><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 7V4a4 4 0 0 1 8 0v3h1v9H3V7h1Zm2 0h4V4a2 2 0 0 0-4 0v3Z" /></svg>Your information is secure and never sold.</p>
                </form>
            </section>
            <section className={styles.resultCard} aria-labelledby={`${id}-result-title`}>
                <h2 id={`${id}-result-title`}>Your {BAH_YEAR} BAH</h2>
                <div className={styles.resultBody} aria-live="polite" aria-busy={loading} ref={resultRef} tabIndex={-1}>
                    {loading ? <div className={styles.empty}><span className={styles.spinner} aria-hidden="true" /><h3>Calculating your BAH</h3><p>Looking up {BAH_YEAR} rates for your duty station.</p></div> : error ? <div className={styles.empty}><h3>Let’s try that again</h3><p role="alert">{error}</p><p>Review your information, then select Calculate My BAH to retry.</p></div> : result && monthly !== null ? <>
                        <p className={styles.resultContext}>{result.data.mha}<br />{ranks[Number(result.submitted.rank) - 1]} · ZIP {result.submitted.zipCode} · {form.dependents ? 'With dependents' : 'Without dependents'}</p>
                        <p className={styles.monthlyLabel}>Monthly BAH</p><p className={styles.monthly} data-testid="bah-monthly">{money(monthly)}</p>
                        <div className={styles.annual}><p>Annual Housing Allowance</p><strong data-testid="bah-annual">{money(monthly * 12)}</strong></div>
                    </> : <div className={styles.empty}><span className={styles.emptyIcon}><Icon kind="house" /></span><h3>Plan your next PCS</h3><p>Enter your pay grade, dependent status, and duty station ZIP code to see your monthly and annual allowance.</p></div>}
                    <div className={styles.benefits}><div><span><Icon kind="house" /></span><p>Tax free<br />Income</p></div><div><span><Icon kind="clipboard" /></span><p>Updated<br />for {BAH_YEAR}</p></div><div><span><Icon kind="shield" /></span><p>Official<br />Rates</p></div></div>
                </div>
            </section>
        </div>
        {fullPage && <section className={styles.meaning} aria-labelledby={`${id}-meaning`}>
            <div className={styles.meaningContent}><h2 id={`${id}-meaning`}>What does your BAH mean?</h2><div className={styles.meaningColumns}>
                <div className={styles.buyingPower}><span className={styles.largeIcon}><Icon kind="house" /></span><div><h3>Explore your buying power</h3><p>Use your BAH alongside your income, debts, and loan details to plan your home budget.</p><Link href="/va-loan-calculator">Open VA Loan Calculator <span aria-hidden="true">›</span></Link></div></div>
                <div className={styles.bonus}><h3>VeteranPCS Bonus</h3><label htmlFor={`${id}-price`}>Planned home price</label><input id={`${id}-price`} type="text" inputMode="decimal" placeholder="e.g. 420000" value={homePrice} onChange={event => setHomePrice(event.target.value.replace(/[^0-9.,]/g, ''))} /><strong aria-live="polite" data-testid="bah-bonus">{bonus === null ? 'Enter a home price' : money(bonus)}</strong><p>Given back to you at closing when you buy or sell with us. <Link href="/how-it-works">See bonus details.</Link></p></div>
            </div></div>
            <aside className={styles.agentCta}><div><span><Icon kind="star" /></span><h3>Military Families helping<br />Military Families Move.</h3></div><Link className={styles.redButton} href="/contact-agent" onClick={() => captureAnalyticsEvent('calculator_cta_clicked', buildCtaProperties({ ctaId: 'bah_result_agent_cta', ctaIntent: 'contact_agent', ctaPosition: 'bah_interpretation', ctaComponent: 'bah_calculator', ctaLabel: 'Find a Veteran or Mil Spouse Agent', destination: '/contact-agent', pageType: 'calculator', calculatorId: 'bah_calculator', calculatorName: 'BAH Calculator', partnerType: 'agent' }))}>Find a Veteran or Mil Spouse Agent <span aria-hidden="true">›</span></Link><p>It’s free, fast and obligation-free.</p></aside>
        </section>}
    </div>;
}
