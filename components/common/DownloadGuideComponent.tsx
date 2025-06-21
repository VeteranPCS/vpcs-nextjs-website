"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ReCAPTCHA from 'react-google-recaptcha';
import { vaLoanGuideForm } from "@/services/salesForcePostFormsService";
import { sendGTMEvent } from "@next/third-parties/google";
import Image from "next/image";
import Link from "next/link";

// Form input types
interface FormInputs {
    firstName: string;
    lastName: string;
    email: string;
    captchaToken: string;
    captcha_settings: string;
}

interface DownloadGuideComponentProps {
    icon: string;
    iconAlt: string;
    headerText: string;
    contentText: string;
    downloadButtonText: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    downloadFileName: string;
    downloadDisplayName: string;
    gtmEventContent?: string;
    className?: string;
}

const DownloadGuideComponent: React.FC<DownloadGuideComponentProps> = ({
    icon,
    iconAlt,
    headerText,
    contentText,
    downloadButtonText,
    secondaryButtonText,
    secondaryButtonLink,
    downloadFileName,
    downloadDisplayName,
    gtmEventContent,
    className = "",
}) => {
    const [recaptchaRef, setRecaptchaRef] = useState<ReCAPTCHA | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Validation schema
    const validationSchema = Yup.object().shape({
        firstName: Yup.string().required('First name is required'),
        lastName: Yup.string().required('Last name is required'),
        email: Yup.string().email('Invalid email').required('Email is required'),
        captchaToken: Yup.string().required('Captcha is required'),
        captcha_settings: Yup.string().required('Captcha settings are required'),
    });

    const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormInputs>({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            captchaToken: '',
            captcha_settings: '',
        },
    });

    // Handle reCAPTCHA
    const onCaptchaChange = (token: string | null) => {
        if (token) {
            const captchaSettingsElem = document.getElementById('captcha_settings') as HTMLInputElement | null;
            if (captchaSettingsElem) {
                const captchaSettings = JSON.parse(captchaSettingsElem.value);
                captchaSettings.ts = JSON.stringify(new Date().getTime());
                captchaSettingsElem.value = JSON.stringify(captchaSettings);
                setValue('captcha_settings', captchaSettingsElem.value, { shouldValidate: false });
                setValue('captchaToken', token, { shouldValidate: true });
            }
        }
    };

    // On submit
    const onSubmitHandler: SubmitHandler<FormInputs> = async (data) => {
        setSubmitting(true);
        setError(null);
        try {
            if (gtmEventContent) {
                sendGTMEvent({ event: "conversion_download", content: gtmEventContent });
            }

            const payload = {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                captchaToken: data.captchaToken,
                captcha_settings: data.captcha_settings,
            };

            const server_response = await vaLoanGuideForm(payload);
            if (server_response?.success) {
                setSuccess(true);
                reset();
                recaptchaRef?.reset();

                // Download the PDF
                const link = document.createElement('a');
                link.href = `/downloads/${downloadFileName}`;
                link.download = downloadDisplayName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setError("Submission failed. Please try again.");
            }
        } catch (err) {
            setError("Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`flex justify-center items-center py-4 bg-white ${className}`}>
            <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-row items-start mb-8 max-w-[600px] mx-auto">
                    <div className="flex-shrink-0">
                        <Image
                            src={icon}
                            alt={iconAlt}
                            width={72}
                            height={72}
                            className="w-auto"
                        />
                    </div>
                    <div className="ml-6">
                        <h2 className="text-[#232857] font-bold text-3xl mb-2 font-poppins">
                            {headerText}
                        </h2>
                        <p className="text-[#232857] text-sm font-medium font-roboto">
                            {contentText}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmitHandler)} className="mb-6">
                    <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />

                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <input
                            className="flex-1 px-4 py-3 rounded border border-gray-300 text-sm"
                            type="text"
                            placeholder="First Name*"
                            {...register('firstName')}
                            disabled={submitting}
                        />
                        <input
                            className="flex-1 px-4 py-3 rounded border border-gray-300 text-sm"
                            type="text"
                            placeholder="Last Name*"
                            {...register('lastName')}
                            disabled={submitting}
                        />
                        <input
                            className="flex-1 px-4 py-3 rounded border border-gray-300 text-sm"
                            type="email"
                            placeholder="Email*"
                            {...register('email')}
                            disabled={submitting}
                        />
                        <button
                            className="md:w-auto px-6 bg-[#232857] text-white rounded py-3 text-base font-medium hover:bg-[#1a1e4a] disabled:bg-gray-400"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : downloadButtonText}
                        </button>
                    </div>

                    <div className="w-full flex flex-col items-center mb-2">
                        {errors.firstName && <span className="text-red-600 text-xs">{errors.firstName.message}</span>}
                        {errors.lastName && <span className="text-red-600 text-xs">{errors.lastName.message}</span>}
                        {errors.email && <span className="text-red-600 text-xs">{errors.email.message}</span>}
                        {errors.captchaToken && <span className="text-red-600 text-xs">{errors.captchaToken.message}</span>}
                        {error && <span className="text-red-600 text-xs">{error}</span>}
                        {success && <span className="text-green-700 text-xs">Thank you! Your download will begin shortly.</span>}
                    </div>

                    <div className="w-full flex justify-center mb-4">
                        <ReCAPTCHA
                            ref={(r) => setRecaptchaRef(r)}
                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                            onChange={onCaptchaChange}
                        />
                    </div>


                </form>

                <div className="w-full flex justify-center">
                    <Link
                        className="w-auto px-8 bg-[#8B2D2D] text-white rounded-lg py-3 text-base font-medium hover:bg-[#722424]"
                        href={secondaryButtonLink}
                    >
                        {secondaryButtonText}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DownloadGuideComponent; 