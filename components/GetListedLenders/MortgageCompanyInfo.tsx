"use client";
import { useState, FormEvent, useCallback, useEffect } from 'react';
import initService from '@/services/initService';
import ReCAPTCHA from 'react-google-recaptcha';
import { useForm, Resolver } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

export type HowDidYouHearOptions =
  | 'Google'
  | 'Facebook'
  | 'Instagram'
  | 'Linkedin'
  | 'Tiktok'
  | 'Base Event'
  | 'Transition Brief'
  | 'Agent Referral'
  | 'Friend Referral'
  | 'Skillbridge'
  | 'Youtube'
  | 'Other'
  | ''

interface FormData {
  name: string;
  companyNMLSId: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  howDidYouHear: string;
  tellusMore?: string;
  captchaToken: string | null;
  captcha_settings: string | null,
}

const howDidYouHearOptions: HowDidYouHearOptions[] = [
  'Google',
  'Facebook',
  'Instagram',
  'Linkedin',
  'Tiktok',
  'Base Event',
  'Transition Brief',
  'Agent Referral',
  'Friend Referral',
  'Skillbridge',
  'Youtube',
  'Other',
  ''
];

interface ContactFormProps {
  onSubmit: (data: FormData) => void;
  onBack: () => void;
  shouldSubmit: () => void;
}

// Validation schema using yup
const schema = yup.object({
  name: yup.string().required('Name is required'),
  companyNMLSId: yup.string(),
  street: yup.string().required('Street is required'),
  city: yup.string(),
  state: yup.string(),
  zip: yup.string(),
  howDidYouHear: yup
    .string()
    .required('Please select an option')
    .oneOf(howDidYouHearOptions, 'Invalid option selected'),
  tellusMore: yup.string().when('howDidYouHear', {
    is: 'Other',
    then: (schema) => schema,
    otherwise: (schema) => schema.nullable(),
  }),
  captchaToken: yup.string().required('Please complete the reCAPTCHA'),
  captcha_settings: yup.string().required('Please complete the reCAPTCHA'),
});

const MortgageCompanyInfo = ({ onSubmit, onBack, shouldSubmit }: ContactFormProps) => {

  const [stateList, setStateList] = useState<any[]>([]);

  // Fetch state list
  const getStateList = useCallback(async () => {
    try {
      const response = await initService.getStateListFetch();
      setStateList(response);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, []);

  useEffect(() => {
    getStateList();
  }, [getStateList]);

  // React Hook Form setup with validation
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema) as Resolver<FormData>,
    defaultValues: {
      name: '',
      companyNMLSId: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      howDidYouHear: '',
      tellusMore: '',
      captchaToken: '',
      captcha_settings: '',
    },
  });

  const howDidYouHearValue = watch("howDidYouHear");

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

  const onFormSubmit = (data: FormData) => {
    onSubmit(data);
    shouldSubmit()
  };

  const handleBack = (e: FormEvent) => {
    e.preventDefault();
    onBack();
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Mortgage Company Info
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              {/* Name */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="name" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  Name
                </label>
                <input
                  {...register('name')}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="name"
                  placeholder="Name"
                />
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
              </div>

              {/* Company NMLS ID */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="companyNMLSId" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  Company NMLS ID
                </label>
                <input
                  {...register('companyNMLSId')}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="companyNMLSId"
                  placeholder="Company NMLS ID"
                />
                {errors.companyNMLSId && <span className="text-red-500 text-sm">{errors.companyNMLSId.message}</span>}
              </div>

              {/* Street */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="street" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  Street
                </label>
                <input
                  {...register('street')}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="street"
                  placeholder="Street"
                />
                {errors.street && <span className="text-red-500 text-sm">{errors.street.message}</span>}
              </div>

              {/* City */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="city" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  City
                </label>
                <input
                  {...register('city')}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="city"
                  placeholder="City"
                />
                {errors.city && <span className="text-red-500 text-sm">{errors.city.message}</span>}
              </div>

              {/* State */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="state" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  State/Province
                </label>
                <select
                  {...register('state')}
                  id="state"
                  className="border-b border-[#E2E4E5] px-2 py-1"
                >
                  <option value="" disabled>
                    Select State
                  </option>
                  {stateList.map((state) => (
                    <option key={state.short_name} value={state.short_name}>
                      {state.short_name}
                    </option>
                  ))}
                </select>
                {errors.state && <span className="text-red-500 text-sm">{errors.state.message}</span>}
              </div>

              {/* Zip */}
              <div className="mb-8 flex flex-col">
                <label htmlFor="zip" className="text-[#242426] tahoma text-sm font-normal mb-1">
                  Zip
                </label>
                <input
                  {...register('zip')}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="zip"
                  placeholder="Zip"
                />
                {errors.zip && <span className="text-red-500 text-sm">{errors.zip.message}</span>}
              </div>

            </div>

            <div className='border rounded-lg border-[#E2E4E5] p-8'>
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

              <div className="mt-8 flex flex-col">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                  onChange={onCaptchaChange}
                />
                {errors.captchaToken && (
                  <span className="text-error">{errors.captchaToken.message}</span>
                )}
              </div>
            </div>

            {/* CAPTCHA */}
            {/* <div className="mt-8 flex flex-col">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                  onChange={onCaptchaChange}
                />
                {errors.captchaToken && (
                  <span className="text-error">{errors.captchaToken.message}</span>
                )}
              </div> */}

            <hr />
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                Submit Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M14.0098 11H5.99976V13H14.0098V16L17.9998 12L14.0098 8.00003V11Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* Back Button */}
        <div className="flex md:justify-start justify-center mt-8">
          <button
            onClick={handleBack}
            className="rounded-md border border-[#BBBFC1] bg-white px-8 py-2 text-center text-[#242731] font-medium flex items-center gap-2 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="24"
              viewBox="0 0 22 24"
              fill="none"
            >
              <path
                d="M9.1578 11H16.5003V13H9.1578V16L5.50031 12L9.1578 8.00003V11Z"
                fill="#242731"
              />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default MortgageCompanyInfo;
