'use client';
import { LeadCaptcha } from '@/components/common/LeadCaptcha';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { contactPostForm } from '@/services/salesForcePostFormsService';
import { bestEffort, useLeadSubmission } from '@/components/common/useLeadSubmission';
import CustomerSubmissionFeedback from '@/components/common/CustomerSubmissionFeedback';
import { HoneypotField, useHoneypot } from '@/components/common/honeypot';
import { formTrackingPayload, trackFormStarted, trackFormSubmitAttempted, trackFormValidationFailed, trackFormSubmissionFailed } from '@/lib/analytics/client';
import { sendGTMEvent } from '@next/third-parties/google';
import styles from './VALoanLanding.module.css';
const schema = z.object({
  firstName:z.string().trim().min(1,'Enter your first name.').max(120,'Use 120 characters or fewer.'),
  lastName:z.string().trim().min(1,'Enter your last name.').max(120,'Use 120 characters or fewer.'),
  email:z.string().trim().max(200,'Use 200 characters or fewer.').email('Enter a valid email address.'),
  additionalComments:z.string().trim().min(1,'Enter your VA loan question.').max(5000,'Use 5,000 characters or fewer.'),
});
type Field = keyof z.infer<typeof schema>;
export default function QuestionForm() {
  const submission = useLeadSubmission('contact_form');
  const pending = submission.submitting;
  const [success,setSuccess] = useState(false);
  const [errors,setErrors] = useState<Partial<Record<Field,string>>>({});
  const { ref:honeypotRef,getSpamFields } = useHoneypot();
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submission.blocked || success) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    bestEffort(() => trackFormSubmitAttempted('contact_form',{has_email:Boolean(values.get('email')),has_phone:false,page_type:'va_loan_help'}));
    const parsed = schema.safeParse(Object.fromEntries(['firstName','lastName','email','additionalComments'].map(name=>[name,String(values.get(name) ?? '')])));
    if(!parsed.success) {
      const next:Partial<Record<Field,string>> = {};
      parsed.error.issues.forEach(issue=>{const field=issue.path[0] as Field;if(!next[field]) next[field]=issue.message;});
      setErrors(next);
      trackFormValidationFailed('contact_form',Object.fromEntries(Object.keys(next).map(field=>[field,{type:'invalid'}])),{page_type:'va_loan_help'});
      (form.elements.namedItem(Object.keys(next)[0] ?? '') as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    const response = await submission.submit({ ...parsed.data, ...getSpamFields() }, payload => {
      let tracking = {};
      bestEffort(() => { tracking = formTrackingPayload(); });
      return contactPostForm({ ...payload, ...tracking });
    }, parsed.data);
    if (response?.outcome === 'accepted') {
      setSuccess(true);
      bestEffort(() => sendGTMEvent({event:'contact_form_submission'}));
    } else if (response) {
      bestEffort(() => trackFormSubmissionFailed('contact_form','server_submission',[response.outcome],{page_type:'va_loan_help'}));
    }
  }
  if(success) return <div role="status" className={styles.success}><h3>Thank you for reaching out.</h3><p>We received your VA loan question and will get back to you within two business days.</p></div>;
  const input=(field:Field,label:string,type='text',autoComplete='off')=><label htmlFor={`va-${field}`}>{label}<input id={`va-${field}`} name={field} required aria-label={label} type={type} autoComplete={autoComplete} maxLength={field==='email'?200:120} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field]?`va-${field}-error`:undefined}/>{errors[field]&&<span id={`va-${field}-error`} className={styles.error}>{errors[field]}</span>}</label>;
  return <form className={styles.questionForm} aria-label="Ask a VA loan question" noValidate onSubmit={submit} onFocus={()=>trackFormStarted('contact_form',{page_type:'va_loan_help'})} aria-busy={pending}>
    <HoneypotField ref={honeypotRef}/>
    <label htmlFor="va-question">What’s your question?<textarea id="va-question" name="additionalComments" required aria-label="What’s your question?" placeholder="Type your question here…" rows={3} maxLength={5000} aria-invalid={Boolean(errors.additionalComments)} aria-describedby={errors.additionalComments?'va-question-error':undefined}/>{errors.additionalComments&&<span id="va-question-error" className={styles.error}>{errors.additionalComments}</span>}</label>
    <div className={styles.fields}>{input('firstName','First name','text','given-name')}{input('lastName','Last name','text','family-name')}</div>
    <LeadCaptcha control={submission.captcha} />
    <CustomerSubmissionFeedback failure={submission.failure} className={styles.error} />
    <div className={styles.submitRow}>{input('email','Email address','email','email')}<button type="submit" className="steph-button" disabled={pending || submission.blocked}>{pending?'Sending…':'Ask a VA Loan Expert'} <span aria-hidden="true">›</span></button></div>
    <p className={styles.privacy}>We respect your privacy. <Link href="/privacy-policy">Privacy policy</Link></p>
  </form>;
}
