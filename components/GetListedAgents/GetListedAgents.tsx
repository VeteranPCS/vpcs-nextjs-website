"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Link from "next/link";
import { useState } from "react";

// Define validation schema using yup
const contactFormSchema = yup.object().shape({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  phone: yup
    .string()
    .matches(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
    .required("Phone number is required"),
});

import { AgentListingFormData } from '@/types';

interface ContactFormProps {
  onSubmit: (formData: AgentListingFormData) => Promise<{ success?: boolean; redirectUrl?: string; }>;
}

const GetListedAgents = ({ onSubmit }: ContactFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgentListingFormData>({
    resolver: yupResolver(contactFormSchema),
  });

  const handleFormSubmit: SubmitHandler<AgentListingFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await onSubmit(data);
      if (response?.success || response?.redirectUrl) {
        reset(); // Reset form after successful submission
        if (response?.redirectUrl) {
          window.location.href = response.redirectUrl; // Immediate redirect
          return;
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Agents, Get Listed!
              </h1>
              <p className="text-[#575F6E] roboto text-base font-black mt-3">
                Are you a licensed agent who is also a veteran or military spouse? We&apos;d love to have you represent your current city and support our veterans who are pcs&apos;ing to your area. Fill out this form, and we&apos;ll be in touch. <Link href="" className="text-[#7E1618]">Learn more</Link>
              </p>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                {/* First Name */}
                <div className="mb-8 flex flex-col">
                  <label htmlFor="firstName" className="text-[#242426] tahoma text-sm font-normal mb-1">
                    First name*
                  </label>
                  <input
                    {...register("firstName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    placeholder="Alexander"
                    autoComplete="given-name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                {/* Last Name */}
                <div className="mb-8 flex flex-col">
                  <label htmlFor="lastName" className="text-[#242426] tahoma text-sm font-normal mb-1">
                    Last name*
                  </label>
                  <input
                    {...register("lastName")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    placeholder="Smith"
                    autoComplete="family-name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                  )}
                </div>
                {/* Email */}
                <div className="mb-8 flex flex-col">
                  <label htmlFor="email" className="text-[#242426] tahoma text-sm font-normal mb-1">
                    Email*
                  </label>
                  <input
                    {...register("email")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="email"
                    id="email"
                    placeholder="alex_manager@gmail.com"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                {/* Phone */}
                <div className="mb-8 flex flex-col">
                  <label htmlFor="phone" className="text-[#242426] tahoma text-sm font-normal mb-1">
                    Phone*
                  </label>
                  <input
                    {...register("phone")}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="tel"
                    id="phone"
                    placeholder="+1 555 555-1234"
                    autoComplete="tel"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-md border border-[#BBBFC1] ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-white'} px-8 py-2 text-center text-[#242731] font-medium flex items-center gap-2 shadow-lg`}
              >
                {isSubmitting ? 'Processing...' : 'Go Next'}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M14.0098 11H5.99976V13H14.0098V16L17.9998 12L14.0098 8.00003V11Z"
                    fill="#242731"
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

export default GetListedAgents;
