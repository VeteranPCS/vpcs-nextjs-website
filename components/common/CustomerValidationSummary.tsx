"use client";

import { useEffect, useRef } from 'react';

export type CustomerErrors = Partial<Record<string, { message?: string }>>;

const labels: Record<string, string> = {
  firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone',
  currentBase: 'Current Base/City', state: 'State', destinationBase: 'Destination Base/City',
  howDidYouHear: 'How did you hear about us?', tellusMore: 'Please tell us more',
  additionalComments: 'Additional Comments',
};

export function customerErrorProps(errors: CustomerErrors, field: string, helpId?: string) {
  return {
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': [helpId, errors[field] ? `${field}-error` : undefined].filter(Boolean).join(' ') || undefined,
  };
}

export default function CustomerValidationSummary({ errors, focusRequest }: {
  errors: CustomerErrors;
  focusRequest: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocusedRequest = useRef(0);
  const fields = Object.keys(labels).filter((field) => errors[field]);
  useEffect(() => {
    // RHF can publish errors after the invalid-submit callback updates our counter.
    if (focusRequest > lastFocusedRequest.current && ref.current) {
      ref.current.focus();
      lastFocusedRequest.current = focusRequest;
    }
  }, [focusRequest, fields.length]);
  if (!focusRequest || fields.length === 0) return null;
  return (
    <div ref={ref} tabIndex={-1} role="region" aria-labelledby="customer-validation-heading"
      className="border border-red-700 rounded-md p-4 text-red-800 focus:outline-2 focus:outline-offset-2">
      <h2 id="customer-validation-heading" className="font-bold">Please check the following fields</h2>
      <ul className="list-disc pl-5 mt-2">
        {fields.map((field) => (
          <li key={field}><a href={`#${field}`} className="underline" onClick={(event) => {
            event.preventDefault();
            document.getElementById(field)?.focus();
          }}>{labels[field]}: {errors[field]?.message}</a></li>
        ))}
      </ul>
    </div>
  );
}
