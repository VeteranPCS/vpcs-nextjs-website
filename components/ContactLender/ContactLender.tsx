"use client";
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import HowDidYouHearAboutUs from '@/components/GetListedLenders/HowDidYouHearAboutUs';
import * as yup from 'yup';
import ReCAPTCHA from 'react-google-recaptcha';

// Define the possible values for howDidYouHear
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

// Define the shape of the form data
export interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentBase?: string;
  destinationBase?: string;
  additionalComments?: string | null;
  howDidYouHear?: string;
  tellusMore?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

// Props type for ContactForm component
interface ContactFormProps {
  onSubmit: (data: ContactFormData) => void;
}

// Define form errors type
type FormErrors = Partial<Record<keyof ContactFormData, { message?: string }>>;

// Define available options for "howDidYouHear" field
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

const contactFormSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup
    .string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .required('Phone number is required'),
  currentBase: yup.string().required('Current Base/City is required'),
  destinationBase: yup.string().required('Destination Base/City is required'),
  additionalComments: yup.string().nullable(),
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

const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: yupResolver<ContactFormData>(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentBase: '',
      destinationBase: '',
      additionalComments: '',
      howDidYouHear: '',
      tellusMore: '',
      captchaToken: '',
      captcha_settings: '',
    },
  });

  // Form submit handler
  const handleFormSubmit: SubmitHandler<ContactFormData> = (data) => {
    onSubmit(data);
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

  // Error rendering function
  const renderError = (fieldName: keyof FormErrors) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' />
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Contact Us
              </h1>
              <p className="text-[#575F6E] roboto text-base font-black mt-3">
                This information is strictly used to connect you and the lender directly. Be sure to check your spam/junk folder if you do not receive a confirmation email.
              </p>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    First name*
                  </label>
                  <input
                    {...register('firstName')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    placeholder="Alexander"
                  />
                  {renderError('firstName')}
                </div>

                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Last name*
                  </label>
                  <input
                    {...register('lastName')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    placeholder="Smith"
                  />
                  {renderError('lastName')}
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="email"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Email*
                  </label>
                  <input
                    {...register('email')}
                    className="px-2 py-1 w-full border-b border-[#E2E4E5]"
                    type="email"
                    id="email"
                    placeholder="alex_manager@gmail.com"
                  />
                  {renderError('email')}
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Phone*
                  </label>
                  <input
                    {...register('phone')}
                    className="border-b border-[#E2E4E5] py-1 px-2"
                    type="tel"
                    id="phone"
                    placeholder="+1 555 555-1234"
                  />
                  {renderError('phone')}
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="currentBase"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Current Base/City*
                  </label>
                  <input
                    {...register('currentBase')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="currentBase"
                    placeholder="Current Base/City"
                  />
                  {renderError('currentBase')}
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="destinationBase"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Destination Base/City*
                  </label>
                  <input
                    {...register('destinationBase')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="destinationBase"
                    placeholder="Destination Base/City"
                  />
                  {renderError('destinationBase')}
                </div>

                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="additionalComments"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Additional Comments
                  </label>
                  <textarea
                    {...register('additionalComments')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="additionalComments"
                    placeholder="Add comments"
                  />
                </div>

                <HowDidYouHearAboutUs
                  register={register}
                  watch={watch}
                  errors={errors}
                />

                <div className="mt-8 flex flex-col">
                  <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                    onChange={onCaptchaChange} // Handle reCAPTCHA value change
                  />
                  {renderError('captchaToken')}
                </div>
              </div>
            </div>

            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                Submit Now
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
