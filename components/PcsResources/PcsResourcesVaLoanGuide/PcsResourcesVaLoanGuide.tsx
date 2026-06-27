"use client";
import React from "react";
import "@/app/globals.css";
import Link from "next/link";
import classes from "./PcsResourcesVaLoanGuide.module.css";
import Image from "next/image";
import { useForm, SubmitHandler } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { vaLoanGuideForm } from "@/services/salesForcePostFormsService";
import { sendGTMEvent } from "@next/third-parties/google";
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';
import {
  captureAnalyticsEvent,
  formTrackingPayload,
  trackFormStarted,
  trackFormSubmitAttempted,
  trackFormSubmissionFailed,
  trackFormValidationFailed,
} from '@/lib/analytics/client';

type FormInputs = {
  firstName: string;
  lastName: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormInputs, { message?: string }>>;

const PcsResourcesVaLoanGuide = () => {
  const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
  });

  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormInputs>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const { ref: honeypotRef, getSpamFields } = useHoneypot();

  const onSubmitHandler: SubmitHandler<FormInputs> = async (data) => {
    captureAnalyticsEvent('guide_download_requested', {
      guide_id: 'va_loan_guide',
      form_id: 'va_loan_guide',
      has_email: Boolean(data.email),
    });
    try {
      sendGTMEvent({
        event: "conversion_download",
        content: "VA Loan Guide",
      });

      const server_response = await vaLoanGuideForm({
        ...data,
        ...getSpamFields(),
        ...formTrackingPayload(),
      });
      if (server_response?.success) {
        setValue('firstName', '');
        setValue('lastName', '');
        setValue('email', '');
        captureAnalyticsEvent('guide_download_started', {
          guide_id: 'va_loan_guide',
          form_id: 'va_loan_guide',
        });

        const link = document.createElement('a');
        link.href = '/downloads/VA-Loan-Guide.pdf';  // Note: case-sensitive path
        link.download = 'VA-Loan-Guide.pdf';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        trackFormSubmissionFailed('va_loan_guide', 'server_submission', ['no_success_response'], {
          guide_id: 'va_loan_guide',
        });
        console.log("No redirect URL found");
      }
    } catch (error) {
      trackFormSubmissionFailed('va_loan_guide', 'server_submission', ['submission_exception'], {
        guide_id: 'va_loan_guide',
      });
      console.error('Error submitting form:', error);
    }
  };

  const handleInvalidSubmit = (formErrors: typeof errors) => {
    trackFormValidationFailed('va_loan_guide', formErrors, { guide_id: 'va_loan_guide' });
  };

  const trackSubmitAttempt = () => {
    const values = getValues();
    trackFormSubmitAttempted('va_loan_guide', {
      guide_id: 'va_loan_guide',
      has_email: Boolean(values.email),
      has_phone: false,
    });
  };

  return (
    <div className={classes.pcsresourcesvaloanguide}>
      <div className="container mx-auto px-5">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-6">
          <form
            onSubmit={(event) => {
              trackSubmitAttempt();
              void handleSubmit(onSubmitHandler, handleInvalidSubmit)(event);
            }}
            onFocus={() => trackFormStarted('va_loan_guide', { guide_id: 'va_loan_guide' })}
          >
            <HoneypotField ref={honeypotRef} />
            <div className="lg:px-20 mg:px-20 sm:px-10 px-10 order-2 sm:order-1">
              <div className="text-center">
                <h2 className="text-[#FFFFFF] text-center poppins lg:text-[36px] md:text-[36px] sm:text-[22px] text-[22px] font-bold">
                  VA Loan Guide
                </h2>
                <p className="text-[#FFFFFF] text-center roboto lg:text-[21px] md:text-[21px] sm:text-[16px] text-[16px] font-medium lg:w-[550px] mx-auto mt-4 mb-10">
                  Important considerations on income and orders when you&apos;re
                  planning your next move.
                </p>
              </div>
              <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 gap-4 mt-10">
                <div className="mb-3">
                  <input
                    className={classes.KeepInTouchInput}
                    type="text"
                    placeholder="First Name*"
                    id="firstName"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <span className="text-red-500">{errors.firstName.message}</span>
                  )}
                </div>
                <div className="mb-3">
                  <input
                    className={classes.KeepInTouchInput}
                    type="text"
                    placeholder="Last Name*"
                    id="lastName"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="text-red-500">{errors.lastName.message}</span>
                  )}
                </div>
                <div className="mb-7">
                  <input
                    className={classes.KeepInTouchInput}
                    type="email"
                    placeholder="Email*"
                    id="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <span className="text-red-500">{errors.email.message}</span>
                  )}
                </div>
              </div>
              <div>
                <button type="submit" className="border-2 border-white rounded-md text-center block w-full py-3 text-white roboto lg:text-[20px] md:text-[20px] sm:text-[14px] text-[14px] font-medium mt-8 mb-3">
                  Download For Free
                </button>
              </div>
              <div className="text-center">
                <Link
                  href="#"
                  className="text-white text-center roboto lg:text-[14px ] md:text-[14px] sm:text-[12px] text-[12px] font-medium"
                >
                  Fields marked with an asterisk (*) are required.
                </Link>
              </div>
            </div>
          </form>
          <div className="order-1 sm:order-2">
            <Image
              width={567}
              height={567}
              src="/assets/military-meet.png"
              alt="check"
              className="lg:w-[567px] lg:h-[567px] md:w-[567px] md:h-[567px] sm:w-full sm:h-full w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesVaLoanGuide;
