import 'server-only';
import { headers } from 'next/headers';
import { isTrustedInternalCall, type InternalCallOptions } from '@/lib/internal-call-token';
import { containsLink } from '@/lib/validation/leadForms';
import { isIP } from 'node:net';
import { emailIdentityHash, normalizedPhone, sha256 } from '@/lib/leads/identity';
import { leadRateLimit } from '@/lib/leads/rate-limit';
import { checkBlockedIdentity } from '@/services/salesforceIntake';
import { isLeadDryRun } from '@/lib/lead-dry-run';
import { MIN_SUBMIT_MS } from '@/lib/validation/spam-fields';
import { logError } from '@/services/loggingService';

export interface LeadSpamResult {
  decision: 'allow' | 'reject' | 'retry_later' | 'review_required';
  quarantine: boolean;
  reasons: string[];
  retryAt?: number;
}

export interface EvaluateLeadSpamArgs {
  email?: string;
  phone?: string;
  dryRun?: boolean;
  rateChecked?: boolean;
  freeText?: string;
  honeypot?: string;            // hidden field a bot fills
  renderedAt?: string | number; // form mount timestamp (epoch ms) for timing check
  options?: InternalCallOptions;
}

/**
 * Extract the client IP from a Headers-like object. Pure and request-agnostic so
 * routes that already hold a `Request` (MCP, BAH) can reuse the same derivation as
 * the ambient-header `callerIp()`. Falls back to 'anonymous'.
 */
export function ipFromHeaders(h: Pick<Headers, 'get'>): string {
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'anonymous';
}

/** Derive the caller's IP from the ambient request headers. Falls back to 'anonymous'. */
export async function callerIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

/** Vercel's own header avoids custom forwarded-for overrides. Local clients are untrusted. */
export function trustedLeadIp(h: Pick<Headers, 'get'>): string | null {
  if (process.env.VERCEL !== '1') return null;
  const value = h.get('x-vercel-forwarded-for')?.trim();
  return value && isIP(value) ? value : null;
}

/** Admission precedes every business side effect; internal callers still enforce identity/rates. */
export async function evaluateLeadSpam(args: EvaluateLeadSpamArgs): Promise<LeadSpamResult> {
  const outcome = (decision: LeadSpamResult['decision'], reasons: string[], retryAt?: number): LeadSpamResult =>
    ({ decision, quarantine: decision !== 'allow', reasons, ...(retryAt ? { retryAt } : {}) });
  if (args.honeypot !== undefined && (typeof args.honeypot !== 'string' || args.honeypot.length > 255)) {
    return outcome('reject', ['invalid-honeypot']);
  }
  if (args.honeypot && args.honeypot.trim()) return outcome('reject', ['honeypot']);
  const trusted = isTrustedInternalCall(args.options);
  const reasons: string[] = [];
  if (args.honeypot === undefined && !trusted) reasons.push('missing-envelope');
  const time = args.renderedAt;
  if (typeof time !== 'string' && typeof time !== 'number') {
    if (!trusted || time !== undefined) reasons.push('invalid-timing');
  } else {
    const elapsed = Date.now() - Number(time);
    const validTime = typeof time === 'number' ? Number.isSafeInteger(time) && time >= 0 : /^[0-9]{1,16}$/.test(time);
    if (!validTime || !Number.isFinite(elapsed) || elapsed < 0) reasons.push('invalid-timing');
    else if (elapsed < MIN_SUBMIT_MS) reasons.push('too-fast');
  }
  if (containsLink(args.freeText)) reasons.push('link-in-freetext');
  const dryRun = args.dryRun === true || isLeadDryRun();
  try {
    const emailHash = emailIdentityHash(args.email);
    const phone = normalizedPhone(args.phone);
    if (!emailHash && !phone) return outcome('reject', ['invalid-contact']);
    if (!dryRun && await checkBlockedIdentity(emailHash)) return outcome('reject', ['blocked-identity']);
    if (reasons.length) return outcome('review_required', reasons);
    if (!dryRun && !args.rateChecked) {
      const rate = await evaluateLeadRateLimit(args);
      if (rate.decision !== 'allow') return rate;
    }
    return outcome('allow', []);
  } catch {
    logError('Lead admission dependency unavailable', { policyVersion: 'r1' });
    return outcome('retry_later', ['verification-unavailable']);
  }
}

/** One charge per request, before Salesforce inspection; never contacts Salesforce. */
export async function evaluateLeadRateLimit(args: Pick<EvaluateLeadSpamArgs, 'email' | 'phone' | 'dryRun'>): Promise<LeadSpamResult> {
  const result = (decision: LeadSpamResult['decision'], reason?: string, retryAt?: number): LeadSpamResult =>
    ({ decision, quarantine: decision !== 'allow', reasons: reason ? [reason] : [], ...(retryAt ? { retryAt } : {}) });
  if (args.dryRun || isLeadDryRun()) return result('allow');
  try {
    if (process.env.LEAD_SPAM_ENFORCED === '0') return result('retry_later', 'policy-unavailable');
    const emailHash = emailIdentityHash(args.email);
    const phone = normalizedPhone(args.phone);
    if (!emailHash && !phone) return result('reject', 'invalid-contact');
    const ip = process.env.VERCEL === '1' ? trustedLeadIp(await headers()) : null;
    // A phone exists when no email hash exists (the guard above enforces that).
    const keys = [emailHash ? `email:${emailHash}` : `phone:${sha256(phone!)}`];
    if (ip) keys.push(`ip:${sha256(ip)}`);
    const rate = await leadRateLimit(keys);
    return rate.allowed ? result('allow') : result('retry_later', 'rate-limit', rate.retryAt);
  } catch {
    logError('Lead rate dependency unavailable', { policyVersion: 'r1' });
    return result('retry_later', 'verification-unavailable');
  }
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
