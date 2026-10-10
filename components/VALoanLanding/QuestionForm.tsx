'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { contactPostForm } from '@/services/salesForcePostFormsService';
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
  const busy = useRef(false);
  const [pending,setPending] = useState(false);
  const [success,setSuccess] = useState(false);
  const [error,setError] = useState('');
  const [errors,setErrors] = useState<Partial<Record<Field,string>>>({});
  const { ref:honeypotRef,getSpamFields } = useHoneypot();
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy.current || success) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    trackFormSubmitAttempted('contact_form',{has_email:Boolean(values.get('email')),has_phone:false,page_type:'va_loan_help'});
    const parsed = schema.safeParse(Object.fromEntries(['firstName','lastName','email','additionalComments'].map(name=>[name,String(values.get(name) ?? '')])));
    if(!parsed.success) {
      const next:Partial<Record<Field,string>> = {};
      parsed.error.issues.forEach(issue=>{const field=issue.path[0] as Field;if(!next[field]) next[field]=issue.message;});
      setErrors(next);setError('');
      trackFormValidationFailed('contact_form',Object.fromEntries(Object.keys(next).map(field=>[field,{type:'invalid'}])),{page_type:'va_loan_help'});
      (form.elements.namedItem(Object.keys(next)[0] ?? '') as HTMLElement | null)?.focus();
      return;
    }
    busy.current=true;setPending(true);setErrors({});setError('');
    try {
      const response=await contactPostForm({...parsed.data,...getSpamFields(),...formTrackingPayload()});
      if(!response?.success) throw new Error('Submission unsuccessful');
      sendGTMEvent({event:'contact_form_submission'});
      setSuccess(true);
    } catch {
      setError('We could not send your question. Your details are still here. Please try again.');
      trackFormSubmissionFailed('contact_form','server_submission',['submission_exception'],{page_type:'va_loan_help'});
    } finally {busy.current=false;setPending(false);}
  }
  if(success) return <div role="status" className={styles.success}><h3>Thank you for reaching out.</h3><p>We received your VA loan question and will get back to you within two business days.</p></div>;
  const input=(field:Field,label:string,type='text',autoComplete='off')=><label htmlFor={`va-${field}`}>{label}<input id={`va-${field}`} name={field} required aria-label={label} type={type} autoComplete={autoComplete} maxLength={field==='email'?200:120} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field]?`va-${field}-error`:undefined}/>{errors[field]&&<span id={`va-${field}-error`} className={styles.error}>{errors[field]}</span>}</label>;
  return <form className={styles.questionForm} aria-label="Ask a VA loan question" noValidate onSubmit={submit} onFocus={()=>trackFormStarted('contact_form',{page_type:'va_loan_help'})} aria-busy={pending}>
    <HoneypotField ref={honeypotRef}/>
    <label htmlFor="va-question">What’s your question?<textarea id="va-question" name="additionalComments" required aria-label="What’s your question?" placeholder="Type your question here…" rows={3} maxLength={5000} aria-invalid={Boolean(errors.additionalComments)} aria-describedby={errors.additionalComments?'va-question-error':undefined}/>{errors.additionalComments&&<span id="va-question-error" className={styles.error}>{errors.additionalComments}</span>}</label>
    <div className={styles.fields}>{input('firstName','First name','text','given-name')}{input('lastName','Last name','text','family-name')}</div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.submitRow}>{input('email','Email address','email','email')}<button type="submit" className="steph-button" disabled={pending}>{pending?'Sending…':'Ask a VA Loan Expert'} <span aria-hidden="true">›</span></button></div>
    <p className={styles.privacy}>We respect your privacy. <Link href="/privacy-policy">Privacy policy</Link></p>
  </form>;
}
