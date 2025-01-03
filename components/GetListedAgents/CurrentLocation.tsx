"use client";
import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import stateService from "@/services/stateService";

interface FormData {
  state: string;
  city: string;
}

interface ContactFormProps {
  onSubmit: (formData: FormData) => void;
  onBack: () => void;
}

// Validation schema
const contactFormSchema = yup.object().shape({
  state: yup.string().required("State is required"),
  city: yup
    .string()
    .required("City is required")
    .matches(/^[a-zA-Z\s]+$/, "City must contain only letters"),
});

const CurrentLocation = ({ onSubmit, onBack }: ContactFormProps) => {
  const [stateList, setStateList] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(contactFormSchema),
    defaultValues: {
      state: "",
      city: "",
    },
  });

  const getStateList = useCallback(async () => {
    try {
      const response = await stateService.fetchStateList();
      setStateList(response);
    } catch (error) {
      console.error("Error fetching state list:", error);
    }
  }, []);

  useEffect(() => {
    getStateList();
  }, [getStateList]);

  const onFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Current Location
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                {/* State Dropdown */}
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="state"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    State*
                  </label>
                  <select
                    id="state"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    {...register("state")}
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
                  {errors.state && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.state.message}
                    </p>
                  )}
                </div>

                {/* City Input */}
                <div className="flex flex-col">
                  <label
                    htmlFor="city"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    City*
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="city"
                    placeholder="Enter City"
                    {...register("city")}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.city.message}
                    </p>
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

        {/* Back Button */}
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

export default CurrentLocation;
