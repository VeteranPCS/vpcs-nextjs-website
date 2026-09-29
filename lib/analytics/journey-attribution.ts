import publicPaths from '@/content/_registry/journey-paths.json';

const allowedPaths = new Set(publicPaths);
const ORIGIN = 'https://www.veteranpcs.com';
const SITE_ORIGINS = new Set([ORIGIN, 'https://veteranpcs.com']);

export function validSessionId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

export function safeSessionEntryPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\s\u0000-\u001f]/.test(value)) return undefined;
  if (!value.startsWith('/') && !value.startsWith('https://')) return undefined;
  if (value.startsWith('//')) return undefined;
  try {
    const url = new URL(value, ORIGIN);
    if (!SITE_ORIGINS.has(url.origin) || url.username || url.password) return undefined;
    // Only known literal public paths; no decoded free text, identifiers or private paths.
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '/';
    if (path.length > 512 || /%|\/\//.test(path)) return undefined;
    if (allowedPaths.has(path)) return path;
    const pagination = /^(\/blog(?:\/category\/[a-z0-9-]+)?)\/page\/([1-9][0-9]{0,2})$/.exec(path);
    return pagination && allowedPaths.has(pagination[1]!) ? path : undefined;
  } catch { return undefined; }
}

export function customerJourneyProperties(formId: string | undefined, data: Record<string, unknown>, enabled: boolean) {
  if (!enabled || (formId !== 'contact_agent' && formId !== 'contact_lender') || data.journey_attribution_version !== 1) return {};
  const id = validSessionId(data.posthog_session_id);
  if (!id) return {};
  const path = safeSessionEntryPath(data.session_entry_path);
  return { posthog_session_id: id, journey_attribution_version: 1, ...(path ? { session_entry_path: path } : {}) };
}

export interface SessionSdk {
  onSessionId(callback: (id: string) => void): () => void;
  get_session_id(): string;
  has_opted_out_capturing(): boolean;
}

// Memory only. The SDK owns persistence, rotation and cross-tab identity.
export function createJourneyTracker(enabled: () => boolean, storageAvailable: () => boolean) {
  let sdk: SessionSdk | undefined;
  let unsubscribe: (() => void) | undefined;
  let sessionId: string | undefined;
  let entryPath: string | undefined;
  const rotate = (id: unknown) => {
    const next = validSessionId(id);
    if (next !== sessionId) { sessionId = next; entryPath = undefined; }
  };
  const clear = () => { sessionId = undefined; entryPath = undefined; };
  const ready = () => {
    try {
      if (!enabled() || !sdk || sdk.has_opted_out_capturing() || !storageAvailable()) { clear(); return false; }
      rotate(sdk.get_session_id());
      return Boolean(sessionId);
    } catch { clear(); return false; }
  };
  return {
    initialize(client: SessionSdk) {
      unsubscribe?.(); clear(); sdk = client;
      if (!enabled()) return;
      try { unsubscribe = client.onSessionId(rotate); } catch { sdk = undefined; }
    },
    observe(properties: Record<string, unknown>) {
      if (!ready() || validSessionId(properties.$session_id) !== sessionId) return;
      const path = safeSessionEntryPath(properties.$session_entry_url ?? properties.$session_entry_pathname);
      if (path) entryPath = path;
    },
    payload(formId?: string) {
      if (!ready()) return {};
      return customerJourneyProperties(formId, { posthog_session_id: sessionId,
        session_entry_path: entryPath, journey_attribution_version: 1 }, true);
    },
  };
}
