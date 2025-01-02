"use client";
import { useState, FormEvent, useCallback, useEffect } from 'react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import stateService from '@/services/stateService';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

interface ContactFormProps {
  onSubmit: (formData: LenderInfoProps) => void;
  onBack: () => void;
}

interface LenderInfoProps {
  primaryState: string;
  otherStates: string[];
  localCities: string;
  nmlsId: string;
}

interface State {
  short_name: string;
}

const GetListedLendersProfileInfoWantShareMore = ({ onSubmit, onBack }: ContactFormProps) => {
  const [stateList, setStateList] = useState<State[]>([]);

  // Fetch state list
  const getStateList = useCallback(async () => {
    try {
      const response = await stateService.fetchStateList();
      setStateList(response);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  }, []);

  useEffect(() => {
    getStateList();
  }, [getStateList]);

  // Validation schema using yup
  const schema = yup.object({
    primaryState: yup
      .string()
      .required('Primary State is required')
      .oneOf(stateList.map((state) => state.short_name), 'Invalid state selected'),
    otherStates: yup
      .array()
      .of(yup.string()),
    localCities: yup.string(),
    nmlsId: yup.string(),
  });

  // Use form hook with validation
  const { register, handleSubmit, control, formState: { errors } } = useForm<LenderInfoProps>({
    resolver: yupResolver(schema) as Resolver<LenderInfoProps>,
    defaultValues: {
      primaryState: '',
      otherStates: [],
      localCities: '',
      nmlsId: '',
    },
  });

  // Handle form submission
  const onFormSubmit = (data: LenderInfoProps) => {
    onSubmit(data);
  };

  // Handle back action
  const handleBack = (e: FormEvent) => {
    e.preventDefault();
    onBack();
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <div className="flex flex-col gap-8">
          <div className="md:text-left text-center">
            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
              Lender Info
            </h1>
          </div>
          <div>
            <form onSubmit={handleSubmit(onFormSubmit)}>
              <div className="border rounded-lg border-[#E2E4E5] p-8 mb-8">
                {/* Primary State */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="primaryState"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Primary State to be Listed:
                  </label>
                  <select
                    id="primaryState"
                    {...register('primaryState')}
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
                  {errors.primaryState && (
                    <span className="text-red-500 text-sm">{errors.primaryState.message}</span>
                  )}
                </div>

                {/* Other States */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="otherStates"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Other State(s) Licensed:
                  </label>
                  <select
                    id="otherStates"
                    {...register('otherStates')}
                    multiple
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    {stateList.sort((a, b) => a.short_name < b.short_name ? -1 : 1).map((state) => (
                      <option key={state.short_name} value={state.short_name}>
                        {state.short_name}
                      </option>
                    ))}
                  </select>
                  {errors.otherStates && (
                    <span className="text-red-500 text-sm">{errors.otherStates.message}</span>
                  )}
                </div>

                {/* Local Cities */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="localCities"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Cities/Bases/Areas you consider yourself as a &apos;local lender&apos;
                  </label>
                  <textarea
                    id="localCities"
                    {...register('localCities')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    placeholder="Enter cities or areas"
                  />
                </div>

                {/* NMLS ID */}
                <div className="flex flex-col">
                  <label
                    htmlFor="nmlsId"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Individual NMLS ID:
                  </label>
                  <input
                    type="text"
                    id="nmlsId"
                    {...register('nmlsId')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    placeholder="Enter your NMLS ID"
                  />
                </div>
              </div>

              {/* Submit Button */}
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
      </div>
    </div>
  );
};

export default GetListedLendersProfileInfoWantShareMore;
