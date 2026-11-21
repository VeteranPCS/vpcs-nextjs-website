/** Visitor details stay in this tab and are consumed only by the chosen agent's form. */
export interface ContactPrefillDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export const CONTACT_PREFILL_STORAGE_KEY = 'vpcs_contact_prefill';
const PREFILL_TTL_MS = 15 * 60 * 1000;
const SALESFORCE_ID = /^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/;

function readDetails(value: unknown): ContactPrefillDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const text = (key: string, max: number): string | null => {
    const value = raw[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= max && !/[\u0000-\u001f\u007f]/.test(trimmed) ? trimmed : null;
  };
  const firstName = text('firstName', 40);
  const lastName = text('lastName', 80);
  const email = text('email', 80);
  if (!firstName || !lastName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { firstName, lastName, email };
}

/** Call only on an explicit contact CTA click, never on guide submission or page render. */
export function storeContactPrefill(targetAgentId: string, details?: ContactPrefillDetails): void {
  try {
    // A direct contact click without details must not reuse a previous guide handoff.
    window.sessionStorage.removeItem(CONTACT_PREFILL_STORAGE_KEY);
    const contact = readDetails(details);
    if (!SALESFORCE_ID.test(targetAgentId) || !contact) return;
    window.sessionStorage.setItem(CONTACT_PREFILL_STORAGE_KEY, JSON.stringify({
      version: 1,
      targetAgentId,
      expiresAt: Date.now() + PREFILL_TTL_MS,
      contact,
    }));
  } catch {
    // Storage may be blocked; the contact form remains usable with empty fields.
  }
}

/** Consume once on contact-form mount, removing even expired, malformed or mismatched data. */
export function consumeContactPrefill(targetAgentId: string | null): ContactPrefillDetails | null {
  try {
    const serialized = window.sessionStorage.getItem(CONTACT_PREFILL_STORAGE_KEY);
    window.sessionStorage.removeItem(CONTACT_PREFILL_STORAGE_KEY);
    if (!serialized || serialized.length > 1024 || !targetAgentId || !SALESFORCE_ID.test(targetAgentId)) return null;
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const now = Date.now();
    if (raw.version !== 1 || raw.targetAgentId !== targetAgentId || typeof raw.expiresAt !== 'number'
      || !Number.isFinite(raw.expiresAt) || raw.expiresAt <= now || raw.expiresAt > now + PREFILL_TTL_MS) return null;
    return readDetails(raw.contact);
  } catch {
    return null;
  }
}
