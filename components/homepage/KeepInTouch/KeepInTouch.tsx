"use client";
import React, { useState, useEffect, useCallback } from "react"; // No need for useState or useEffect
import "@/app/globals.css";
import classes from "./KeepInTouch.module.css";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { clientMediaAccountService } from "@/services/clientMediaAccountService";
import type { MediaAccountProps } from "@/services/mediaAccountTypes";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { KeepInTouchForm } from "@/services/salesForcePostFormsService";
import { useRouter, usePathname } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';
import {
  formTrackingPayload,
  trackFormStarted,
  trackFormSubmitAttempted,
  trackFormSubmissionFailed,
  trackFormValidationFailed,
} from '@/lib/analytics/client';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
}

type FormErrors = Partial<Record<keyof ContactFormData, { message?: string }>>;

const contactFormSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
});

const KeepInTouch = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: yupResolver<ContactFormData>(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  const { ref: honeypotRef, getSpamFields } = useHoneypot();

  const [mediaAccount, SetMediaAccount] = useState<MediaAccountProps[]>([]);

  const handleFormSubmission = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      sendGTMEvent({
        event: 'keep_in_touch_form_submission',
        page: pathname,
      });
      const server_response = await KeepInTouchForm({
        ...data,
        ...getSpamFields(),
        ...formTrackingPayload(),
      });
      if (server_response?.success) {
        reset();
        window.location.href = `${BASE_URL}/thank-you`;
        return;
      } else {
        trackFormSubmissionFailed('keep_in_touch', 'server_submission', ['no_success_response']);
        console.log("No redirect URL found");
      }
    } catch (error) {
      trackFormSubmissionFailed('keep_in_touch', 'server_submission', ['submission_exception']);
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchMediaAccounts = useCallback(async () => {
    try {
      const response = await clientMediaAccountService.fetchAccounts();
      SetMediaAccount(response);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, []);

  useEffect(() => {
    fetchMediaAccounts();
  }, [fetchMediaAccounts]);

  const renderError = (fieldName: keyof FormErrors) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
  };

  const handleInvalidSubmit = (formErrors: typeof errors) => {
    trackFormValidationFailed('keep_in_touch', formErrors);
  };

  const trackSubmitAttempt = () => {
    const values = getValues();
    trackFormSubmitAttempted('keep_in_touch', {
      has_email: Boolean(values.email),
      has_phone: false,
    });
  };

  return (
    <div className="bg-[#EEEEEE] py-12">
      <div className="container mx-auto mb-12">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3">
          <div className="lg:text-left md:text-left sm:text-center text-center">
            <div className={classes.mobileviewkissplogo}>
              <Image
                width={100}
                height={100}
                className="lg:w-auto lg:h-auto md:w-auto md:h-auto sm:w-[300px] sm:h-auto w-[300px] h-auto mx-auto sm:mx-0"
                src="/icon/veteran-pcs-logo-white.svg"
                alt="Description of the image"
              />
              <p className="text-[#292F6C] tahoma text-lg font-normal leading-[30px] lg:w-[300px]  my-7">
                Together we&apos;ll make it home. Veteran & Military Spouse Real
                Estate Agents and VA Loan Experts You Can Trust
              </p>
            </div>
            <div className="flex justify-center sm:justify-center md:justify-start lg:justify-start">
              <ul className="flex items-center gap-4">
                {mediaAccount.map((acc) => (
                  <li
                    key={acc._id}
                    className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2"
                  >
                    <TrackedCtaLink
                      href={acc.link}
                      cta={{
                        ctaId: 'keep_in_touch_social',
                        ctaIntent: 'social_navigation',
                        ctaPosition: 'keep_in_touch',
                        ctaComponent: 'keep_in_touch',
                        ctaLabel: acc.name,
                        destination: acc.link,
                        pageType: 'homepage',
                      }}
                    >
                      <Image
                        width={50}
                        height={50}
                        src={`/icon/${acc.icon}`}
                        alt={acc.name}
                      />
                    </TrackedCtaLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 lg:mt-0 md:mt-0 sm:mt-5">
            <div className={classes.CustomResponsiveCenter}>
              <form
                onSubmit={(event) => {
                  trackSubmitAttempt();
                  void handleSubmit(handleFormSubmission, handleInvalidSubmit)(event);
                }}
                onFocus={() => trackFormStarted('keep_in_touch')}
              >
                <h2 className="lg:text-[36px] sm:text-[25px] text-[25px] poppins font-bold text-primary lg:text-left md:text-left sm:text-center text-center">
                  Keep In Touch
                </h2>
                <p className="text-primary font-bold lg:text-[21px] sm:text-[15px] text-[15px] roboto mb-6 lg:text-left md:text-left sm:text-center text-center">
                  No spam mail, no fees. VeteranPCS is free to use.
                </p>
                <div className="flex flex-col mb-5">
                  <label htmlFor="keep-first-name" className="mb-2 text-left text-sm font-semibold text-primary roboto">
                    First name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="keep-first-name"
                    className={classes.KeepInTouchInput}
                    type="text"
                    {...register('firstName')}
                    autoComplete="given-name"
                  />
                  {renderError('firstName')}
                </div>
                <div className="flex flex-col mb-5">
                  <label htmlFor="keep-last-name" className="mb-2 text-left text-sm font-semibold text-primary roboto">
                    Last name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="keep-last-name"
                    className={classes.KeepInTouchInput}
                    type="text"
                    {...register('lastName')}
                    autoComplete="family-name"
                  />
                  {renderError('lastName')}
                </div>
                <div className="flex flex-col mb-5">
                  <label htmlFor="keep-email" className="mb-2 text-left text-sm font-semibold text-primary roboto">
                    Email <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="keep-email"
                    className={classes.KeepInTouchInput}
                    type="email"
                    {...register('email')}
                    autoComplete="email"
                  />
                  {renderError('email')}
                </div>
                <p className="text-primary roboto text-xs lg:text-sm max-w-[390px] sm:max-w-full mx-auto font-medium mb-3 text-left md:pl-0 sm:pl-3 pl-3">
                  Fields marked with an asterisk (*) are required.
                </p>
                <HoneypotField ref={honeypotRef} />
                <div className="flex items-center md:pl-0 sm:pl-3 pl-3 max-w-[390px] mx-auto sm:max-w-full">
                  <div className="w-[200px] flex md:flex-nowrap flex-wrap items-center gap-4">
                    <div className="lg:py-8 md:py-8 sm:py-2 py-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
	                        className={`inline-flex min-h-11 items-center rounded-2xl px-5 py-3.5 text-center transition-colors duration-200 sm:px-5 lg:px-[30px] lg:py-[15px] xl:px-[30px] xl:py-[15px] ${isSubmitting ? 'cursor-not-allowed bg-gray-400' : 'bg-accent-red hover:bg-accent-red-dark'}`}
                      >
                        <span
                          className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeepInTouch;
