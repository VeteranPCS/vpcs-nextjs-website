"use client";
import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReCAPTCHA from 'react-google-recaptcha';

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentBase: string;
  destinationBase: string;
  howDidYouHear: string;
  additionalComments?: string; // Optional field
  tellusMore?: string; // Optional field for 'Other' option
  captchaToken?: string;
  captcha_settings?: string;
}

interface ContactFormProps {
  onSubmit: (data: FormData) => void;
}

// Define validation schema using yup
const contactFormSchema = yup.object().shape({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  phone: yup
    .string()
    .matches(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
    .required("Phone number is required"),
  currentBase: yup.string().required("Current Base/City is required"),
  destinationBase: yup.string().required("Destination Base/City is required"),
  howDidYouHear: yup.string().required("Please select how you heard about us"),
  tellusMore: yup.string().when('howDidYouHear', {
    is: 'Other',
    then: (schema) => schema,
    otherwise: (schema) => schema.nullable(),
  }),
  additionalComments: yup.string().optional(),
});

const ContactAgentForm = ({ onSubmit }: ContactFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentBase: '',
      destinationBase: '',
      howDidYouHear: '',
      tellusMore: '',
      additionalComments: '',
      captchaToken: '',
      captcha_settings: '{}',
    },
  });

  const howDidYouHearValue = watch("howDidYouHear");

  const handleFormSubmit: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
  };

  const onCaptchaChange = (token: string | null) => {
    if (token) {
      const captchaSettingsElem = document.getElementById('captcha_settings') as HTMLInputElement | null;
      if (captchaSettingsElem) {
        const captchaSettings = JSON.parse(captchaSettingsElem.value);
        captchaSettings.ts = JSON.stringify(new Date().getTime());
        captchaSettingsElem.value = JSON.stringify(captchaSettings);
        setValue('captcha_settings', captchaSettingsElem.value);
        setValue('captchaToken', token);
      }
    }
  };

  const [agentName, setAgentName] = useState('Us');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const agentFirstName = urlParams.get('fn') || 'Us';
    setAgentName(agentFirstName);
  }, [agentName])


  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Contact {agentName}
              </h1>
              <h2 className="text-[#242426] my-2 tahoma lg:text-[23px] md:text-[22px] sm:text-[18px] text-[18px] font-bold leading-6">
                No spam mail, no fees. VeteranPCS is free to use.
              </h2>
              <p className="text-[#575F6E] roboto text-base font-black mt-8">
                This form is simply used to generate an email with your agent&apos;s information and begin qualifying you for your Move In Bonus after you close.
              </p>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                {/* First Name */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    First name*
                  </label>
                  <input
                    {...register("firstName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    placeholder="Alexander"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                {/* Last Name */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Last name*
                  </label>
                  <input
                    {...register("lastName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    placeholder="Smith"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                  )}
                </div>
                {/* Email */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="email"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Email*
                  </label>
                  <input
                    {...register("email")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="email"
                    id="email"
                    placeholder="alex_manager@gmail.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                {/* Phone */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Phone*
                  </label>
                  <input
                    {...register("phone")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="tel"
                    id="phone"
                    placeholder="+1 555 555-1234"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
                {/* Current Base/City */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="currentBase"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Current Base/City*
                  </label>
                  <input
                    {...register("currentBase")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="currentBase"
                    placeholder="Current Base/City"
                  />
                  {errors.currentBase && (
                    <p className="text-red-500 text-xs mt-1">{errors.currentBase.message}</p>
                  )}
                </div>
                {/* Destination Base/City */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="destinationBase"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Destination Base/City*
                  </label>
                  <input
                    {...register("destinationBase")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="destinationBase"
                    placeholder="Destination Base/City"
                  />
                  {errors.destinationBase && (
                    <p className="text-red-500 text-xs mt-1">{errors.destinationBase.message}</p>
                  )}
                </div>

                {/* How did you hear about us */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How did you hear about us?*
                  </label>
                  <select
                    {...register('howDidYouHear')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="howDidYouHear"
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
                    <span className="text-error">{errors.howDidYouHear.message}</span>
                  )}
                </div>

                {howDidYouHearValue === 'Other' && (
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="tellusMore"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Please tell us more*
                    </label>
                    <input
                      type="text"
                      {...register('tellusMore')}
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      id="tellusMore"
                      placeholder="Tell us more..."
                    />
                    {errors.tellusMore && (
                      <span className="text-error">{errors.tellusMore.message}</span>
                    )}
                  </div>
                )}

                {/* Additional Comments */}
                <div className="flex flex-col">
                  <label
                    htmlFor="additionalComments"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Additional Comments
                  </label>
                  <textarea
                    {...register("additionalComments")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="additionalComments"
                    placeholder="Additional Comments"
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-col">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                  onChange={onCaptchaChange} // Handle reCAPTCHA value change
                />
                {errors.captchaToken && (
                  <span className="text-red-500">{errors.captchaToken.message}</span>
                )}
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactAgentForm;
