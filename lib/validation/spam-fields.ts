/**
 * Shared field names + thresholds for the Phase 2 lead-form spam signals
 * (honeypot + submit-timing).
 *
 * This module is intentionally ISOMORPHIC: it has ZERO imports and exports
 * only plain constants, so it is safe to import from both the server
 * (`lib/spam-protection.ts` → `evaluateLeadSpam`) and `'use client'` form
 * components. Do NOT add `import 'server-only'` or any node: import here —
 * doing so would crash every page that renders a lead form.
 *
 * The field names are the single source of truth: the client writes these
 * hidden fields into the submission payload and the server reads them back
 * under the same keys. Changing a name requires changing both sides at once.
 */

/**
 * Honeypot field name. Rendered as a visually-hidden input that real users
 * never see or fill; automated bots that blindly fill every field will set
 * it. A non-empty value at submit time is a strong spam signal. Named to
 * look like a plausible business field (so bots fill it) while being
 * irrelevant to a PCS lead (so a human never would).
 */
export const HP_FIELD = 'company_website';

/**
 * Submit-timing field name. The client stamps this with the page/form mount
 * time (epoch ms) and sends it back at submit; the server measures elapsed
 * time. Faster than MIN_SUBMIT_MS implies a scripted submission.
 */
export const TS_FIELD = 'form_rendered_at';

/**
 * Minimum plausible human fill-and-submit time, in milliseconds. A person
 * cannot read, complete, and submit a multi-field lead form faster than
 * this; scripted submissions typically post in tens of milliseconds.
 */
export const MIN_SUBMIT_MS = 1500;
