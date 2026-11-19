import posthog from 'posthog-js';

export const DESKTOP_CONTACT_AGENT_FLAG = 'desktop-contact-agent-v2';
export const CONTACT_AGENT_VARIANT_ATTRIBUTE = 'data-contact-agent-variant';
/** Keep in step with the @media condition in ContactAgentV2.module.css. */
export const DESKTOP_CONTACT_AGENT_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
export const CONTACT_AGENT_FORM_REGION_ID = 'contact-agent-form';

// posthog-js records partial calculation and quota failures here even after an HTTP 200.
// Its fresh flag lookup otherwise allows values retained from an earlier response.
const SDK_FLAG_ERRORS = '$feature_flag_errors';

export type ContactAgentVariant = 'control' | 'test';
export type ContactAgentExperiment = { variant: ContactAgentVariant; viewId: string };
type FlagClient = Pick<typeof posthog, '__loaded' | 'getFeatureFlag' | 'get_property'>;

export function isDesktopContactAgentDevice(): boolean {
  try {
    return window.matchMedia(DESKTOP_CONTACT_AGENT_MEDIA).matches;
  } catch {
    return false;
  }
}

/** Resolve once per in-site entry. An absent, failed, or unconfirmed flag renders control. */
export function resolveContactAgentExperiment(client: FlagClient = posthog): ContactAgentExperiment | null {
  try {
    if (!isDesktopContactAgentDevice() || !client.__loaded) return null;
    const errors = client.get_property(SDK_FLAG_ERRORS);
    if (Array.isArray(errors) && errors.length > 0) return null;
    const variant = client.getFeatureFlag(DESKTOP_CONTACT_AGENT_FLAG, { fresh: true, send_event: false });
    if (variant !== 'test' && variant !== 'control') return null;
    return { variant, viewId: window.crypto.randomUUID() };
  } catch {
    return null;
  }
}

export function recordContactAgentExposure(experiment: ContactAgentExperiment): void {
  try {
    posthog.capture('$feature_flag_called', {
      $feature_flag: DESKTOP_CONTACT_AGENT_FLAG,
      $feature_flag_response: experiment.variant,
      contact_agent_experiment_view_id: experiment.viewId,
    }, { send_instantly: true });
  } catch {
    // Optional analytics must never stop forms from rendering.
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
