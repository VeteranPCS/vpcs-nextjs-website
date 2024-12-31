import { useForm, SubmitHandler } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ReCAPTCHA from 'react-google-recaptcha';

interface ContactFormProps {
  onSubmit: (formData: FormData) => void;
  shouldSubmit: () => void;
}

export interface FormData {
  typeOfHome: string | null;
  bedrooms: string;
  bathrooms: string;
  maxPrice: string;
  preApproval: string | null;
  captchaToken: string;
  captcha_settings: string | null;
}

// Define validation schema using Yup
const validationSchema = Yup.object({
  typeOfHome: Yup.string().required('Type of Home is required'),
  bedrooms: Yup.string().required('Number of bedrooms is required'),
  bathrooms: Yup.string().required('Number of bathrooms is required'),
  maxPrice: Yup.string().required('Maximum price is required'),
  preApproval: Yup.string().required('Pre-approval status is required'),
  captchaToken: Yup.string().required('Please complete the reCAPTCHA'),
});

const OptionalInformationForBuyer = ({ onSubmit, shouldSubmit }: ContactFormProps) => {
  // Set up react-hook-form with Yup validation
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    // resolver: yupResolver(validationSchema),
    defaultValues: {
      typeOfHome: null,
      bedrooms: '',
      bathrooms: '',
      maxPrice: '', 
      preApproval: null,
      captchaToken: '',
      captcha_settings: '',
    }
  });

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

  // Handle form submission
  const onSubmitHandler: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
    shouldSubmit()
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(onSubmitHandler)}>
        <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Optional Information for Buyer
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                {/* Type of Home */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="typeOfHome"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Type of Home:
                  </label>
                  <select
                    id="typeOfHome"
                    {...register('typeOfHome')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="Single Family">Single Family</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Condo">Condo</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.typeOfHome && (
                    <span className="text-red-500">{errors.typeOfHome.message}</span>
                  )}
                </div>

                {/* Bedrooms */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="bedrooms"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How many Bedrooms are you looking for?:
                  </label>
                  <select
                    id="bedrooms"
                    {...register('bedrooms')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                    <option value="4+">4+</option>
                    <option value="5+">5+</option>
                  </select>
                  {errors.bedrooms && (
                    <span className="text-red-500">{errors.bedrooms.message}</span>
                  )}
                </div>

                {/* Bathrooms */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="bathrooms"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    How many Bathrooms are you looking for?:
                  </label>
                  <select
                    id="bathrooms"
                    {...register('bathrooms')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                    <option value="4+">4+</option>
                  </select>
                  {errors.bathrooms && (
                    <span className="text-red-500">{errors.bathrooms.message}</span>
                  )}
                </div>

                {/* Maximum Price */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="maxPrice"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Maximum Price:
                  </label>
                  <select
                    id="maxPrice"
                    {...register('maxPrice')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    {[...Array(24)].map((_, i) => {
                      const value = 25000 * (i + 1);
                      const display = `$${(value / 1000).toFixed(0)}k`;
                      return (
                        <option key={value} value={display}>
                          {display}
                        </option>
                      );
                    })}
                    <option value="$700k+">700k+</option>
                    <option value="$800k+">800k+</option>
                    <option value="$900k+">900k+</option>
                    <option value="$1M+">1M+</option>
                  </select>
                  {errors.maxPrice && (
                    <span className="text-red-500">{errors.maxPrice.message}</span>
                  )}
                </div>

                {/* Pre-Approval */}
                <div className="flex flex-col">
                  <label
                    htmlFor="preApproval"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Are you pre-approved for a mortgage?
                  </label>
                  <select
                    id="preApproval"
                    {...register('preApproval')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="in process">In Process</option>
                  </select>
                  {errors.preApproval && (
                    <span className="text-red-500">{errors.preApproval.message}</span>
                  )}
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
            </div>

            {/* Submit Button */}
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
      </div>
    </div>
  );
};

export default OptionalInformationForBuyer;
