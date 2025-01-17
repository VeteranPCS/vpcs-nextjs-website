"use client";
import React, { useState, useEffect, useCallback } from "react"; // No need for useState or useEffect
import "@/styles/globals.css";
import classes from "./KeepInTouch.module.css";
import Image from "next/image";
import Link from "next/link";
import mediaAccountService from "@/services/mediaAccountService";
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ReCAPTCHA from 'react-google-recaptcha';
import { KeepInTouchForm } from "@/services/salesForcePostFormsService";
import { useRouter, usePathname } from 'next/navigation'
import { sendGTMEvent } from "@next/third-parties/google";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export interface MediaAccountProps {
  _id: string;
  name: string;
  designation?: string;
  icon: string;
  link: string;
}

interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

type FormErrors = Partial<Record<keyof ContactFormData, { message?: string }>>;

const contactFormSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  captchaToken: yup.string().required('Please complete the reCAPTCHA'),
  captcha_settings: yup.string().required('Please complete the reCAPTCHA'),
});

const KeepInTouch = () => {
  const router = useRouter()
  const pathname = usePathname()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: yupResolver<ContactFormData>(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      captchaToken: '',
      captcha_settings: '',
    },
  });

  const [mediaAccount, SetMediaAccount] = useState<MediaAccountProps[]>([]);

  const handleFormSubmission = async (data: ContactFormData) => {
    try {
      sendGTMEvent({
        event: 'keep_in_touch_form_submission',
        page: pathname,
      });
      const server_response = await KeepInTouchForm(data);
      if (server_response?.success) {
        router.push(`${BASE_URL}/thank-you`);
      } else {
        console.log("No redirect URL found");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const fetchMediaAccounts = useCallback(async () => {
    try {
      const response = await mediaAccountService.fetchAccounts();
      SetMediaAccount(response);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  }, []);

  const onCaptchaChange = (token: string | null) => {
    if (token) {
      const captchaSettingsElem = document.getElementById('captcha_settings') as HTMLInputElement | null;
      if (captchaSettingsElem) {
        const captchaSettings = JSON.parse(captchaSettingsElem.value);
        captchaSettings.ts = JSON.stringify(new Date().getTime());
        captchaSettingsElem.value = JSON.stringify(captchaSettings);
        setValue('captcha_settings', captchaSettingsElem.value, {
          shouldValidate: false // This triggers validation after setting the value
        });
        setValue('captchaToken', token, {
          shouldValidate: true // This triggers validation after setting the value
        });
      }
    }
  };

  useEffect(() => {
    fetchMediaAccounts();
  }, [fetchMediaAccounts]);

  const renderError = (fieldName: keyof FormErrors) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
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
                    <Link href={acc.link}>
                      <Image
                        width={50}
                        height={50}
                        src={`/icon/${acc.icon}`}
                        alt={acc.name}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 lg:mt-0 md:mt-0 sm:mt-5">
            <div className={classes.CustomResponsiveCenter}>
              <form onSubmit={handleSubmit(handleFormSubmission)}>
                <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />
                <h2 className="lg:text-[36px] sm:text-[25px] text-[25px] poppins font-bold text-[#292F6C] lg:text-left md:text-left sm:text-center text-center">
                  Keep In Touch
                </h2>
                <p className="text-[#292F6C] font-bold lg:text-[21px] sm:text-[15px] text-[15px] roboto mb-6 lg:text-left md:text-left sm:text-center text-center">
                  No spam mail, no fees. VeteranPCS is free to use.
                </p>
                <div className="flex flex-col mb-5">
                  <input
                    className={classes.KeepInTouchInput}
                    type="text"
                    {...register('firstName')}
                    placeholder="First Name*"
                  />
                  {renderError('firstName')}
                </div>
                <div className="flex flex-col mb-5">
                  <input
                    className={classes.KeepInTouchInput}
                    type="text"
                    placeholder="Last Name*"
                    {...register('lastName')}
                  />
                  {renderError('lastName')}
                </div>
                <div className="flex flex-col mb-5">
                  <input
                    className={classes.KeepInTouchInput}
                    type="email"
                    placeholder="Email*"
                    {...register('email')}
                  />
                  {renderError('email')}
                </div>
                <p className="text-[#292F6C] roboto lg:text-[14px] sm:text-[9px] text-[9px] font-medium mb-3 text-left md:pl-0 sm:pl-3 pl-3">
                  Fields marked with an asterisk (*) are required.
                </p>
                <div className="flex items-center md:pl-0 sm:pl-3 pl-3">
                  <div className="w-[200px] flex flex-wrap items-center gap-4">
                    <div>
                      <ReCAPTCHA
                        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                        onChange={onCaptchaChange} // Handle reCAPTCHA value change
                      />
                      {renderError('captchaToken')}
                    </div>
                    <div className="lg:py-8 md:py-8 sm:py-2 py-2">
                      <button
                        type="submit"
                        className="items-center bg-[#A81F23] w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[20px] px-[20px] xl:py-[15px] lg:py-[15px] sm:py-[14px] py-[14px] rounded-[16px] text-center tracking-[1px] hover:tracking-[5px] duration-500 transition-all"
                      >
                        <span
                          className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal leading-6 bg-cover 
            text-white text-nowrap tahoma"
                        >
                          Submit
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
