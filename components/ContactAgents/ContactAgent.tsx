"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { ContactAgentFormData } from '@/types';
import { useConcierge } from '@/components/Concierge';
import { featureFlags } from '@/lib/feature-flags';
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';
import { US_STATE_CODES } from '@/constants/usStates';
import CustomerValidationSummary, { customerErrorProps } from '@/components/common/CustomerValidationSummary';
import { contactAgentClientSchema } from '@/lib/validation/contactForms';
import { captureAnalyticsEvent, trackFormStarted } from '@/lib/analytics/client';
import { useCustomerSubmission } from '@/components/common/useCustomerSubmission';
import CustomerSubmissionFeedback from '@/components/common/CustomerSubmissionFeedback';
import type { CustomerSubmitResponse } from '@/lib/leads/submission-outcome';
import { consumeContactPrefill } from '@/lib/leads/contact-prefill';
import {
  CONTACT_AGENT_FORM_REGION_ID,
  readSelectedAgent,
  type ContactAgentExperiment,
  type SelectedAgent,
} from '@/lib/experiments/desktop-contact-agent';
import v2 from './ContactAgentV2.module.css';

interface ContactFormProps {
  onSubmit: (data: ContactAgentFormData & { submission_attempt_id: string }) => Promise<CustomerSubmitResponse>;
  derivedStateCode?: string | null;
  /**
   * The page's current query string, passed by the page so the form follows a change of
   * selected agent without a page load. Omitted or null: read the address once on mount.
   */
  urlSearch?: string | null;
  /** desktop-contact-agent-v2 experiment. Only `test` adds markup; CSS limits it to desktop. */
  experiment?: ContactAgentExperiment | null;
}

const ContactAgentForm = ({ onSubmit, derivedStateCode, urlSearch, experiment }: ContactFormProps) => {
  const {
    register,
    handleSubmit,
    getValues,
    getFieldState,
    setError,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ContactAgentFormData>({
    resolver: yupResolver(contactAgentClientSchema) as Resolver<ContactAgentFormData>,
    shouldFocusError: false,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentBase: '',
      state: derivedStateCode ?? '',
      destinationBase: '',
      howDidYouHear: '',
      tellusMore: '',
      additionalComments: '',
    },
  });

  // Only a deliberate guide-success contact click supplies this one-time handoff.
  // Apply once across experiment/query rerenders and never replace edited/autofilled fields.
  const checkedPrefill = useRef(false);
  useEffect(() => {
    if (checkedPrefill.current) return;
    checkedPrefill.current = true;
    const params = new URLSearchParams(urlSearch ?? window.location.search);
    const details = consumeContactPrefill(params.get('id'));
    if (!details) return;
    for (const field of ['firstName', 'lastName', 'email'] as const) {
      if (!getFieldState(field).isDirty && !getValues(field)) {
        setValue(field, details[field]);
      }
    }
  }, [urlSearch, getFieldState, getValues, setValue]);

  const howDidYouHearValue = watch("howDidYouHear");
  const destinationBaseValue = watch("destinationBase");
  const { open: openConcierge } = useConcierge();
  const { ref: honeypotRef, getSpamFields } = useHoneypot();

  // The state follows the address. When a new address stops naming one, the value the old
  // address supplied is cleared so the visitor picks, rather than silently keeping a state
  // that belonged to the previous agent. A state the visitor picked themselves is kept.
  const stateCameFromAddress = useRef(false);
  useEffect(() => {
    if (derivedStateCode) {
      setValue('state', derivedStateCode, { shouldValidate: true });
      stateCameFromAddress.current = true;
    } else if (stateCameFromAddress.current) {
      setValue('state', '');
      stateCameFromAddress.current = false;
    }
  }, [derivedStateCode, setValue]);

  const handleConciergeCta = () => {
    const destination = destinationBaseValue?.trim();
    const openingMessage = destination
      ? `I need help finding an agent in ${destination}.`
      : 'I need help finding an agent.';
    openConcierge({ topic: 'agent', openingMessage });
  };

  const { isSubmitting, focusRequest, onFormSubmit, blocked, submitLabel, failure, showValidationFeedback } = useCustomerSubmission({
    formId: 'contact_agent',
    form: { handleSubmit, getValues, setError, reset },
    onSubmit,
    getSpamFields,
  });

  const [agentName, setAgentName] = useState('Us');

  useEffect(() => {
    const urlParams = new URLSearchParams(urlSearch ?? window.location.search);
    const agentFirstName = urlParams.get('fn') || 'Us';
    setAgentName(agentFirstName);
  }, [urlSearch])

  // Treatment only. Read before paint so the heading and agent panel never flash in late.
  const treatment = experiment?.variant === 'test';
  const [selection, setSelection] = useState<{ agent: SelectedAgent | null; firstName: string | null }>({ agent: null, firstName: null });
  useLayoutEffect(() => {
    if (!treatment) return;
    const urlParams = new URLSearchParams(urlSearch ?? window.location.search);
    setSelection({ agent: readSelectedAgent(urlParams.get('id')), firstName: urlParams.get('fn') });
  }, [treatment, urlSearch]);
  const treatmentHeading = selection.agent
    ? `Contact ${selection.agent.name}`
    : selection.firstName
      ? `Contact ${selection.firstName}`
      : "Tell us where you're moving. We'll match you with an agent.";


  const startedExperiment = useRef<string | null>(null);
  const onFormFocus = () => {
    trackFormStarted('contact_agent');
    if (!experiment || startedExperiment.current === experiment.viewId) return;
    startedExperiment.current = experiment.viewId;
    captureAnalyticsEvent('contact_agent_experiment_form_started', {
      form_id: 'contact_agent',
      contact_agent_experiment_view_id: experiment.viewId,
    });
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div id={CONTACT_AGENT_FORM_REGION_ID} aria-labelledby="contact-agent-heading" className={`md:w-[456px] mx-auto my-10 ${v2.region}`}>
        <form
          noValidate
          onSubmit={onFormSubmit}
          onFocus={onFormFocus}
        >
          <HoneypotField ref={honeypotRef} />
          <div className={`flex flex-col gap-8 ${v2.stack}`}>
            <div className={`md:text-left text-center ${v2.intro}`}>
              <h1 id="contact-agent-heading" className="text-[#7E1618] lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                <span className={treatment ? v2.controlOnly : undefined}>Contact {agentName}</span>
                {treatment && <span className={v2.testOnly}>{treatmentHeading}</span>}
              </h1>
              {treatment && selection.agent && (selection.agent.photo || selection.agent.service || selection.agent.brokerage) && (
                <div className={v2.agentPanel} data-selected-agent-panel>
                  {selection.agent.photo && (
                    <Image
                      src={selection.agent.photo}
                      alt={`${selection.agent.name}'s profile picture`}
                      width={200}
                      height={200}
                      sizes="(min-width: 768px) 200px, 100px"
                      className={v2.agentPhoto}
                    />
                  )}
                  <div>
                    {selection.agent.service && <p className={v2.agentService}>{selection.agent.service}</p>}
                    {selection.agent.brokerage && <p className={v2.agentBrokerage}>{selection.agent.brokerage}</p>}
                  </div>
                </div>
              )}
              <h2 className="text-[#242426] my-2 lg:text-[23px] md:text-[22px] sm:text-[18px] text-[18px] font-bold leading-6">
                No spam mail, no fees. VeteranPCS is free to use.
              </h2>
              <p className="text-[#575F6E] roboto text-base font-black mt-8">
                This form is simply used to generate an email with your agent&apos;s information and begin qualifying you for your VeteranPCS Bonus after you close.
              </p>
            </div>
            <CustomerValidationSummary errors={errors} focusRequest={focusRequest} />
            <div className={`border rounded-lg border-[#E2E4E5] p-8 ${v2.card}`}>
              <div>
                {/* First Name */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    First name*
                  </label>
                  <input
                    {...register("firstName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    {...customerErrorProps(errors, 'firstName')}
                    placeholder="Alexander"
                    autoComplete="given-name"
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                {/* Last Name */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Last name*
                  </label>
                  <input
                    {...register("lastName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    {...customerErrorProps(errors, 'lastName')}
                    placeholder="Smith"
                    autoComplete="family-name"
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                  )}
                </div>
                {/* Email */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="email"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Email
                  </label>
                  <input
                    {...register("email")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="email"
                    id="email"
                    {...customerErrorProps(errors, 'email')}
                    placeholder="alex_manager@gmail.com"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                {/* Phone */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Phone
                  </label>
                  <input
                    {...register("phone")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="tel"
                    id="phone"
                    {...customerErrorProps(errors, 'phone')}
                    placeholder="+1 555 555-1234"
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p id="phone-error" className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
                {/* Current Base/City */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="currentBase"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Current Base/City*
                  </label>
                  <input
                    {...register("currentBase")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="currentBase"
                    {...customerErrorProps(errors, 'currentBase')}
                    placeholder="Current Base/City"
                    autoComplete="off"
                  />
                  {errors.currentBase && (
                    <p id="currentBase-error" className="text-red-500 text-xs mt-1">{errors.currentBase.message}</p>
                  )}
                </div>
                {/* Destination State */}
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
                    {errors.state && (
                      <p id="state-error" className="text-red-500 text-xs mt-1">{errors.state.message}</p>
                    )}
                  </div>
                )}

                {/* Destination Base/City */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="destinationBase"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Destination Base/City*
                  </label>
                  <input
                    {...register("destinationBase")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="destinationBase"
                    {...customerErrorProps(errors, 'destinationBase')}
                    placeholder="Destination Base/City"
                    autoComplete="off"
                  />
                  {errors.destinationBase && (
                    <p id="destinationBase-error" className="text-red-500 text-xs mt-1">{errors.destinationBase.message}</p>
                  )}
                </div>

                {/* How did you hear about us */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    How did you hear about us?
                  </label>
                  <select
                    {...register('howDidYouHear')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="howDidYouHear"
                    {...customerErrorProps(errors, 'howDidYouHear')}
                  >
                    <option value="">Select an option</option>
                    <option value="Google">Google</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Linkedin">LinkedIn</option>
                    <option value="Tiktok">TikTok</option>
                    <option value="Base Event">Base Event</option>
                    <option value="Transition Brief">Transition Brief</option>
                    <option value="Agent Referral">Agent Referral</option>
                    <option value="Friend Referral">Friend Referral</option>
                    <option value="Skillbridge">Skillbridge</option>
                    <option value="Youtube">YouTube</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.howDidYouHear && (
                    <span id="howDidYouHear-error" className="text-error">{errors.howDidYouHear.message}</span>
                  )}
                </div>

                {howDidYouHearValue === 'Other' && (
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="tellusMore"
                      className="text-[#242426] text-sm font-normal mb-1"
                    >
                      Please tell us more*
                    </label>
                    <input
                      type="text"
                      {...register('tellusMore')}
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      id="tellusMore"
                      {...customerErrorProps(errors, 'tellusMore')}
                      placeholder="Tell us more..."
                    />
                    {errors.tellusMore && (
                      <span id="tellusMore-error" className="text-error">{errors.tellusMore.message}</span>
                    )}
                  </div>
                )}

                {/* Additional Comments */}
                <div className="flex flex-col">
                  <label
                    htmlFor="additionalComments"
                    className="text-[#242426] text-sm font-normal mb-1"
                  >
                    Additional Comments
                  </label>
                  <textarea
                    {...register("additionalComments")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="additionalComments"
                    {...customerErrorProps(errors, 'additionalComments')}
                    placeholder="Additional Comments"
                  />
                  {errors.additionalComments && <p id="additionalComments-error" className="text-error">{errors.additionalComments.message}</p>}
                </div>
              </div>
            </div>
            {/* Submit Button */}
            <CustomerSubmissionFeedback failure={failure} showValidation={showValidationFeedback} />
            <div className={`flex md:justify-start justify-center flex-col md:items-start items-center gap-3 ${v2.actions}`}>
              <button
                type="submit"
                disabled={isSubmitting || blocked}
                className={`rounded-md border border-[#BBBFC1] ${isSubmitting || blocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#292F6C]'} px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg ${v2.submit}`}
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

export default ContactAgentForm;
