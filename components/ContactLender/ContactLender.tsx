"use client";
import { useState, useEffect } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import HowDidYouHearAboutUs from '@/components/GetListedLenders/HowDidYouHearAboutUs';

import { ContactLenderFormData } from '@/types';
import { useConcierge } from '@/components/Concierge';
import { featureFlags } from '@/lib/feature-flags';
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';
import { US_STATE_CODES } from '@/constants/usStates';
import CustomerValidationSummary, { customerErrorProps } from '@/components/common/CustomerValidationSummary';
import { contactLenderClientSchema } from '@/lib/validation/contactForms';
import { trackFormStarted } from '@/lib/analytics/client';
import { useCustomerSubmission } from '@/components/common/useCustomerSubmission';
import CustomerSubmissionFeedback from '@/components/common/CustomerSubmissionFeedback';
import type { CustomerSubmitResponse } from '@/lib/leads/submission-outcome';

// Props type for ContactForm component
interface ContactFormProps {
  onSubmit: (data: ContactLenderFormData) => Promise<CustomerSubmitResponse> | void;
  derivedStateCode?: string | null;
}

// Define form errors type
type FormErrors = Partial<Record<keyof ContactLenderFormData, { message?: string }>>;

const ContactLenderForm: React.FC<ContactFormProps> = ({ onSubmit, derivedStateCode }) => {
  const { open: openConcierge } = useConcierge();

  const handleConciergeCta = () => {
    openConcierge({
      topic: 'lender',
      openingMessage: 'I need help with a VA-friendly lender.',
    });
  };

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactLenderFormData>({
    resolver: yupResolver(contactLenderClientSchema) as Resolver<ContactLenderFormData>,
    shouldFocusError: false,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentBase: '',
      state: derivedStateCode ?? '',
      destinationBase: '',
      additionalComments: '',
      howDidYouHear: '',
      tellusMore: '',
    },
  });

  const { ref: honeypotRef, getSpamFields } = useHoneypot();

  useEffect(() => {
    if (derivedStateCode) {
      setValue('state', derivedStateCode, { shouldValidate: true });
    }
  }, [derivedStateCode, setValue]);

  const { isSubmitting, focusRequest, onFormSubmit, setSubmitButton, submitLabel, ...feedback } = useCustomerSubmission({
    formId: 'contact_lender',
    form: { handleSubmit, getValues, setError, reset },
    onSubmit,
    getSpamFields,
  });

  // Error rendering function
  const renderError = (fieldName: keyof FormErrors) => {
    const error = errors[fieldName];
    return error ? (
      <span id={`${fieldName}-error`} className="text-error">{error.message}</span>
    ) : null;
  };

  const [lenderName, setLenderName] = useState('Us');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lenderFirstName = urlParams.get('fn') || 'Us';
    setLenderName(lenderFirstName);
  }, [])

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form
          noValidate
          onSubmit={onFormSubmit}
          onFocus={() => trackFormStarted('contact_lender')}
        >
          <HoneypotField ref={honeypotRef} />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Contact {lenderName}
              </h1>
              <p className="text-[#575F6E] roboto text-base font-black mt-3">
                This information is strictly used to connect you and the lender directly. Be sure to check your spam/junk folder if you do not receive a confirmation email.
              </p>
            </div>
            <CustomerValidationSummary errors={errors} focusRequest={focusRequest} />
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    First name*
                  </label>
                  <input
                    {...register('firstName')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    {...customerErrorProps(errors, 'firstName')}
                    placeholder="Alexander"
                    autoComplete="given-name"
                  />
                  {renderError('firstName')}
                </div>

                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Last name*
                  </label>
                  <input
                    {...register('lastName')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    {...customerErrorProps(errors, 'lastName')}
                    placeholder="Smith"
                    autoComplete="family-name"
                  />
                  {renderError('lastName')}
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="email"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Email
                  </label>
                  <input
                    {...register('email')}
                    className="px-2 py-1 w-full border-b border-[#E2E4E5]"
                    type="email"
                    id="email"
                    {...customerErrorProps(errors, 'email')}
                    placeholder="alex_manager@gmail.com"
                    autoComplete="email"
                  />
                  {renderError('email')}
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Phone
                  </label>
                  <input
                    {...register('phone')}
                    className="border-b border-[#E2E4E5] py-1 px-2"
                    type="tel"
                    id="phone"
                    {...customerErrorProps(errors, 'phone')}
                    placeholder="+1 555 555-1234"
                    autoComplete="tel"
                  />
                  {renderError('phone')}
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="currentBase"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Current Base/City*
                  </label>
                  <input
                    {...register('currentBase')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="currentBase"
                    {...customerErrorProps(errors, 'currentBase')}
                    placeholder="Current Base/City"
                    autoComplete="off"
                  />
                  {renderError('currentBase')}
                </div>
                {!derivedStateCode && (
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="state"
                      className="text-[#242426] text-sm font-normal mb-1"
                    >
                      What state are you buying/selling in?*
                    </label>
                    <select
                      id="state"
                      {...customerErrorProps(errors, 'state')}
                      {...register('state')}
                      className="border-b border-[#E2E4E5] px-2 py-3 min-h-[44px] bg-white"
                    >
                      <option value="">Select State</option>
                      {US_STATE_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    {renderError('state')}
                  </div>
                )}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="destinationBase"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Destination Base/City*
                  </label>
                  <input
                    {...register('destinationBase')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="destinationBase"
                    {...customerErrorProps(errors, 'destinationBase')}
                    placeholder="Destination Base/City"
                    autoComplete="off"
                  />
                  {renderError('destinationBase')}
                </div>

                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="additionalComments"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Additional Comments
                  </label>
                  <textarea
                    {...register('additionalComments')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="additionalComments"
                    {...customerErrorProps(errors, 'additionalComments')}
                    placeholder="Add comments"
                    autoComplete="off"
                  />
                  {errors.additionalComments && <p id="additionalComments-error" className="text-error">{errors.additionalComments.message}</p>}
                </div>

                <HowDidYouHearAboutUs
                  register={register}
                  watch={watch}
                  errors={errors}
                  customerAccessibility
                />
              </div>
            </div>

            <CustomerSubmissionFeedback {...feedback} isSubmitting={isSubmitting} />
            <div className="flex md:justify-start justify-center flex-col md:items-start items-center gap-3">
              <button
                type="submit"
                ref={setSubmitButton}
                disabled={isSubmitting}
                className={`rounded-md border border-[#BBBFC1] ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#292F6C]'} px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg`}
              >
                {submitLabel}
              </button>
              {featureFlags.conciergeEnabled && (
                <button
                  type="button"
                  onClick={handleConciergeCta}
                  className="text-sm text-primary hover:underline focus:outline-none focus-visible:underline min-h-[44px]"
                >
                  Or chat with our concierge instead.
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactLenderForm;
