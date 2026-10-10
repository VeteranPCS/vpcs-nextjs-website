"use client";
import Link from 'next/link';
import { useId, useRef, useState, type FormEvent } from 'react';
import { KeepInTouchForm, vaLoanGuideForm, homebuyerGuideForm } from '@/services/salesForcePostFormsService';
import { HoneypotField, useHoneypot } from '@/components/common/honeypot';
import { captureAnalyticsEvent, formTrackingPayload, trackFormStarted, trackFormSubmitAttempted, trackFormSubmissionFailed } from '@/lib/analytics/client';
type Kind = 'newsletter' | 'va-guide' | 'homebuyer-guide';
const settings = {
  newsletter: { title:'Get VeteranPCS updates', formId:'keep_in_touch', action:KeepInTouchForm, file:'' },
  'va-guide': { title:'Free VA Loan Guide', formId:'va_loan_guide', action:vaLoanGuideForm, file:'VA-Loan-Guide.pdf' },
  'homebuyer-guide': { title:'Free First-Time Homebuyer Guide', formId:'first_time_homebuyer_guide', action:homebuyerGuideForm, file:'first-time-home-buyer-guide.pdf' },
};
export default function LeadCaptureDialog({ kind, initialEmail = '', triggerLabel, className = '' }: { kind:Kind; initialEmail?:string; triggerLabel:string; className?:string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { ref:honeypotRef, getSpamFields } = useHoneypot();
  const config = settings[kind];
  function close() { if (!busy.current) { dialog.current?.close(); trigger.current?.focus(); } }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const firstName=String(form.get('firstName') ?? '').trim(), lastName=String(form.get('lastName') ?? '').trim(), email=String(form.get('email') ?? '').trim();
    if (!firstName || !lastName || !email) { setError('Enter your first name, last name, and email.'); return; }
    busy.current=true; setPending(true); setError('');
    trackFormSubmitAttempted(config.formId, { has_email:true, has_phone:false });
    if(config.file) captureAnalyticsEvent('guide_download_requested', { guide_id:config.formId, form_id:config.formId, has_email:true });
    try {
      const response = await config.action({ firstName,lastName,email,...getSpamFields(),...formTrackingPayload() });
      if (!response?.success) throw new Error('Submission unsuccessful');
      setSuccess(true);
      if(config.file) {
        captureAnalyticsEvent('guide_download_started', { guide_id:config.formId, form_id:config.formId });
        const link=document.createElement('a'); link.href=`/downloads/${config.file}`; link.download=config.file; document.body.appendChild(link); link.click(); link.remove();
      }
    } catch {
      setError('We could not send your request. Please try again.');
      trackFormSubmissionFailed(config.formId,'server_submission',['submission_exception']);
    } finally { busy.current=false; setPending(false); }
  }
  return <>
    <button ref={trigger} type="button" className={className || 'steph-button'} onClick={() => { setError(''); setSuccess(false); dialog.current?.showModal(); trackFormStarted(config.formId); }}>{triggerLabel}</button>
    <dialog ref={dialog} className="steph-capture" aria-labelledby={`${id}-title`} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([aria-hidden]),select:not([disabled]),textarea:not([disabled])')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => { if (busy.current) event.preventDefault(); }} onClose={() => trigger.current?.focus()} onClick={event => { if(event.target===event.currentTarget) close(); }}>
      <div className="steph-capture-inner">
        <button type="button" className="steph-capture-close" aria-label="Close" disabled={pending} onClick={close}>×</button>
        <h2 id={`${id}-title`}>{config.title}</h2>
        {success ? <div role="status"><p>{config.file ? 'Your guide is ready.' : 'Thank you. We received your request.'}</p>{config.file && <a className="steph-button" href={`/downloads/${config.file}`} download>Download guide</a>}<button type="button" onClick={close}>Close</button></div> : <form onSubmit={submit}>
          <p>Enter your details to {config.file ? 'get your free guide' : 'keep in touch'}.</p>
          <HoneypotField ref={honeypotRef}/>
          <label htmlFor={`${id}-first`}>First name<input id={`${id}-first`} name="firstName" autoComplete="given-name" required maxLength={120}/></label>
          <label htmlFor={`${id}-last`}>Last name<input id={`${id}-last`} name="lastName" autoComplete="family-name" required maxLength={120}/></label>
          <label htmlFor={`${id}-email`}>Email<input id={`${id}-email`} name="email" type="email" autoComplete="email" defaultValue={initialEmail} required maxLength={200}/></label>
          {error && <p role="alert" className="steph-error">{error}</p>}
          <button className="steph-button" type="submit" disabled={pending}>{pending ? 'Sending…' : config.file ? 'Get my guide' : 'Keep in touch'}</button>
          <p className="steph-small">Your information is never sold. <Link href="/privacy-policy">Privacy policy</Link></p>
        </form>}
      </div>
    </dialog>
  </>;
}
