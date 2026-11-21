"use client";

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { sendGTMEvent } from '@next/third-parties/google';
import { KeepInTouchForm, vaLoanGuideForm, homebuyerGuideForm, coloradoRelocationGuideForm } from '@/services/salesForcePostFormsService';
import { HoneypotField, useHoneypot } from '@/components/common/honeypot';
import { captureAnalyticsEvent, formTrackingPayload, trackFormStarted, trackFormSubmitAttempted, trackFormSubmissionFailed, trackCtaClicked } from '@/lib/analytics/client';
import { buildCtaProperties } from '@/lib/analytics/cta';
import { COLORADO_RELOCATION_GUIDE } from '@/lib/guides/colorado-relocation';
import type { ContactPrefillDetails } from '@/lib/leads/contact-prefill';
import ColoradoGuideAuthorCard from './ColoradoGuideAuthorCard';

export type CapturePlacement = { location: string; position?: string; pageType?: string };
type Kind = 'newsletter' | 'va-guide' | 'homebuyer-guide' | 'colorado-relocation-guide';
const settings = {
  newsletter: { title: 'Get VeteranPCS updates', formId: 'keep_in_touch', action: KeepInTouchForm, file: '', gaContent: '' },
  'va-guide': { title: 'Free VA Loan Guide', formId: 'va_loan_guide', action: vaLoanGuideForm, file: 'VA-Loan-Guide.pdf', gaContent: 'VA Loan Guide' },
  'homebuyer-guide': { title: 'Free First-Time Homebuyer Guide', formId: 'first_time_homebuyer_guide', action: homebuyerGuideForm, file: 'first-time-home-buyer-guide.pdf', gaContent: 'First Time Home Buyer Guide' },
  'colorado-relocation-guide': {
    title: COLORADO_RELOCATION_GUIDE.title,
    formId: COLORADO_RELOCATION_GUIDE.id,
    action: coloradoRelocationGuideForm,
    file: COLORADO_RELOCATION_GUIDE.fileName,
    gaContent: COLORADO_RELOCATION_GUIDE.gaContent,
  },
};

/** Optional telemetry must not interfere with opening, submitting, or downloading. */
function trackSafely(track: () => void) {
  try { track(); } catch { /* Analytics can be blocked independently of the form. */ }
}

export default function LeadCaptureDialog({ kind, initialEmail = '', triggerLabel, className = '', placement }: { kind: Kind; initialEmail?: string; triggerLabel: string; className?: string; placement?: CapturePlacement }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  // Native dialogs enter the top layer but still inherit their DOM ancestors' CSS.
  // Keep shared form styling independent of its card.
  useEffect(() => { setPortalRoot(document.body); }, []);
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [acceptedContactDetails, setAcceptedContactDetails] = useState<ContactPrefillDetails>();
  const { ref: honeypotRef, getSpamFields } = useHoneypot();
  const config = settings[kind];
  const isColorado = kind === COLORADO_RELOCATION_GUIDE.kind;
  useEffect(() => {
    if (!isColorado || !success) return;
    // The submitted form is gone; keep keyboard focus on the next intended action.
    dialog.current?.querySelector<HTMLAnchorElement>('[data-guide-contact-card] a[href]')?.focus();
  }, [isColorado, success]);
  const downloadPath = config.file ? `/downloads/${config.file}` : undefined;
  const ctaProperties = buildCtaProperties({
    ctaId: `${config.formId}_capture`,
    ctaIntent: config.file ? 'download_guide' : 'newsletter_signup',
    ctaComponent: 'lead_capture_dialog',
    ctaLocation: placement?.location ?? 'guide_capture',
    ctaPosition: placement?.position ?? 'inline',
    pageType: isColorado ? 'state_page' : placement?.pageType,
    ctaLabel: triggerLabel,
    destination: downloadPath,
    guideId: config.file ? config.formId : undefined,
    stateCode: isColorado ? COLORADO_RELOCATION_GUIDE.stateCode : undefined,
    stateSlug: isColorado ? COLORADO_RELOCATION_GUIDE.stateSlug : undefined,
  });
  const guideProperties = {
    ...ctaProperties,
    form_id: config.formId,
    ...(isColorado ? { source_page_path: COLORADO_RELOCATION_GUIDE.pagePath } : {}),
  };

  function trackDownload(event: 'guide_download_requested' | 'guide_download_started', downloadTrigger: 'form_submission' | 'manual_link') {
    trackSafely(() => captureAnalyticsEvent(event, { ...guideProperties, download_trigger: downloadTrigger, ...(event === 'guide_download_requested' ? { has_email: true } : {}) }));
  }

  function close() {
    if (!busy.current) { dialog.current?.close(); trigger.current?.focus(); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') ?? '').trim();
    const lastName = String(form.get('lastName') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!firstName || !lastName || !email) {
      setError('Enter your first name, last name, and email.');
      const field = !firstName ? 'firstName' : !lastName ? 'lastName' : 'email';
      event.currentTarget.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus();
      return;
    }

    busy.current = true;
    setPending(true);
    setError('');
    trackSafely(() => trackFormSubmitAttempted(config.formId, { ...guideProperties, has_email: true, has_phone: false }));
    if (config.file) trackDownload('guide_download_requested', 'form_submission');

    try {
      // Attribution is optional too: a storage/SDK error must not drop the request.
      let tracking = {};
      try { tracking = formTrackingPayload(config.formId); } catch { /* Submit without optional attribution. */ }
      const response = await config.action({ firstName, lastName, email, ...getSpamFields(), ...tracking });
      if (!response?.success) throw new Error('Submission unsuccessful');
    } catch {
      setError('We could not send your request. Please try again.');
      trackSafely(() => trackFormSubmissionFailed(config.formId, 'server_submission', ['submission_exception'], guideProperties));
      busy.current = false;
      setPending(false);
      return;
    }

    if (isColorado) setAcceptedContactDetails({ firstName, lastName, email });
    setSuccess(true);
    busy.current = false;
    setPending(false);
    if (config.file) {
      trackDownload('guide_download_started', 'form_submission');
      trackSafely(() => sendGTMEvent({ event: 'conversion_download', content: config.gaContent }));
      // Acceptance is final even if the browser prevents the automatic download.
      // The success-state link remains available without another CRM submission.
      const link = document.createElement('a');
      try {
        link.href = `/downloads/${config.file}`;
        link.download = config.file;
        document.body.appendChild(link);
        link.click();
        setDownloadStarted(true);
      } catch { /* Use the manual download link. */ } finally { link.remove(); }
    }
  }

  return <>
    <button ref={trigger} type="button" disabled={!portalRoot} className={className || 'steph-button'} onClick={() => {
      setError('');
      setSuccess(false);
      setDownloadStarted(false);
      setAcceptedContactDetails(undefined);
      dialog.current?.showModal();
      trackSafely(() => trackCtaClicked(guideProperties));
      trackSafely(() => trackFormStarted(config.formId, guideProperties));
    }}>{triggerLabel}</button>
    {portalRoot && createPortal(<dialog ref={dialog} className="steph-capture" aria-labelledby={`${id}-title`} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([aria-hidden]),select:not([disabled]),textarea:not([disabled])')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { if (busy.current) event.preventDefault(); }} onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="steph-capture-inner">
        <button type="button" className="steph-capture-close" aria-label="Close" disabled={pending} onClick={close}>×</button>
        <h2 id={`${id}-title`}>{config.title}</h2>
        {success ? <div role="status">
          <p>{isColorado && downloadStarted ? 'Your download has started.' : config.file ? 'Your guide is ready.' : 'Thank you. We received your request.'}</p>
          {isColorado && <ColoradoGuideAuthorCard contactDetails={acceptedContactDetails} />}
          {config.file && (isColorado ? <p className="text-sm">
            Download didn’t start?{' '}
            <a className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" href={downloadPath} download onClick={() => {
              trackDownload('guide_download_requested', 'manual_link');
              trackDownload('guide_download_started', 'manual_link');
            }}>Download again</a>
          </p> : <a className="steph-button" href={downloadPath} download onClick={() => {
            trackDownload('guide_download_requested', 'manual_link');
            trackDownload('guide_download_started', 'manual_link');
          }}>Download guide</a>)}
          <button type="button" className="min-h-11" onClick={close}>Close</button>
        </div> : <form onSubmit={submit}>
          <p>Enter your details to {config.file ? 'get your free guide' : 'keep in touch'}.</p>
          <HoneypotField ref={honeypotRef} />
          <label htmlFor={`${id}-first`}>First name<input id={`${id}-first`} name="firstName" autoComplete="given-name" required maxLength={isColorado ? 40 : 120} /></label>
          <label htmlFor={`${id}-last`}>Last name<input id={`${id}-last`} name="lastName" autoComplete="family-name" required maxLength={isColorado ? 80 : 120} /></label>
          <label htmlFor={`${id}-email`}>Email<input id={`${id}-email`} name="email" type="email" autoComplete="email" defaultValue={initialEmail} required maxLength={isColorado ? 80 : 200} /></label>
          {error && <p role="alert" className="steph-error">{error}</p>}
          <button className="steph-button" type="submit" disabled={pending}>{pending ? 'Sending…' : config.file ? 'Get my guide' : 'Keep in touch'}</button>
          <p className="steph-small">Your information is never sold. <Link href="/privacy-policy">Privacy policy</Link></p>
        </form>}
      </div>
    </dialog>, portalRoot)}
  </>;
}
