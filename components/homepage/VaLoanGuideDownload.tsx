"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { vaLoanGuideForm } from "@/services/salesForcePostFormsService";
import { sendGTMEvent } from "@next/third-parties/google";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
import { useConcierge } from "@/components/Concierge";
import { featureFlags } from "@/lib/feature-flags";
import { useHoneypot, HoneypotField } from '@/components/common/honeypot';
import {
    captureAnalyticsEvent,
    formTrackingPayload,
    trackFormStarted,
    trackFormSubmitAttempted,
    trackFormSubmissionFailed,
    trackFormValidationFailed,
} from '@/lib/analytics/client';

// Form input types
interface FormInputs {
    name: string;
    email: string;
}

const VaLoanGuideDownload = () => {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { open: openConcierge } = useConcierge();

    const handleConciergeCta = () => {
        openConcierge({
            topic: 'va_loan_guide',
            openingMessage: 'Can you walk me through the VA loan basics?',
        });
    };

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Name is required'),
        email: Yup.string().email('Invalid email').required('Email is required'),
    });

    const { register, handleSubmit, getValues, formState: { errors }, reset } = useForm<FormInputs>({
        resolver: yupResolver(validationSchema),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    const { ref: honeypotRef, getSpamFields } = useHoneypot();

    // On submit
    const onSubmitHandler: SubmitHandler<FormInputs> = async (data) => {
        setSubmitting(true);
        setError(null);
        captureAnalyticsEvent('guide_download_requested', {
            guide_id: 'va_loan_guide',
            form_id: 'va_loan_guide',
            has_email: Boolean(data.email),
        });
        try {
            sendGTMEvent({ event: "conversion_download", content: "VA Loan Guide" });
            // Split name into first/last for Salesforce
            const [firstName, ...lastArr] = data.name.trim().split(' ');
            const lastName = lastArr.join(' ');
            const payload = {
                firstName,
                lastName,
                email: data.email,
            };
            const server_response = await vaLoanGuideForm({
                ...payload,
                ...getSpamFields(),
                ...formTrackingPayload(),
            });
            if (server_response?.success) {
                setSuccess(true);
                reset();
                captureAnalyticsEvent('guide_download_started', {
                    guide_id: 'va_loan_guide',
                    form_id: 'va_loan_guide',
                });
                // Download the PDF
                const link = document.createElement('a');
                link.href = '/downloads/VA-Loan-Guide.pdf';
                link.download = 'VA-Loan-Guide.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                trackFormSubmissionFailed('va_loan_guide', 'server_submission', ['no_success_response'], {
                    guide_id: 'va_loan_guide',
                });
                setError("Submission failed. Please try again.");
            }
        } catch (err) {
            trackFormSubmissionFailed('va_loan_guide', 'server_submission', ['submission_exception'], {
                guide_id: 'va_loan_guide',
            });
            setError("Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleInvalidSubmit = (formErrors: typeof errors) => {
        trackFormValidationFailed('va_loan_guide', formErrors, { guide_id: 'va_loan_guide' });
    };

    const trackSubmitAttempt = () => {
        const values = getValues();
        trackFormSubmitAttempted('va_loan_guide', {
            guide_id: 'va_loan_guide',
            has_email: Boolean(values.email),
            has_phone: false,
        });
    };

    return (
        <div className="flex justify-center items-center py-4 bg-white">
            <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-row items-start mb-8 max-w-[600px] mx-auto">
                    <div className="flex-shrink-0">
                        <Image src="/icon/home-dollar.webp" alt="VA Loan Guide" width={72} height={72} className="w-auto" />
                    </div>
                    <div className="ml-6">
                        <h2 className="text-[#232857] font-bold text-3xl mb-2 font-poppins">Free VA Loan Guide</h2>
                        <p className="text-[#232857] text-sm font-medium font-roboto">
                            Don&apos;t overpay using your VA loan, make the VA Loan work for you! Download our free VA Loan guide to learn more about the VA loan and how it can work for you.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={(event) => {
                        trackSubmitAttempt();
                        void handleSubmit(onSubmitHandler, handleInvalidSubmit)(event);
                    }}
                    onFocus={() => trackFormStarted('va_loan_guide', { guide_id: 'va_loan_guide' })}
                    className="mb-6"
                >
                    <HoneypotField ref={honeypotRef} />
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <input
                            className="flex-1 px-4 py-3 rounded border border-gray-300 text-sm"
                            type="text"
                            placeholder="Name*"
                            {...register('name')}
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
                            {submitting ? 'Submitting...' : 'Download Now'}
                        </button>
                    </div>

                    <div className="w-full flex flex-col items-center mb-2">
                        {errors.name && <span className="text-red-600 text-xs">{errors.name.message}</span>}
                        {errors.email && <span className="text-red-600 text-xs">{errors.email.message}</span>}
                        {error && <span className="text-red-600 text-xs">{error}</span>}
                        {success && <span className="text-green-700 text-xs">Thank you! Your download will begin shortly.</span>}
                    </div>

                    {featureFlags.conciergeEnabled && (
                        <div className="w-full flex justify-center mb-2">
                            <button
                                type="button"
                                onClick={handleConciergeCta}
                                className="text-sm text-primary hover:underline focus:outline-none focus-visible:underline min-h-[44px]"
                            >
                                Or chat with our concierge instead.
                            </button>
                        </div>
                    )}
                </form>

                <div className="w-full flex justify-center">
                    <TrackedCtaLink
                        className="w-auto px-8 bg-[#8B2D2D] text-white rounded-lg py-3 text-base font-medium hover:bg-[#722424]"
                        href="/contact-lender"
                        cta={{
                            ctaId: 'va_loan_guide_secondary_lender',
                            ctaIntent: 'contact_lender',
                            ctaPosition: 'guide_download_secondary',
                            ctaComponent: 'va_loan_guide_download',
                            ctaLabel: 'VA Loan Questions?',
                            destination: '/contact-lender',
                            pageType: 'homepage',
                            guideId: 'va_loan_guide',
                            partnerType: 'lender',
                        }}
                    >
                        VA Loan Questions?
                    </TrackedCtaLink>
                </div>
            </div>
        </div>
    );
};

export default VaLoanGuideDownload;
