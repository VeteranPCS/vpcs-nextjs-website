'use client';

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { captureAnalyticsEvent } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { SAME_PAGE_CONTACT_CTA_EVENT, type SamePageContactCtaDetail } from '@/lib/contactAgentUrl';
import {
  CONTACT_AGENT_FORM_REGION_ID,
  isDesktopContactAgentDevice,
  recordContactAgentExposure,
  resolveContactAgentVariant,
  type AppliedContactAgentVariant,
} from '@/lib/experiments/desktop-contact-agent';

const HIGHLIGHT_MS = 1600;

/**
 * Brings the form into view after the header "Find an Agent" button is clicked on this page.
 *
 * Keyboard focus moves to the region that WRAPS the form, never to anything inside it:
 * `form_started` is fired by the form's onFocus, so focusing a field from code would count a
 * form start the visitor never made and corrupt the experiment's primary metric.
 * Returns false when it did nothing.
 */
export function revealContactAgentForm(region: HTMLElement): boolean {
  if (region.closest('form') || region.tagName === 'FORM') return false;
  const header = document.querySelector('[data-site-header]');
  const clearance = (header?.getBoundingClientRect().bottom ?? 0) + 24;
  const top = Math.max(0, region.getBoundingClientRect().top + window.scrollY - clearance);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });

  region.tabIndex = -1;
  region.addEventListener('blur', () => region.removeAttribute('tabindex'), { once: true });
  region.focus({ preventScroll: true });

  region.setAttribute('data-highlight', 'true');
  window.setTimeout(() => region.removeAttribute('data-highlight'), HIGHLIGHT_MS);
  return true;
}

/**
 * Resolves the desktop-contact-agent-v2 variant for this view of the page and, in the test
 * variant on a desktop-class device, takes over same-page header "Find an Agent" clicks.
 * The caller renders the result as the container's data-contact-agent-variant attribute.
 * Returns null until resolved, which always happens before first paint on the client.
 */
export function useDesktopContactAgentVariant(container: RefObject<Element | null>): AppliedContactAgentVariant | null {
  const [variant, setVariant] = useState<AppliedContactAgentVariant | null>(null);

  useLayoutEffect(() => {
    const applied = resolveContactAgentVariant(container.current);
    setVariant(applied);
    return recordContactAgentExposure(applied);
  }, [container]);

  useEffect(() => {
    if (variant !== 'test') return;
    const onSamePageCta = (event: Event) => {
      const detail = (event as CustomEvent<SamePageContactCtaDetail>).detail;
      if (!detail?.ctaId?.startsWith('header_') || !isDesktopContactAgentDevice()) return;
      const region = document.getElementById(CONTACT_AGENT_FORM_REGION_ID);
      if (!region || !revealContactAgentForm(region)) return;
      // Tell the link the click was handled, so it skips its default return to the top.
      event.preventDefault();
      // Captured directly rather than through trackCtaClicked: the header link has already
      // counted this click, and counting it twice would inflate the lead's CTA click total.
      captureAnalyticsEvent('cta_clicked', buildCtaProperties({
        ctaId: 'contact_agent_header_scroll',
        ctaIntent: 'contact_agent',
        ctaPosition: 'contact_agent_form',
        ctaComponent: 'contact_agent_page',
        destination: '/contact-agent',
        partnerType: 'agent',
      }));
    };
    window.addEventListener(SAME_PAGE_CONTACT_CTA_EVENT, onSamePageCta);
    return () => window.removeEventListener(SAME_PAGE_CONTACT_CTA_EVENT, onSamePageCta);
  }, [variant]);

  return variant;
}
