'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { trackFormSubmitAttempted, trackFormSubmissionFailed, trackFormValidationFailed } from '@/lib/analytics/client';
import { CUSTOMER_FIELDS } from '@/lib/validation/contactForms';
import { navigateCustomerSuccess } from '@/lib/leads/customer-navigation';
import type { CustomerSubmitResponse } from '@/lib/leads/submission-outcome';
import { bestEffort, useLeadSubmission } from './useLeadSubmission';

export function useCustomerSubmission<T extends FieldValues>({ formId, form, onSubmit, getSpamFields }: {
  formId: 'contact_agent' | 'contact_lender';
  form: Pick<UseFormReturn<T>, 'handleSubmit' | 'getValues' | 'setError' | 'reset'>;
  onSubmit: (data: T & { submission_attempt_id: string }) => Promise<CustomerSubmitResponse> | void;
  getSpamFields: () => Record<string, unknown>;
}) {
  const submission = useLeadSubmission(formId);
  const busy = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [resolverFailed, setResolverFailed] = useState(false);

  async function attempt() {
    if (busy.current || submission.blocked) return;
    busy.current = true;
    setIsSubmitting(true);
    submission.clearFailure();
    setResolverFailed(false);
    let accepted = false;
    const values = form.getValues();
    bestEffort(() => trackFormSubmitAttempted(formId, {
      has_email: Boolean(values.email), has_phone: Boolean(values.phone), state_code: values.state,
    }));
    try {
      await form.handleSubmit(async (data) => {
        const response = await submission.submit(
          { ...data, ...getSpamFields() },
          async payload => onSubmit(payload),
          { ...data, query: window.location.search },
        );
        if (!response) return;
        if (response.outcome === 'accepted') {
          accepted = true;
          form.reset();
          navigateCustomerSuccess(response.redirectUrl || '/thank-you');
          return;
        }
        if (response.outcome === 'validation_error') {
          const errors: Record<string, { type: string; message: string }> = {};
          for (const [field, message] of Object.entries(response.fieldErrors)) {
            if (!CUSTOMER_FIELDS.includes(field)) continue;
            errors[field] = { type: 'server', message };
            form.setError(field as Path<T>, errors[field]);
          }
          setFocusRequest((request) => request + 1);
          bestEffort(() => trackFormValidationFailed(formId, errors, { failure_stage: 'server_validation' }));
          return;
        }
        bestEffort(() => trackFormSubmissionFailed(formId, 'server_submission', [response.outcome]));
      }, (errors) => {
        setFocusRequest((request) => request + 1);
        bestEffort(() => trackFormValidationFailed(formId, errors));
      })();
    } catch {
      // Preserve known acceptance if subsequent navigation throws.
      if (!accepted) setResolverFailed(true);
    } finally {
      if (!accepted) {
        busy.current = false;
        setIsSubmitting(false);
      }
    }
  }

  const failure = submission.failure ?? (resolverFailed ? { outcome: 'not_sent', success: false } as const : undefined);
  const showValidationFeedback = failure?.outcome === 'validation_error'
    && !Object.keys(failure.fieldErrors).some(field => CUSTOMER_FIELDS.includes(field));
  return {
    isSubmitting, focusRequest, blocked: submission.blocked, failure, showValidationFeedback,
    submitLabel: isSubmitting ? 'Submitting...' : 'Submit',
    onFormSubmit: (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void attempt(); },
  };
}
