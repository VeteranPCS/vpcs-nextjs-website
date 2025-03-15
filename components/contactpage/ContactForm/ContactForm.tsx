"use client"
import Button from "@/components/common/Button";
import "@/app/globals.css";
import classes from "./ContactForm.module.css";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import mediaAccountService from "@/services/mediaAccountService";
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ReCAPTCHA from 'react-google-recaptcha';
import { contactPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from "next/navigation";
import { sendGTMEvent } from "@next/third-parties/google";

interface MediaAccountProps {
  _id: string;
  name: string;
  designation?: string;
  icon: string;
  link: string;
}

export interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  captchaToken?: string;
  captcha_settings?: string;
  additionalComments?: string;
}

type FormErrors = Partial<Record<keyof ContactFormData, { message?: string }>>;

const contactFormSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  additionalComments: yup.string(),
  captchaToken: yup.string().required('Please complete the reCAPTCHA'),
  captcha_settings: yup.string().required('Please complete the reCAPTCHA'),
});

const ContactForm = () => {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const router = useRouter();
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
      additionalComments: '',
      captchaToken: '',
      captcha_settings: '',
    },
  });

  async function onSubmit(data: ContactFormData) {
    try {
      sendGTMEvent({
        event: 'contact_form_submission',
      });

      const server_response = await contactPostForm(data);
      if (server_response?.success) {
        router.push(`${BASE_URL}/thank-you`);
      } else {
        console.log("No redirect URL found");
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }
  const [mediaAccount, SetMediaAccount] = useState<MediaAccountProps[]>([]);
  const fetchMediaAccounts = useCallback(async () => {
    try {
      const response = await mediaAccountService.fetchAccounts()
      SetMediaAccount(response)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }, [])

  useEffect(() => {
    fetchMediaAccounts()
  }, [fetchMediaAccounts])

  // Error rendering function
  const renderError = (fieldName: keyof FormErrors) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
  };

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

  return (
    <div className="container mx-auto flex flex-wrap justify-center lg:py-12 md:py-12 sm:py-2 py-2 gap-10">
      <div className="flex flex-wrap justify-around rounded-[12.128px] bg-white shadow-[0px_0px_72.766px_36.383px_rgba(0,0,0,0.03)] p-4 w-full overflow-hidden mx-8 md:mb-0 mb-5">
        <div className="md:w-1/3 sm:w-full w-full ">
          <div className={classes.Container}>
            <Link href="/get-listed-agents" className="block justify-start items-center gap-4 flex-wrap">
              <Button
                buttonText="Agents, Get Listed Here"
                divClassName="!pb-0"
                buttonClassName="border border-white border-2"
              />
            </Link>
            <Link href="/get-listed-lenders" className="block justify-start items-center gap-4 flex-wrap mb-6">
              <Button
                buttonText="Lenders, Get Listed Here"
                buttonClassName="border border-white border-2"
              />
            </Link>

            <div className={classes.Heading}>
              We would love to hear from you
            </div>
            <div className={classes.Subtext}>
              We will get back with you within two business days!
              Thank you for reaching out!
            </div>
            <div className="mt-10">
              <div className="flex flex-col gap-4 mb-10 sm:mb-0">
                <div className={classes.ContactItem}>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/phone-call.svg"
                    alt="phone"
                  />
                  <Link href="tel:7192494757">719-249-4757</Link>
                </div>
                <div className={classes.ContactItem}>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/sharp-email.svg"
                    alt="phone"
                  />
                  <Link href="mailto:info@veteranpcs.com">info@veteranpcs.com</Link>
                </div>
              </div>
            </div>
            <div>
              <ul className="flex items-center md:justify-start justify-center gap-4 mt-5">
                {mediaAccount.map((acc) => (
                  <li key={acc._id} className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-2">
                    <Link href={acc.link}>
                      <Image
                        width={100}
                        height={100}
                        src={`/icon/${acc.icon}`}
                        alt={acc.name}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="md:w-2/3 sm:w-full w-full relative md:px-10 lg:px-20 mt-10 md:mt-0">

          <form onSubmit={handleSubmit(onSubmit)}>
            <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />
            <div className={classes.FormContainer}>
              <div className="w-full">
                <div className="grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1  gap-5 mb-10">
                  <div className={classes.FormGroup}>
                    <label className={classes.Label} htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      {...register('firstName')}
                      className={classes.Input}
                      type="text"
                      id="firstName"
                      placeholder="First Name"
                    />
                    {renderError('firstName')}
                  </div>

                  <div className={classes.FormGroup}>
                    <label className={classes.Label} htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      className={classes.Input}
                      type="text"
                      placeholder="Last Name"
                      id="lastName"
                      {...register('lastName')}
                    />
                    {renderError('lastName')}
                  </div>
                  <div className={classes.FormGroup}>
                    <label className={classes.Label} htmlFor="email">
                      Email
                    </label>
                    <input
                      className={classes.Input}
                      type="email"
                      id="email"
                      placeholder="Email"
                      {...register('email')}
                    />
                    {renderError('email')}
                  </div>
                </div>

                <div className={classes.FormGroup}>
                  <label className={classes.label} htmlFor="message">
                    Message
                  </label>
                  <textarea
                    className={classes.TextArea}
                    id="message"
                    placeholder="Write your message.."
                    {...register('additionalComments')}
                    rows={1}
                  ></textarea>
                </div>

                <div className={classes.FormGroup}>
                  <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                    onChange={onCaptchaChange} // Handle reCAPTCHA value change
                  />
                  {renderError('captchaToken')}
                </div>
                <div className="flex justify-end lg:py-8 md:py-8 sm:py-2 py-2">
                  <button
                    type="submit"
                    className="items-center bg-[#A81F23] w-auto inline-flex xl:px-[30px] lg:px-[30px] sm:px-[20px] px-[20px] xl:py-[15px] lg:py-[15px] sm:py-[14px] py-[14px] rounded-[16px] text-center tracking-[1px] hover:tracking-[5px] duration-500 transition-all"
                  >
                    <span
                      className="xl:text-[18px] lg:text-[18px] md:text-[18px] sm:text-[14px] text-[14px] font-normal leading-6 bg-cover 
                        text-white text-nowrap tahoma"
                    >
                      Send Message
                    </span>
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
