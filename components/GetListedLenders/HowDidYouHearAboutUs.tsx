import React from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { ContactLenderFormData } from '@/types';

interface HowDidYouHearAboutUsProps {
    register: UseFormRegister<ContactLenderFormData>;
    watch: UseFormWatch<ContactLenderFormData>;
    errors: FieldErrors<ContactLenderFormData>;
}

const HowDidYouHearAboutUs: React.FC<HowDidYouHearAboutUsProps> = ({
    register,
    watch,
    errors,
}) => {
    const howDidYouHearValue = watch('howDidYouHear');

    return (
        <div>
            <div className="mb-8 flex flex-col">
                <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                    How did you hear about us?*
                </label>
                <select
                    {...register('howDidYouHear')}
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    id="howDidYouHear"
                >
                    <option value="">Select an option</option>
                    <option value="Google">Google</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Linkedin">LinkedIn</option>
                    <option value="Tiktok">TikTok</option>
                    <option value="Base Event">Base Event</option>
                    <option value="Transition Brief">Transition Brief</option>
                    <option value="Agent Referral">Agent Referral</option>
                    <option value="Friend Referral">Friend Referral</option>
                    <option value="Skillbridge">Skillbridge</option>
                    <option value="Youtube">YouTube</option>
                    <option value="Other">Other</option>
                </select>
                {errors.howDidYouHear && (
                    <span className="text-error">{errors.howDidYouHear.message}</span>
                )}
            </div>

            {howDidYouHearValue === 'Other' && (
                <div className="mb-8 flex flex-col">
                    <label
                        htmlFor="tellusMore"
                        className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                        Please tell us more*
                    </label>
                    <textarea
                        {...register('tellusMore')}
                        className="border-b border-[#E2E4E5] px-2 py-1"
                        id="tellusMore"
                        placeholder="Tell us more..."
                    />
                    {errors.tellusMore && (
                        <span className="text-error">{errors.tellusMore.message}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default HowDidYouHearAboutUs;