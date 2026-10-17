'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

const iconAssets = {
    taxFree: [22, 30.48, 30.48], year: [23, 30.48, 30.48], official: [24, 30.48, 30.48],
    star: [25, 35.48, 33.75], house: [26, 66.04, 66.04], clipboard: [27, 30.64, 43.56],
    bonus: [28, 37.96, 34.26], check: [29, 28.99, 28.91],
} as const;

function Icon({ kind }: { kind: keyof typeof iconAssets }) {
    const [asset, width, height] = iconAssets[kind];
    return <Image src={`/images/steph/vet-675/bah/asset-${asset}.svg`} width={width} height={height} alt="" aria-hidden="true" />;
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
    const validHomePrice = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(homePrice.trim());
    const bonus = validHomePrice && Number.isFinite(price) && price > 0 ? calculateMovingBonus(price) : null;
    return <div className={`${styles.calculator} ${fullPage ? '' : styles.embedded}`} id="bah-calculator">
        <div className={styles.cards}>
            <section className={styles.formCard} aria-labelledby={`${id}-heading`}>
                <div className={styles.formHeading}><span className={styles.calculatorIcon}><Image src="/images/steph/vet-675/icons/calculator.svg" width={105.95} height={156.25} alt="" aria-hidden="true" /></span><div><h2 id={`${id}-heading`}>Let’s Calculate your BAH</h2><p>Provide your information below to see your {BAH_YEAR} BAH rate.</p></div></div>
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
                    <div className={styles.benefits}><div><span><Icon kind="taxFree" /></span><p>Tax free<br />Income</p></div><div><span><Icon kind="year" /></span><p>Updated<br />for {BAH_YEAR}</p></div><div><span><Icon kind="official" /></span><p>Official<br />Rates</p></div></div>
                </div>
            </section>
        </div>
        {fullPage && <section className={styles.meaning} aria-labelledby={`${id}-meaning`}>
            <div className={styles.meaningContent}><h2 id={`${id}-meaning`}>What does your BAH mean?</h2><div className={styles.meaningColumns}>
                <div className={styles.buyingPower}>
                    <span className={styles.homeIcon}><Icon kind="house" /></span><div className={styles.interpretationText}>
                    <label htmlFor={`${id}-price`}>Estimated Home Price</label>
                    <div className={styles.priceInput}><input id={`${id}-price`} type="text" inputMode="decimal" placeholder="e.g. 420,000" value={homePrice} onChange={event => setHomePrice(event.target.value)} /></div>
                    <p>Plan your home budget with BAH, income, debts, and loan details.</p>
                    <Link href="/va-loan-calculator">Open VA Loan Calculator <span aria-hidden="true">›</span></Link>
                </div></div>
                <div className={styles.bonus}><span className={styles.bonusIcon}><Icon kind="bonus" /></span><div className={styles.interpretationText}><h3>VeteranPCS Bonus</h3><strong className={bonus === null ? styles.bonusEmpty : undefined} aria-live="polite" data-testid="bah-bonus">{bonus === null ? 'Enter a home price' : money(bonus)}</strong><p><span className={styles.checkIcon}><Icon kind="check" /></span>Given back to you at closing when you buy or sell with us. <Link href="/how-it-works">See bonus details.</Link></p></div></div>
            </div></div>
            <aside className={styles.agentCta}><div><span><Icon kind="star" /></span><h3>Military Families helping<br />Military Families Move.</h3></div><Link className={styles.redButton} href="/contact-agent" onClick={() => captureAnalyticsEvent('calculator_cta_clicked', buildCtaProperties({ ctaId: 'bah_result_agent_cta', ctaIntent: 'contact_agent', ctaPosition: 'bah_interpretation', ctaComponent: 'bah_calculator', ctaLabel: 'Find a Veteran or Mil Spouse Agent', destination: '/contact-agent', pageType: 'calculator', calculatorId: 'bah_calculator', calculatorName: 'BAH Calculator', partnerType: 'agent' }))}>Find a Veteran or Mil Spouse Agent <span aria-hidden="true">›</span></Link><p>It’s free, fast and obligation-free.</p></aside>
        </section>}
    </div>;
}
