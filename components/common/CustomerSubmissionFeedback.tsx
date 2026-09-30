'use client';

import { useEffect, useRef } from 'react';

export default function CustomerSubmissionFeedback({ notice, hasUnconfirmed, confirmRetry, isSubmitting, submissionId, sendAgain, cancelRetry }: {
  notice: 'not_sent' | 'unconfirmed' | null;
  hasUnconfirmed: boolean;
  confirmRetry: boolean;
  isSubmitting: boolean;
  submissionId?: string;
  sendAgain: () => void;
  cancelRetry: () => void;
}) {
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirmRetry) confirmation.current?.focus(); }, [confirmRetry]);
  return <>
    {notice === 'not_sent' && <p role="alert" className="text-red-700 text-sm">
      We couldn’t send your request. Your information is still here. Please try again.
    </p>}
    {hasUnconfirmed && <div className="text-red-700 text-sm">
      <p role={notice === 'unconfirmed' ? 'alert' : undefined}>
        We couldn’t confirm whether your request was received. It may already have reached us. Sending again could create a duplicate.
      </p>
      {submissionId && <p>Reference: {submissionId}</p>}
    </div>}
    {confirmRetry && <div ref={confirmation} tabIndex={-1} role="region" aria-labelledby="customer-retry-heading"
      className="border border-red-700 rounded-md p-4 text-red-800 focus:outline-2 focus:outline-offset-2">
      <h2 id="customer-retry-heading" className="font-bold">Send this request again?</h2>
      <p className="mt-2 text-sm">Your earlier request may already have arrived. Only send again if you want to retry.</p>
      <div className="flex gap-4 mt-3">
        <button type="button" disabled={isSubmitting} onClick={sendAgain} className="underline min-h-[44px]">Send again</button>
        <button type="button" onClick={cancelRetry} className="underline min-h-[44px]">Cancel</button>
      </div>
    </div>}
  </>;
}
