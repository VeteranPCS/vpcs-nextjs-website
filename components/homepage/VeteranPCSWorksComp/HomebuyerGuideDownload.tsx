"use client";
import { LeadCaptcha } from '@/components/common/LeadCaptcha';
import { bestEffort, useLeadSubmission } from '@/components/common/useLeadSubmission';
import CustomerSubmissionFeedback from '@/components/common/CustomerSubmissionFeedback';
import React, { useState } from "react";
import { useForm, SubmitHandler } from 'react-hook-form';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { homebuyerGuideForm } from "@/services/salesForcePostFormsService";
import { sendGTMEvent } from "@next/third-parties/google";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";
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

const HomebuyerGuideDownload = () => {
    const [success, setSuccess] = useState(false);

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
    const submission = useLeadSubmission('first_time_homebuyer_guide');
    const submitting = submission.submitting;

    const onSubmitHandler: SubmitHandler<FormInputs> = async (data) => {
        const [firstName, ...lastNames] = data.name.trim().split(' ');
        const payload = { firstName, lastName: lastNames.join(' '), email: data.email };
        if (submission.blocked) return;
        bestEffort(() => captureAnalyticsEvent('guide_download_requested', {
            guide_id: 'first_time_homebuyer_guide',
            form_id: 'first_time_homebuyer_guide',
            has_email: Boolean(data.email),
        }));
        const result = await submission.submit({ ...payload, ...getSpamFields() }, attempt => {
            let tracking = {};
            bestEffort(() => { tracking = formTrackingPayload(); });
            return homebuyerGuideForm({ ...attempt, ...tracking });
        }, payload);
        if (!result) return;
        if (result.outcome !== 'accepted') {
            bestEffort(() => trackFormSubmissionFailed('first_time_homebuyer_guide', 'server_submission', [result.outcome], { guide_id: 'first_time_homebuyer_guide' }));
            return;
        }
        setSuccess(true);
        reset();
        bestEffort(() => sendGTMEvent({ event: 'conversion_download', content: "First Time Home Buyer Guide" }));
        bestEffort(() => captureAnalyticsEvent('guide_download_started', { guide_id: 'first_time_homebuyer_guide', form_id: 'first_time_homebuyer_guide' }));
        bestEffort(() => {
            const link = document.createElement('a');
            link.href = '/downloads/first-time-home-buyer-guide.pdf';
            link.download = 'First-Time-Home-Buyer-Guide.pdf';
            document.body.appendChild(link);
            try { link.click(); } finally { link.remove(); }
        });
    };

    const handleInvalidSubmit = (formErrors: typeof errors) => {
        trackFormValidationFailed('first_time_homebuyer_guide', formErrors, {
            guide_id: 'first_time_homebuyer_guide',
        });
    };

    const trackSubmitAttempt = () => {
        const values = getValues();
        trackFormSubmitAttempted('first_time_homebuyer_guide', {
            guide_id: 'first_time_homebuyer_guide',
            has_email: Boolean(values.email),
            has_phone: false,
        });
    };

    return (
        <div className="flex justify-center items-center py-4 bg-white">
            <div className="w-full max-w-[800px] bg-white rounded-2xl shadow-lg p-8">
                <div className="flex flex-row items-start mb-8 max-w-[600px] mx-auto">
                    <div className="flex-shrink-0">
                        <Image src="/icon/home-icon.webp" alt="VA Loan Guide" width={72} height={72} className="w-auto" />
                    </div>
                    <div className="ml-6">
                        <h2 className="text-[#232857] font-bold text-3xl mb-2 font-poppins">First Time Home Buyer Guide</h2>
                        <p className="text-[#232857] text-sm font-medium font-roboto">
                            First time buying a home? It can seem overwhelming. Check out our free first time home buyer guide to understand the process.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={(event) => {
                        trackSubmitAttempt();
                        void handleSubmit(onSubmitHandler, handleInvalidSubmit)(event);
                    }}
                    onFocus={() => trackFormStarted('first_time_homebuyer_guide', {
                        guide_id: 'first_time_homebuyer_guide',
                    })}
                    className="mb-6"
                >
                    <HoneypotField ref={honeypotRef} />
                    <LeadCaptcha control={submission.captcha} />
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
                            disabled={submitting || submission.blocked || success}
                        >
                            {submitting ? 'Submitting...' : 'Download Now'}
                        </button>
                    </div>

                    <div className="w-full flex flex-col items-center mb-2">
                        {errors.name && <span className="text-red-600 text-xs">{errors.name.message}</span>}
                        {errors.email && <span className="text-red-600 text-xs">{errors.email.message}</span>}
                        <CustomerSubmissionFeedback failure={submission.failure} />
                        {success && <span className="text-green-700 text-xs">Thank you! Your download will begin shortly.</span>}
                    </div>
                </form>

                <div className="w-full flex justify-center">
                    <TrackedCtaLink
                        className="w-auto px-8 bg-[#8B2D2D] text-white rounded-lg py-3 text-base font-medium hover:bg-[#722424]"
                        href="/contact-agent"
                        cta={{
                            ctaId: 'homebuyer_guide_secondary_agent',
                            ctaIntent: 'contact_agent',
                            ctaPosition: 'guide_download_secondary',
                            ctaComponent: 'homebuyer_guide_download',
                            ctaLabel: 'Contact me with an agent!',
                            destination: '/contact-agent',
                            pageType: 'homepage',
                            guideId: 'first_time_homebuyer_guide',
                            partnerType: 'agent',
                        }}
                    >
                        Contact me with an agent!
                    </TrackedCtaLink>
                </div>
            </div>
        </div>
    );
};

export default HomebuyerGuideDownload;
