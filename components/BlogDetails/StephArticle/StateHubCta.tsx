'use client';

import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import { useId, useRef, useState } from 'react';
import { US_STATES } from '@/constants/usStates';
import { trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { useFeatureFlagVariant } from '@/lib/analytics/useFeatureFlagVariant';
import {
  BLOG_STATE_HUB_CTA_FLAG,
  BLOG_STATE_HUB_CTA_ID,
  buildStateHubHref,
  isStateHubCtaVariant,
  type StateHubCtaAudience,
  type StateHubCtaPlacement,
} from '@/lib/blog/stateHubCta';
import styles from './StephArticle.module.css';

type Props = {
  placement: StateHubCtaPlacement;
  /** The state the post is about, or null to let the reader pick one. */
  stateSlug: string | null;
  stateName: string | null;
  contentSlug: string;
  partnerType: 'agent' | 'lender';
  audience: StateHubCtaAudience;
};

const POSITIONS: Record<StateHubCtaPlacement, string> = {
  inline: 'inline_after_intro',
  end: 'article_end',
};

function copyFor(placement: StateHubCtaPlacement, audience: StateHubCtaAudience, stateName: string) {
  if (placement === 'end') {
    return {
      heading: `Ready to find your ${stateName} agent?`,
      line: `Browse vetted agents in ${stateName}. Get up to $4,000 back when you close on a home with a VeteranPCS agent.`,
      button: `See ${stateName} agents`,
    };
  }
  if (audience === 'buying') {
    return {
      heading: `Buying or selling in ${stateName}?`,
      line: `Meet veteran and military-spouse agents and VA loan experts in ${stateName}. Free to use.`,
      button: `Find an agent in ${stateName}`,
    };
  }
  return {
    heading: `Moving to ${stateName}?`,
    line: `Meet veteran and military-spouse agents who know ${stateName}. Free to use.`,
    button: `Find an agent in ${stateName}`,
  };
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 29s9-8.5 9-16a9 9 0 1 0-18 0c0 7.5 9 16 9 16ZM16 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    </svg>
  );
}

/**
 * Sends blog readers to the matching state hub page. Shown only to the variant
 * of the `blog-state-hub-cta` experiment; control and unloaded flags render nothing.
 */
export default function StateHubCta({ placement, stateSlug, stateName, contentSlug, partnerType, audience }: Props) {
  const variant = useFeatureFlagVariant(BLOG_STATE_HUB_CTA_FLAG);
  const selectId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [pickedSlug, setPickedSlug] = useState('');
  const [needsState, setNeedsState] = useState(false);

  if (!isStateHubCtaVariant(variant)) return null;

  const track = (targetSlug: string, label: string, stateSource: 'post' | 'picker') => {
    const destination = buildStateHubHref(targetSlug, contentSlug);
    trackCtaClicked({
      ...buildCtaProperties({
        ctaId: BLOG_STATE_HUB_CTA_ID,
        ctaIntent: 'state_agent_search',
        ctaPosition: POSITIONS[placement],
        ctaComponent: BLOG_STATE_HUB_CTA_ID,
        ctaLabel: label,
        destination,
        pageType: 'blog_post',
        contentType: 'blog_post',
        contentSlug,
        stateSlug: targetSlug,
        partnerType,
      }),
      placement,
      state_source: stateSource,
    });
    sendGTMEvent({ event: 'blog_to_state_cta_click', state: targetSlug, blog_slug: contentSlug, position: placement });
  };

  if (stateSlug && stateName) {
    const copy = copyFor(placement, audience, stateName);
    return (
      <section className={styles.stateHub} aria-label={`Find an agent in ${stateName}`} data-cta-id={BLOG_STATE_HUB_CTA_ID} data-placement={placement}>
        <PinIcon />
        <div>
          <h2>{copy.heading}</h2>
          <p>{copy.line}</p>
        </div>
        <Link href={buildStateHubHref(stateSlug, contentSlug)} className={styles.stateHubButton} onClick={() => track(stateSlug, copy.button, 'post')}>
          {copy.button}
        </Link>
      </section>
    );
  }

  const picked = US_STATES.find((state) => state.slug === pickedSlug);
  return (
    <section className={styles.stateHub} aria-label="Find an agent in your next state" data-cta-id={BLOG_STATE_HUB_CTA_ID} data-placement={placement}>
      <PinIcon />
      <div>
        <h2>{placement === 'end' ? 'Ready to find your agent?' : 'Where are you PCSing?'}</h2>
        <p>Pick a state to see veteran and military-spouse agents there.</p>
      </div>
      <div className={styles.stateHubPicker}>
        <label htmlFor={selectId} className={styles.srOnly}>State</label>
        <select
          id={selectId}
          ref={selectRef}
          value={pickedSlug}
          aria-describedby={needsState ? `${selectId}-hint` : undefined}
          onChange={(event) => { setPickedSlug(event.target.value); setNeedsState(false); }}
        >
          <option value="">Choose a state</option>
          {US_STATES.map((state) => <option key={state.slug} value={state.slug}>{state.name}</option>)}
        </select>
        {picked ? (
          <Link href={buildStateHubHref(picked.slug, contentSlug)} className={styles.stateHubButton} onClick={() => track(picked.slug, `See ${picked.name} agents`, 'picker')}>
            See {picked.name} agents
          </Link>
        ) : (
          <button type="button" className={styles.stateHubButton} onClick={() => { setNeedsState(true); selectRef.current?.focus(); }}>
            See agents
          </button>
        )}
        {needsState && <small id={`${selectId}-hint`} role="status">Choose a state first.</small>}
      </div>
    </section>
  );
}
