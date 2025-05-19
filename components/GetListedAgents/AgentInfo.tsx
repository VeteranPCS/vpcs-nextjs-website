"use client";
import { useState, FormEvent, useCallback, useEffect } from 'react';
import stateService from '@/services/stateService';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ReCAPTCHA from 'react-google-recaptcha';

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
interface ContactFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  shouldSubmit: () => void;
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

const schema = yup.object().shape({
  primaryState: yup.string(),
  otherStates: yup.array().of(yup.string()),
  licenseNumber: yup.string().required("License number is required."),
  brokerageName: yup.string().required("Brokerage name is required."),
  managingBrokerName: yup.string().required("Managing broker name is required."),
  managingBrokerPhone: yup
    .string()
    .required("Managing broker phone is required.")
    .matches(/^\d{10}$/, "Phone number must be 10 digits."),
  managingBrokerEmail: yup
    .string()
    .email("Enter a valid email address.")
    .required("Managing broker email is required."),
  citiesServiced: yup.string(),
  basesServiced: yup.string(),
  personallyPCS: yup.string(),
  leadAcceptance: yup.string(),
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

const AgentInfo = ({ onSubmit, onBack, shouldSubmit }: ContactFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stateList, setStateList] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      captchaToken: '',
      captcha_settings: '',
    },
    resolver: yupResolver(schema),
  });

  const howDidYouHearValue = watch("howDidYouHear");
  const getStateList = useCallback(async () => {
    try {
      const response = await stateService.fetchStateList();
      setStateList(response);
    } catch (error) {
      console.error("Error fetching state list:", error);
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
    getStateList();
  }, [getStateList]);

  const onSubmitHandler: SubmitHandler<any> = (data) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(data);
    shouldSubmit();
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(onSubmitHandler)}>
          <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Agent Info
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="primaryState"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Primary State to be Listed:
                </label>
                <select
                  id="primaryState"
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  {...register("primaryState")}
                >
                  <option value="" disabled selected>
                    Select State
                  </option>
                  {stateList.sort((a, b) => a.short_name < b.short_name ? -1 : 1).map((state) => (
                    <option key={state.short_name} value={state.short_name}>
                      {state.short_name}
                    </option>
                  ))}
                </select>
                {errors.primaryState && (
                  <span className="text-error">{errors.primaryState.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="otherStates"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Other State(s) Licensed:
                </label>
                <select
                  id="otherStates"
                  {...register("otherStates")}
                  className="border-b border-[#E2E4E5] px-2 py-1 h-32"
                  multiple
                >
                  {stateList.sort((a, b) => a.short_name < b.short_name ? -1 : 1).map((state) => (
                    <option key={state.short_name} value={state.short_name}>
                      {state.short_name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple states</span>
                {errors.otherStates && (
                  <span className="text-error">{errors.otherStates.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="licenseNumber"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  License Number(s)
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="licenseNumber"
                  {...register("licenseNumber")}
                  placeholder="License Number(s)"
                />
                {errors.licenseNumber && (
                  <span className="text-error">{errors.licenseNumber.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="brokerageName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Brokerage Name
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="brokerageName"
                  {...register("brokerageName")}
                  placeholder="Brokerage Name"
                />
                {errors.brokerageName && (
                  <span className="text-error">{errors.brokerageName.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="managingBrokerName"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Managing Broker Name*
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="managingBrokerName"
                  {...register("managingBrokerName")}
                  placeholder="Managing Broker Name"
                />
                {errors.managingBrokerName && (
                  <span className="text-error">{errors.managingBrokerName.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="managingBrokerPhone"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Managing Broker Phone*
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="managingBrokerPhone"
                  {...register("managingBrokerPhone")}
                  placeholder="Managing Broker Phone"
                />
                {errors.managingBrokerPhone && (
                  <span className="text-error">{errors.managingBrokerPhone.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="managingBrokerEmail"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Managing Broker Email*
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="managingBrokerEmail"
                  {...register("managingBrokerEmail")}
                  placeholder="Managing Broker Email"
                />
                {errors.managingBrokerEmail && (
                  <span className="text-error">{errors.managingBrokerEmail.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="citiesServiced"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Cities Serviced
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="citiesServiced"
                  {...register("citiesServiced")}
                  placeholder="Cities Serviced"
                />
                {errors.citiesServiced && (
                  <span className="text-error">{errors.citiesServiced.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="basesServiced"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Bases Serviced
                </label>
                <input
                  className="border-b border-[#E2E4E5] px-2 py-1"
                  type="text"
                  id="basesServiced"
                  {...register("basesServiced")}
                  placeholder="Bases Serviced"
                />
                {errors.basesServiced && (
                  <span className="text-error">{errors.basesServiced.message}</span>
                )}
              </div>
              <div className="mb-8 flex flex-col">
                <label
                  htmlFor="personallyPCS"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Have you personally PCS&apos;d?
                </label>
                <select
                  id="personallyPCS"
                  {...register("personallyPCS")}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                >
                  <option value="" disabled selected>
                    --None--
                  </option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {errors.personallyPCS && (
                  <span className="text-error">{errors.personallyPCS.message}</span>
                )}
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="leadAcceptance"
                  className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                  Are you able to receive leads for a 25% fee?
                </label>
                <select
                  id="leadAcceptance"
                  {...register("leadAcceptance")}
                  className="border-b border-[#E2E4E5] px-2 py-1"
                >
                  <option value="" disabled selected>
                    --None--
                  </option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {errors.leadAcceptance && (
                  <span className="text-error">{errors.leadAcceptance.message}</span>
                )}
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

            {/* <HowDidYouHearAboutUs /> */}
            <hr />
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-md border border-[#BBBFC1] ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#292F6C]'} px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Now'}
                {!isSubmitting && (
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
                )}
              </button>
            </div>
          </div>
        </form>
        <div className="flex md:justify-start justify-center mt-8">
          <button
            onClick={onBack}
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

export default AgentInfo;