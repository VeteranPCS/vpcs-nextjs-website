import type { LeadSubmitResult } from '@/lib/leads/submission-outcome';

export default function CustomerSubmissionFeedback({ failure, className = 'text-red-700 text-sm', showValidation = true }: {
  failure?: Extract<LeadSubmitResult, { success: false }>;
  className?: string;
  showValidation?: boolean;
}) {
  if (!failure || (failure.outcome === 'validation_error' && !showValidation)) return null;
  const messages = {
    not_sent: 'We couldn’t send your request. Your information is still here. Please try again.',
    rejected: 'We couldn’t accept this request. Contact us if you need help.',
    review_required: 'We need to verify this request before it can be sent. Contact us for help.',
    retry_later: 'We couldn’t verify your request right now. Your information is still here. Please wait before trying again.',
    unconfirmed: 'We couldn’t confirm whether your request was received. It may already have reached us. Contact us to check its status.',
    validation_error: 'Check the information you entered and try again.',
  };
  const needsHelp = ['rejected', 'review_required', 'unconfirmed'].includes(failure.outcome);

  return <div role="alert" className={className}>
    <p>{messages[failure.outcome]}</p>
    {failure.outcome === 'retry_later' && failure.retryAt && Number.isFinite(failure.retryAt) && <p>Try again after {new Date(failure.retryAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>}
    {needsHelp && <p><a className="underline" href="mailto:info@veteranpcs.com">Email VeteranPCS</a></p>}
    {needsHelp && failure.submissionId && <p>Reference {failure.submissionId}</p>}
  </div>;
}
