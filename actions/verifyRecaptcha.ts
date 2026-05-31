'use server'

import { logError } from '@/services/loggingService';

/**
 * Result of a server-side reCAPTCHA verification.
 * `ok` is the only field callers must branch on; `reason` is for logging/telemetry.
 */
export interface VerifyRecaptchaResult {
    ok: boolean;
    reason?: string;
}

const SITE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Shape of the Google siteverify JSON response (only the fields we read).
 */
interface SiteVerifyResponse {
    success: boolean;
    score?: number;
    action?: string;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

/**
 * Verifies a reCAPTCHA token with Google's siteverify endpoint.
 *
 * Behavior is intentionally tuned for a lead-capture surface where we never want a
 * transient Google outage to silently drop a real lead:
 *  - Missing/empty token  -> { ok: false, reason: 'missing-token' } (checked before any network call).
 *  - Missing secret key    -> { ok: true,  reason: 'unconfigured' } (fail-open, logged loudly).
 *  - Google says success:false -> { ok: false, reason: 'verification-failed' }.
 *  - Network/parse failure -> { ok: true,  reason: 'verify-error' } (fail-open, logged).
 */
export async function verifyRecaptcha(
    token: string | undefined | null
): Promise<VerifyRecaptchaResult> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    // Token check happens BEFORE the network call so we never burn a request on an
    // obviously-invalid submission.
    if (typeof token !== 'string' || token.trim().length === 0) {
        return { ok: false, reason: 'missing-token' };
    }

    if (!secret || secret.trim().length === 0) {
        // TODO(security): flip to fail-closed once RECAPTCHA_SECRET_KEY is provisioned in Vercel.
        // Until the secret is set we fail OPEN so lead capture keeps working, but we log loudly
        // so this state is visible in monitoring and gets remediated.
        logError('RECAPTCHA_SECRET_KEY not configured — skipping captcha verification');
        return { ok: true, reason: 'unconfigured' };
    }

    // Fail-open on network/parse errors: a Google outage must not kill lead capture.
    // The (small) bot-spam risk during an outage is acceptable versus losing real leads.
    try {
        const body = new URLSearchParams({
            secret,
            response: token,
        }).toString();

        const response = await fetch(SITE_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });

        const result = (await response.json()) as SiteVerifyResponse;

        if (result.success === false) {
            return { ok: false, reason: 'verification-failed' };
        }

        return { ok: true };
    } catch (error) {
        logError('reCAPTCHA verification request failed — failing open', undefined, error);
        return { ok: true, reason: 'verify-error' };
    }
}
