import 'server-only';
import { headers } from 'next/headers';
import { isTrustedInternalCall, type InternalCallOptions } from '@/lib/internal-call-token';
import { containsLink } from '@/lib/validation/leadForms';
import { formLimiter } from '@/lib/rate-limit';
import { MIN_SUBMIT_MS } from '@/lib/validation/spam-fields';
import { logError } from '@/services/loggingService';

export interface LeadSpamResult {
  quarantine: boolean;
  reasons: string[];
}

export interface EvaluateLeadSpamArgs {
  email?: string;
  freeText?: string;
  honeypot?: string;            // hidden field a bot fills
  renderedAt?: string | number; // form mount timestamp (epoch ms) for timing check
  options?: InternalCallOptions;
}

/** Derive the caller's IP from request headers. Falls back to 'anonymous'. */
async function callerIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'anonymous';
}

/**
 * Evaluates a lead submission for origin-agnostic spam signals.
 *
 * Returns a SOFT quarantine decision — NEVER hard-rejects.
 * Order of evaluation:
 *  1. Trusted server-internal callers (e.g. the AI concierge) bypass all checks immediately.
 *  2. Kill-switch: LEAD_SPAM_ENFORCED=0 disables all checks.
 *  3. Soft signals accumulated without early-return: link-in-freetext, rate-limit, honeypot, too-fast.
 */
export async function evaluateLeadSpam(args: EvaluateLeadSpamArgs): Promise<LeadSpamResult> {
  // 1. Internal bypass — MUST be first, before any headers() or formLimiter call.
  if (isTrustedInternalCall(args.options)) {
    return { quarantine: false, reasons: ['internal'] };
  }

  // 2. Kill-switch.
  if (process.env.LEAD_SPAM_ENFORCED === '0') {
    return { quarantine: false, reasons: ['disabled'] };
  }

  // 3. Accumulate soft signals.
  const reasons: string[] = [];

  // 3a. Link in free text.
  if (containsLink(args.freeText)) {
    reasons.push('link-in-freetext');
  }

  // 3b. Rate-limit checks (fail open on any error).
  try {
    const ip = await callerIp();
    const ipRes = await formLimiter.limit('lead:ip:' + ip);

    let emailRes: { success: boolean } | undefined;
    if (args.email) {
      emailRes = await formLimiter.limit('lead:email:' + args.email.trim().toLowerCase());
    }

    if (!ipRes.success || (emailRes && !emailRes.success)) {
      reasons.push('rate-limit');
    }
  } catch (err) {
    logError('evaluateLeadSpam: rate-limit check failed — failing open', undefined, err);
    // Intentionally push nothing; fail open.
  }

  // 3c. Honeypot — a non-empty hidden field means an automated filler set it.
  if (args.honeypot && args.honeypot.trim() !== '') {
    reasons.push('honeypot');
  }

  // 3d. Submit timing — a submission faster than a human can plausibly fill the
  //     form is scripted. Guard `elapsed >= 0` so client clock skew (a render
  //     timestamp slightly in the future) never quarantines a real lead.
  if (args.renderedAt !== undefined && args.renderedAt !== '') {
    const renderedAtMs = Number(args.renderedAt);
    if (Number.isFinite(renderedAtMs)) {
      const elapsed = Date.now() - renderedAtMs;
      if (elapsed >= 0 && elapsed < MIN_SUBMIT_MS) {
        reasons.push('too-fast');
      }
    }
  }

  return { quarantine: reasons.length > 0, reasons };
}

/**
 * Prepends the spam-suspected quarantine marker to a form's free-text field so
 * spam-suspected leads are visibly tagged in Salesforce. Safe on empty/whitespace — returns
 * the bare tag in that case.
 */
export function tagSpamSuspected(comments: string | undefined): string {
  const tag = '[SPAM-SUSPECTED]';
  return comments && comments.trim() ? `${tag} ${comments}` : tag;
}
