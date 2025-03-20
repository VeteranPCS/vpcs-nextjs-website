"use client";
import { useState, ChangeEvent, FormEvent } from 'react';
import Link from "next/link";
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, SubmitHandler } from 'react-hook-form';

// Define FormData interface
export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// Define validation schema using yup
const lenderPersonalDataSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  phone: yup
    .string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .required('Phone number is required'),
});

interface ContactFormProps {
  onSubmit: (formData: FormData) => Promise<{ success?: boolean; redirectUrl?: string; }>;
}

const GetListedLenders = ({ onSubmit }: ContactFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(lenderPersonalDataSchema),
  });

  // Handle form submission
  const handleSubmitPersonal: SubmitHandler<FormData> = async (data) => {
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
        <form onSubmit={handleSubmit(handleSubmitPersonal)}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Lenders, Get Listed!
              </h1>
              <p className="text-[#575F6E] roboto text-base font-black mt-3">
                Are you a licensed lender who is also a veteran or military spouse? We&apos;d love to have you represent your current city and support our veterans who are pcs&apos;ing to your area. Fill out this form, and we&apos;ll be in touch. <Link href="" className='text-[#7E1618]'>Learn more</Link>
              </p>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div className="mb-8">
                <h3 className="text-[#000080] tahoma text-xl font-bold">
                  Personal data
                </h3>
                <p className="text-[#575F6E] roboto text-sm font-light">
                  No spam mail, no fees. <b>VeteranPCS is free to use.</b>
                </p>
              </div>
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="firstName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    First name
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="firstName"
                    placeholder="Please Enter First Name"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <span className="text-error">{errors.firstName.message}</span>
                  )}
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="lastName"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Last name
                  </label>
                  <input
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    type="text"
                    id="lastName"
                    placeholder="Please Enter Last Name"
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <span className="text-error">{errors.lastName.message}</span>
                  )}
                </div>
                <div className="mb-8 flex flex-col relative">
                  <label
                    htmlFor="email"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Email
                  </label>
                  <div className="flex items-center border-b border-[#E2E4E5]">
                    <input
                      className="pl-12 py-1 w-full"
                      type="email"
                      id="email"
                      {...register('email')}
                      placeholder="Please Enter Email"
                    />
                    <span className="absolute left-1 w-6 h-6 text-[#B1B3B8]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z"
                          fill="#D5D5D5"
                        />
                      </svg>
                    </span>
                  </div>
                  {errors.email && (
                    <span className="text-error">{errors.email.message}</span>
                  )}
                </div>
                <div className="flex flex-col relative">
                  <label
                    htmlFor="phone"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Phone
                  </label>
                  <div className="flex items-center border-b border-[#E2E4E5]">
                    <input
                      className="border-b border-[#E2E4E5] pl-12 py-1 w-full"
                      type="tel"
                      id="phone"
                      placeholder="Please Enter Phone"
                      {...register('phone')}
                    />
                    <span className="absolute left-1 w-6 h-6 text-[#B1B3B8]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M20.9999 15.46L15.7299 14.85L13.2099 17.37C10.3799 15.93 8.0599 13.62 6.6199 10.78L9.1499 8.25L8.5399 3H3.0299C2.4499 13.18 10.8199 21.55 20.9999 20.97V15.46Z"
                          fill="#D5D5D5"
                        />
                      </svg>
                    </span>
                  </div>
                  {errors.phone && (
                    <span className="text-error">{errors.phone.message}</span>
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

export default GetListedLenders;
