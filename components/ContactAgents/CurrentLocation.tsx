import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import initService from "@/services/initService";

// Define the shape of the form data
interface FormData {
  state: string;
  city: string;
  destination: string;
  buyingSelling: string;
  timeframe: string;
  captchaToken: string;
}

interface ContactFormProps {
  onSubmit: (data: FormData) => void;
  onBack: () => void;
}

// Validation schema with Yup
const validationSchema = yup.object({
  state: yup.string().required('State is required'),
  city: yup.string().required('City is required'),
  destination: yup.string().required('Destination is required'),
  buyingSelling: yup.string().required('Please select if you are buying or selling'),
  timeframe: yup.string().required('Please select a timeframe'),
});

const CurrentLocation = ({ onSubmit, onBack }: ContactFormProps) => {
  const [stateList, setStateList] = useState<any[]>([]);

  const getStateList = useCallback(async () => {
    try {
      const response = await initService.getStateListFetch();
      setStateList(response);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  }, []);

  useEffect(() => {
    getStateList();
  }, [getStateList]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    // resolver: yupResolver(validationSchema),
    defaultValues: {
      state: '',
      city: '',
      destination: '',
      buyingSelling: '',
      timeframe: '',
    }
  });

  // Form submit handler
  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  // Error rendering function
  const renderError = (fieldName: keyof FormData) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <div className="flex flex-col gap-8">
          <div className="md:text-left text-center">
            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
              Where You&apos;re Moving To
            </h1>
          </div>
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="flex flex-col gap-8">
              <div className="border rounded-lg border-[#E2E4E5] p-8">
                <div>
                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="state"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      State*
                    </label>
                    <select
                      id="state"
                      {...register('state')}
                      className="border-b border-[#E2E4E5] px-2 py-1"
                    >
                      <option value="" disabled>
                        Select State
                      </option>
                      {stateList.sort((a, b) => a.short_name < b.short_name ? -1 : 1).map((state) => (
                        <option key={state.short_name} value={state.short_name}>
                          {state.short_name}
                        </option>
                      ))}
                    </select>
                    {renderError('state')}
                  </div>

                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="city"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      City*
                    </label>
                    <input
                      id="city"
                      {...register('city')}
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      placeholder="City"
                    />
                    {renderError('city')}
                  </div>

                  <div className="mb-8 flex flex-col">
                    <label
                      htmlFor="destination"
                      className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                      Destination Base/City*
                    </label>
                    <input
                      id="destination"
                      {...register('destination')}
                      className="border-b border-[#E2E4E5] px-2 py-1"
                      placeholder="Destination Base/City"
                    />
                    {renderError('destination')}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg border-[#E2E4E5] p-8">
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="buyingSelling"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Are you buying and/or selling?*
                  </label>
                  <select
                    id="buyingSelling"
                    {...register('buyingSelling')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="Buying">Buying</option>
                    <option value="Selling">Selling</option>
                  </select>
                  {renderError('buyingSelling')}
                </div>

                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="timeframe"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    What is your timeframe?*
                  </label>
                  <select
                    id="timeframe"
                    {...register('timeframe')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled>
                      --None--
                    </option>
                    <option value="6+ Months">6+ Months</option>
                    <option value="3-6 Months">3-6 Months</option>
                    <option value="1-2 Months">1-2 Months</option>
                    <option value="<1 Month">&lt;1 Month</option>
                  </select>
                  {renderError('timeframe')}
                </div>
              </div>

              <div className="flex md:justify-start justify-center">
                <button
                  type="submit"
                  className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
                >
                  Next
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
          <div className="flex md:justify-start justify-center mt-3">
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
    </div>
  );
};

export default CurrentLocation;
