'use client';

import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { trackFormSubmitAttempted, trackFormSubmissionFailed, trackFormValidationFailed } from '@/lib/analytics/client';
import { CUSTOMER_FIELDS } from '@/lib/validation/contactForms';
import { navigateCustomerSuccess } from '@/lib/leads/customer-navigation';
import type { CustomerSubmitResponse } from '@/lib/leads/submission-outcome';

const optionalAnalytics = (work: () => void) => { try { work(); } catch { /* Never block a lead. */ } };

export function useCustomerSubmission<T extends FieldValues>({ formId, form, onSubmit, getSpamFields }: {
  formId: 'contact_agent' | 'contact_lender';
  form: Pick<UseFormReturn<T>, 'handleSubmit' | 'getValues' | 'setError' | 'reset'>;
  onSubmit: (data: T) => Promise<CustomerSubmitResponse> | void;
  getSpamFields: () => Record<string, unknown>;
}) {
  const busy = useRef(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const setSubmitButton = useCallback((node: HTMLButtonElement | null) => { submitButtonRef.current = node; }, []);
  const uncertain = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<'not_sent' | 'unconfirmed' | null>(null);
  const [hasUnconfirmed, setHasUnconfirmed] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [submissionId, setSubmissionId] = useState<string>();

  async function attempt(allowRetry: boolean) {
    if (busy.current) return;
    // Lock synchronously, before async resolver validation or a React rerender.
    busy.current = true;
    setIsSubmitting(true);
    setNotice(null);
    setConfirmRetry(false);
    let accepted = false;
    const values = form.getValues();
    optionalAnalytics(() => trackFormSubmitAttempted(formId, {
      has_email: Boolean(values.email), has_phone: Boolean(values.phone), state_code: values.state,
    }));
    const unconfirmed = () => {
      uncertain.current = true;
      setHasUnconfirmed(true);
      setNotice('unconfirmed');
      optionalAnalytics(() => trackFormSubmissionFailed(formId, 'server_submission', ['unconfirmed']));
    };
    try {
      await form.handleSubmit(async (data) => {
        if (uncertain.current && !allowRetry) {
          setConfirmRetry(true);
          return;
        }
        let response: CustomerSubmitResponse | void;
        try {
          response = await onSubmit({ ...data, ...getSpamFields() });
        } catch {
          unconfirmed();
          return;
        }
        if (response?.success || (response && 'redirectUrl' in response && response.redirectUrl)) {
          accepted = true;
          form.reset();
          navigateCustomerSuccess(('redirectUrl' in response && response.redirectUrl) || '/thank-you');
          return;
        }
        if (response && 'outcome' in response) {
          if (response.outcome === 'validation_error') {
            const errors: Record<string, { type: string; message: string }> = {};
            for (const [field, message] of Object.entries(response.fieldErrors)) {
              if (!CUSTOMER_FIELDS.includes(field)) continue;
              errors[field] = { type: 'server', message };
              form.setError(field as Path<T>, errors[field]);
            }
            setFocusRequest((request) => request + 1);
            optionalAnalytics(() => trackFormValidationFailed(formId, errors, { failure_stage: 'server_validation' }));
            return;
          }
          if (response.outcome === 'not_sent') {
            setNotice('not_sent');
            optionalAnalytics(() => trackFormSubmissionFailed(formId, 'server_submission', ['not_sent']));
            return;
          }
          if (response.outcome === 'unconfirmed') setSubmissionId(response.submissionId);
        }
        unconfirmed();
      }, (errors) => {
        setFocusRequest((request) => request + 1);
        optionalAnalytics(() => trackFormValidationFailed(formId, errors));
      })();
    } catch {
      // Resolver failures have not sent a lead. A known acceptance must stay accepted.
      if (!accepted) setNotice('not_sent');
    } finally {
      if (!accepted) {
        busy.current = false;
        setIsSubmitting(false);
      }
    }
  }

  return {
    isSubmitting, notice, hasUnconfirmed, confirmRetry, focusRequest, submissionId, setSubmitButton,
    submitLabel: isSubmitting ? 'Submitting...' : hasUnconfirmed ? 'Review and retry' : 'Submit',
    onFormSubmit: (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void attempt(false); },
    sendAgain: () => { if (confirmRetry) void attempt(true); },
    cancelRetry: () => { setConfirmRetry(false); submitButtonRef.current?.focus(); },
  };
}
