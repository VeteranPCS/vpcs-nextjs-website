'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import type { LeadSubmissionFields } from '@/lib/leads/captcha-types';
import { useLeadCaptcha } from './LeadCaptcha';
import { isLeadSubmitResult, type LeadSubmitResult } from '@/lib/leads/submission-outcome';

type Failure = Extract<LeadSubmitResult, { success: false }>;
type Submit<T> = (payload: T & LeadSubmissionFields) => Promise<LeadSubmitResult | void>;

const activeAttempts = new Set<string>();
const storageFallback = new Map<string, string>();
const listeners = new Set<() => void>();
const retryPrefix = 'retry:';

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function readAttempt(key: string) {
  try { return sessionStorage.getItem(key) ?? storageFallback.get(key); }
  catch { return storageFallback.get(key); }
}

function writeAttempt(key: string, marker?: string, active = false) {
  if (active) activeAttempts.add(key);
  else activeAttempts.delete(key);
  try {
    // Only the opaque attempt identifier and whether it can be retried survive reload.
    if (marker) sessionStorage.setItem(key, marker);
    else sessionStorage.removeItem(key);
    storageFallback.delete(key);
  } catch {
    if (marker) storageFallback.set(key, marker);
    else storageFallback.delete(key);
  }
  listeners.forEach(listener => listener());
}

export function bestEffort(work: () => void) {
  try { work(); } catch { /* Optional browser effects must not alter a submission outcome. */ }
}

export function useLeadSubmission(formId: string) {
  const captcha = useLeadCaptcha();
  const key = `vpcs:lead-pending:v1:${formId}`;
  const stored = useSyncExternalStore(subscribe, () => activeAttempts.has(key) ? 'active' : readAttempt(key), () => undefined);
  const lastAttempt = useRef<{ payload: string; id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const accepted = useRef(false);

  async function submit<T extends object>(payload: T, action: Submit<T>, comparablePayload: object = payload) {
    const marker = readAttempt(key);
    const retryId = marker?.startsWith(retryPrefix) ? marker.slice(retryPrefix.length) : undefined;
    if (accepted.current || activeAttempts.has(key) || (marker && !retryId)) return;
    let id: string;
    let captchaToken: string | undefined;
    try {
      const comparable = JSON.stringify(comparablePayload);
      captchaToken = captcha.config.mode === 'required' ? captcha.takeToken() : undefined;
      // Only an existing retry reference can reach server readback without a challenge.
      if (!retryId && captcha.config.mode !== 'off' && !captchaToken) {
        captcha.requestChallenge();
        return;
      }
      id = retryId ?? (lastAttempt.current?.payload === comparable ? lastAttempt.current.id : crypto.randomUUID());
      lastAttempt.current = { payload: comparable, id };
    } catch {
      if (captchaToken) bestEffort(captcha.resetAfterSubmit);
      const result = { outcome: 'not_sent', success: false } as const;
      setFailure(result);
      return result;
    }
    setSubmitting(true);
    setFailure(undefined);
    writeAttempt(key, id, true);
    let result: LeadSubmitResult;
    try {
      const response = await action({ ...payload, submission_attempt_id: id, ...(captchaToken ? { captchaToken } : {}) });
      result = isLeadSubmitResult(response) ? response : { outcome: 'unconfirmed', success: false };
    } catch {
      result = { outcome: 'unconfirmed', success: false };
    }
    if (captchaToken) bestEffort(captcha.resetAfterSubmit);
    if (result.outcome === 'validation_error' && result.fieldErrors.captchaToken) captcha.requestChallenge();
    if (result.outcome === 'accepted') {
      lastAttempt.current = null;
      accepted.current = true;
      writeAttempt(key);
    } else {
      const declined = result.outcome === 'rejected' || result.outcome === 'review_required';
      if (declined) lastAttempt.current = null;
      // Recoverable and validation responses can precede readback of earlier work.
      // A terminal decline closes the reference, while uncertainty locks it.
      const next = result.outcome === 'unconfirmed' ? id
        : !declined && (result.outcome === 'retry_later' || retryId) ? retryPrefix + id : undefined;
      setFailure({ ...result, submissionId: result.submissionId ?? id });
      writeAttempt(key, next);
    }
    setSubmitting(false);
    return result;
  }

  const retryReference = stored?.startsWith(retryPrefix) ? stored.slice(retryPrefix.length) : undefined;
  const unknownReference = stored && stored !== 'active' && !retryReference ? stored : undefined;

  return {
    submit,
    captcha,
    resetAccepted: () => { accepted.current = false; },
    clearFailure: () => setFailure(undefined),
    submitting,
    blocked: Boolean(unknownReference || stored === 'active'),
    failure: unknownReference
      ? { outcome: 'unconfirmed', success: false, submissionId: failure?.outcome === 'unconfirmed' ? failure.submissionId : unknownReference } as const
      : failure ?? (retryReference ? { outcome: 'retry_later', success: false, submissionId: retryReference } as const : undefined),
  };
}
