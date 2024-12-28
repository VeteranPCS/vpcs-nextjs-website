"use client";
import { useState } from 'react';

const HowDidYouHearAboutUs = () => {
    const [selectedOption, setSelectedOption] = useState<string>('');

    const hearAboutUsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedOption(e.target.value);
    };

    return (
        <div className="border rounded-lg border-[#E2E4E5] p-8">
            <div className="mb-8 flex flex-col">
                <label
                    htmlFor="howDidYouHear"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                >
                    How Did You Hear About Us?*:
                </label>
                <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                    onChange={hearAboutUsChange}
                >
                    <option value="" disabled selected>
                        Select an option
                    </option>
                    <option value="Google">Google</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Linkedin">Linkedin</option>
                    <option value="Tiktok">Tiktok</option>
                    <option value="Base Event">Base Event</option>
                    <option value="Transition Brief">Transition Brief</option>
                    <option value="Agent Referral">Agent Referral</option>
                    <option value="Friend Referral">Friend Referral</option>
                    <option value="Skillbridge">Skillbridge</option>
                    <option value="Youtube">Youtube</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            {selectedOption === 'Other' && (
                <div className="mb-8 flex flex-col">
                    <label
                        htmlFor="tellusMore"
                        className="text-[#242426] tahoma text-sm font-normal mb-1"
                    >
                        Tell Us More
                    </label>
                    <input
                        className="border-b border-[#E2E4E5] px-2 py-1"
                        type="text"
                        id="tellusMore"
                        name="tellusMore"
                        placeholder="Tell us more"
                    />
                </div>
            )}
        </div>
    );
}

export default HowDidYouHearAboutUs;