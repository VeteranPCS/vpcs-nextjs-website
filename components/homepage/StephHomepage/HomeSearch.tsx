'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { US_STATES } from '@/constants/usStates';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import type { LocationSearchResult } from '@/lib/location-search/types';
import HomeCta from './HomeCta';
import styles from './StephHomepage.module.css';

const popular = ['San Diego, CA', 'Virginia Beach, VA', 'Tampa, FL', 'Colorado Springs, CO'];
const tabs = ['Find an Agent', 'Browse by State', 'Browse Resources'] as const;
export default function HomeSearch({ guide }: { guide: React.ReactNode }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Find an Agent');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [result, setResult] = useState<LocationSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { requestId.current++; pendingRequest.current?.abort(); }, []);
  function invalidateSearch() {
    requestId.current++;
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setLoading(false);
    setResult(null);
  }
  function selectTab(name: (typeof tabs)[number]) {
    if (name === tab) return;
    invalidateSearch();
    setTab(name);
  }
  async function search(value = query, hint = state) {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    const id = ++requestId.current;
    setLoading(true); setResult(null);
    try {
      const params = new URLSearchParams({ query: value });
      if (hint) params.set('state', hint);
      const response = await fetch(`/api/v1/location-search?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Search unavailable');
      const data: LocationSearchResult = await response.json();
      if (id !== requestId.current) return;
      setResult(data);
      if (data.outcome === 'resolved') {
        trackCtaClicked(buildCtaProperties({ ctaId: 'homepage_location_search', ctaIntent: 'state_page', ctaPosition: 'hero_search', ctaComponent: 'steph_homepage_search', ctaLabel: 'Find an Agent', destination: data.href, pageType: 'homepage', stateSlug: data.stateSlug }));
        router.push(data.href);
      }
    } catch {
      if (id === requestId.current) setResult({ outcome: 'not_found', message: 'Search is unavailable right now. Please try again or browse by state.' });
    } finally { if (id === requestId.current) setLoading(false); }
  }
  return <div className={styles.searchCard}>
    <div className={styles.tabs} role="tablist" aria-label="Find your next home">
      {tabs.map((name, index) => <button key={name} role="tab" id={`home-tab-${index}`} aria-controls={`home-panel-${index}`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} onClick={() => selectTab(name)} onKeyDown={(event) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        const nextTab = tabs[next]; if (nextTab) selectTab(nextTab);
        document.getElementById(`home-tab-${next}`)?.focus();
      }}><Image src={index === 0 ? '/icon/Agents.svg' : index === 1 ? '/icon/Mission.svg' : '/icon/Resources.svg'} width={24} height={24} alt="" />{name}</button>)}
    </div>
    <div className={styles.searchBody}>
      <div role="tabpanel" id={`home-panel-${tabs.indexOf(tab)}`} aria-labelledby={`home-tab-${tabs.indexOf(tab)}`} className={styles.searchMain}>
        {tab === 'Find an Agent' && <><form onSubmit={(event) => { event.preventDefault(); void search(); }}>
          <label className={styles.searchInput}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><span className={styles.srOnly}>City, state, base, or ZIP code</span><input value={query} onChange={(event) => { invalidateSearch(); setQuery(event.target.value); setState(''); setResult(null); }} placeholder="Enter city or state" required maxLength={120} /></label>
          <button className={styles.button} disabled={loading}>{loading ? 'Searching…' : 'Find an Agent'}</button>
          {result?.outcome === 'needs_state' && <label className={styles.stateClarification}>Choose a state<select value={state} onChange={(event) => setState(event.target.value)} required><option value="">Select a state</option>{(result.states.length ? result.states : US_STATES).map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label>}
        </form><p className={styles.popular}><strong>Popular Searches:</strong> {popular.map((city) => <button key={city} onClick={() => { setQuery(city); setState(''); void search(city, ''); }}>{city}</button>)}</p></>}
        {tab === 'Browse by State' && <div className={styles.tabLinks}><p>Find military-friendly agents and VA loan experts in your destination state.</p><HomeCta href="#state-map" id="homepage_browse_map" intent="state_map">Choose your state</HomeCta></div>}
        {tab === 'Browse Resources' && <div className={styles.resourceLinks}><HomeCta href="/pcs-resources" id="homepage_resources" intent="resources_navigation">PCS Resources</HomeCta><HomeCta href="/pcs-resources#move-in-bonus" id="homepage_bonus_resource" intent="resources_navigation">Move-In Bonus Calculator</HomeCta><HomeCta href="/va-loan-help" id="homepage_va_resource" intent="resources_navigation">VA Loan Guide</HomeCta></div>}
        {result && result.outcome !== 'resolved' && <p role="status" className={styles.searchStatus}>{result.message}</p>}
      </div><div className={styles.searchGuide}>{guide}</div>
    </div>
  </div>;
}
