import posthog from 'posthog-js';

/**
 * Desktop-only A/B test of the agent contact page (PostHog flag `desktop-contact-agent-v2`).
 *
 * The page is statically prerendered, so the variant is applied as an attribute on the page's
 * own container and the layout is switched in CSS (components/ContactAgents/ContactAgentV2.module.css). The rule
 * that keeps the test honest: a layout is never switched after it has painted. If the variant
 * is not known before first paint the visitor gets the control page and no exposure is sent,
 * so they are counted in neither arm. See docs/analytics/telemetry-taxonomy.md.
 */
export const DESKTOP_CONTACT_AGENT_FLAG = 'desktop-contact-agent-v2';
export const CONTACT_AGENT_VARIANT_ATTRIBUTE = 'data-contact-agent-variant';
export const CONTACT_AGENT_VARIANT_CACHE_KEY = 'vpcs_exp_desktop_contact_agent_v2';
/** Keep in step with the @media condition in ContactAgentV2.module.css. */
export const DESKTOP_CONTACT_AGENT_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
export const CONTACT_AGENT_FORM_REGION_ID = 'contact-agent-form';

export type ContactAgentVariant = 'control' | 'test';
/** `unknown`: the variant was not available before first paint. Renders as control, unexposed. */
export type AppliedContactAgentVariant = ContactAgentVariant | 'unknown';

type FlagClient = {
  __loaded?: boolean;
  getFeatureFlag?: (key: string, options?: { send_event?: boolean }) => unknown;
  onFeatureFlags?: (callback: () => void) => unknown;
};

export function parseContactAgentVariant(value: unknown): ContactAgentVariant | null {
  return value === 'test' || value === 'control' ? value : null;
}

function isApplied(value: unknown): value is AppliedContactAgentVariant {
  return value === 'unknown' || parseContactAgentVariant(value) !== null;
}

/** The flag value the SDK holds right now, without sending an exposure event. */
function currentFlagVariant(client: FlagClient = posthog as unknown as FlagClient): ContactAgentVariant | null {
  try {
    if (!client.__loaded || typeof client.getFeatureFlag !== 'function') return null;
    return parseContactAgentVariant(client.getFeatureFlag(DESKTOP_CONTACT_AGENT_FLAG, { send_event: false }));
  } catch {
    return null;
  }
}

export function readCachedContactAgentVariant(): ContactAgentVariant | null {
  try {
    return parseContactAgentVariant(window.localStorage.getItem(CONTACT_AGENT_VARIANT_CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCachedContactAgentVariant(variant: ContactAgentVariant | null): void {
  try {
    if (variant) window.localStorage.setItem(CONTACT_AGENT_VARIANT_CACHE_KEY, variant);
    else window.localStorage.removeItem(CONTACT_AGENT_VARIANT_CACHE_KEY);
  } catch {
    // Storage is optional. Without it, hard loads fall back to control and stay unexposed.
  }
}

/**
 * Mirrors the flag into first-party storage whenever PostHog reports flags, so a later hard
 * load of the contact page can apply the variant before the SDK has started. Called once from
 * instrumentation-client.ts.
 */
export function syncContactAgentVariantCache(client: unknown): void {
  try {
    const sdk = client as FlagClient;
    if (typeof sdk?.onFeatureFlags !== 'function' || typeof sdk.getFeatureFlag !== 'function') return;
    sdk.onFeatureFlags(() => {
      try {
        writeCachedContactAgentVariant(parseContactAgentVariant(sdk.getFeatureFlag!(DESKTOP_CONTACT_AGENT_FLAG, { send_event: false })));
      } catch {
        // Never let experiment bookkeeping interfere with analytics start-up.
      }
    });
  } catch {
    // Same as above.
  }
}

/**
 * Inline script for the statically rendered page. It runs while the document is still being
 * parsed, before the form markup exists, so the first paint already has the right layout. It
 * does nothing on in-site navigations, where React applies the variant instead.
 */
export const CONTACT_AGENT_PREPAINT_SCRIPT = `(function(){try{var s=document.currentScript,c=s&&s.parentElement;if(!c||document.readyState!=='loading')return;var v=null;try{v=window.localStorage.getItem('${CONTACT_AGENT_VARIANT_CACHE_KEY}')}catch(e){}c.setAttribute('${CONTACT_AGENT_VARIANT_ATTRIBUTE}',v==='test'||v==='control'?v:'unknown')}catch(e){}})()`;

/**
 * Decides the variant for this view of the contact page. Must be called before paint, with
 * the page container the pre-paint script sits in.
 * - Hard load: the pre-paint script already marked the container. Keep it, whatever it says.
 * - In-site navigation: nothing has painted yet, so read the flag the SDK already holds.
 */
export function resolveContactAgentVariant(container: Element | null): AppliedContactAgentVariant {
  const painted = container?.getAttribute(CONTACT_AGENT_VARIANT_ATTRIBUTE);
  if (isApplied(painted)) return painted;
  return currentFlagVariant() ?? 'unknown';
}

export function isDesktopContactAgentDevice(): boolean {
  try {
    return window.matchMedia(DESKTOP_CONTACT_AGENT_MEDIA).matches;
  } catch {
    return false;
  }
}

/**
 * Sends the experiment exposure (`$feature_flag_called`) at most once for this view, and only
 * when all of these hold: the variant was applied before paint, the device is desktop-class,
 * and PostHog's current assignment matches what the visitor is actually looking at. A stale
 * cached value therefore shows a page but never counts.
 * Returns a function that stops waiting for flags.
 */
export function recordContactAgentExposure(applied: AppliedContactAgentVariant): () => void {
  const noop = () => {};
  if (applied === 'unknown' || !isDesktopContactAgentDevice()) return noop;
  try {
    const sdk = posthog as unknown as FlagClient;
    if (!sdk.__loaded || typeof sdk.onFeatureFlags !== 'function') return noop;
    let sent = false;
    const stop = sdk.onFeatureFlags(() => {
      if (sent || currentFlagVariant() !== applied) return;
      sent = true;
      sdk.getFeatureFlag?.(DESKTOP_CONTACT_AGENT_FLAG);
    });
    return typeof stop === 'function' ? (stop as () => void) : noop;
  } catch {
    return noop;
  }
}

/* ---- Selected-agent hand-off from a state page card to the contact page ---- */

const SELECTED_AGENT_KEY = 'vpcs_selected_agent';
const AGENT_PHOTO_PATH = /^\/images\/agents\/[A-Za-z0-9]+\.webp$/;

/** Public listing details of the agent whose card was clicked. Never visitor data. */
export type SelectedAgent = {
  id: string;
  name: string;
  photo: string | null;
  service: string | null;
  brokerage: string | null;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function toSelectedAgent(value: unknown): SelectedAgent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = cleanText(raw.id, 40);
  const name = cleanText(raw.name, 80);
  if (!id || !name) return null;
  const photo = typeof raw.photo === 'string' && AGENT_PHOTO_PATH.test(raw.photo) ? raw.photo : null;
  return { id, name, photo, service: cleanText(raw.service, 120), brokerage: cleanText(raw.brokerage, 120) };
}

export function rememberSelectedAgent(agent: { id?: string | null; name?: string | null; photo?: string | null; service?: string | null; brokerage?: string | null }): void {
  try {
    const selected = toSelectedAgent(agent);
    if (selected) window.sessionStorage.setItem(SELECTED_AGENT_KEY, JSON.stringify(selected));
  } catch {
    // Optional: without it the contact page falls back to the first name in the URL.
  }
}

/** Returns the remembered agent only when it is the one named in the contact URL. */
export function readSelectedAgent(id: string | null | undefined): SelectedAgent | null {
  if (!id) return null;
  try {
    const stored = window.sessionStorage.getItem(SELECTED_AGENT_KEY);
    const selected = stored ? toSelectedAgent(JSON.parse(stored)) : null;
    return selected && selected.id === id ? selected : null;
  } catch {
    return null;
  }
}
