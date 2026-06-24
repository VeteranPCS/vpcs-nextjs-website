"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import "@/app/globals.css";
import Image from "next/image";
import styles from "./MovingBonusCalculator.module.css";
import Button from "@/components/common/Button";
import { sendGTMEvent } from "@next/third-parties/google";
import { captureAnalyticsEvent } from "@/lib/analytics/client";

// Figma assets
const imgHouse = "/icon/home-calculator-icon.webp";

const MovingBonusCalculator = () => {
    const [homeValue, setHomeValue] = useState(300000); // Default to $300k
    const sliderMinValue = 50000; // $50k - slider starts moving after this
    const sliderMaxValue = 1000000; // $1M - slider maxes out at this
    const absoluteMaxValue = 10000000; // $10M - maximum input allowed

    // Calculate moving bonus based on fixed price ranges
    const calculateMovingBonus = (value: number) => {
        if (value < 100000) {
            return 200;
        } else if (value >= 100000 && value <= 199999) {
            return 400;
        } else if (value >= 200000 && value <= 299999) {
            return 700;
        } else if (value >= 300000 && value <= 399999) {
            return 1000;
        } else if (value >= 400000 && value <= 499999) {
            return 1200;
        } else if (value >= 500000 && value <= 649999) {
            return 1500;
        } else if (value >= 650000 && value <= 799999) {
            return 2000;
        } else if (value >= 800000 && value <= 999999) {
            return 3000;
        } else { // $1,000,000+
            return 4000;
        }
    };

    const movingBonus = calculateMovingBonus(homeValue);

    // Calculate charity donation (10% of VeteranPCS Bonus)
    const charityDonation = Math.round(movingBonus * 0.1);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const homeValueBucket = (value: number): string => {
        if (value < 100000) return 'under_100k';
        if (value < 200000) return '100k_199k';
        if (value < 300000) return '200k_299k';
        if (value < 400000) return '300k_399k';
        if (value < 500000) return '400k_499k';
        if (value < 650000) return '500k_649k';
        if (value < 800000) return '650k_799k';
        if (value < 1000000) return '800k_999k';
        return '1m_plus';
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHomeValue(parseInt(e.target.value));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleanValue = e.target.value.replace(/[^0-9]/g, '');

        // Allow empty input (user is clearing the field)
        if (cleanValue === '') {
            setHomeValue(0);
            return;
        }

        const value = parseInt(cleanValue);
        if (!isNaN(value) && value >= 0 && value <= absoluteMaxValue) {
            setHomeValue(value);
        }
    };

    // Calculate percentage for slider position
    const getSliderPercentage = () => {
        if (homeValue <= sliderMinValue) return 0;
        if (homeValue >= sliderMaxValue) return 100;
        return ((homeValue - sliderMinValue) / (sliderMaxValue - sliderMinValue)) * 100;
    };

    const sliderPercentage = getSliderPercentage();

    // Track calculator interactions with debounce
    useEffect(() => {
        // Only track if there's a meaningful value (not zero or initial load)
        if (homeValue === 300000) {
            // Skip tracking the initial default value on mount
            return;
        }

        // Debounce the GTM event to avoid excessive tracking
        const timer = setTimeout(() => {
            sendGTMEvent({
                event: 'moving_bonus_calculator_interaction',
                home_value: homeValue,
                bonus_amount: movingBonus
            });
            captureAnalyticsEvent('moving_bonus_calculated', {
                home_value_bucket: homeValueBucket(homeValue),
                bonus_amount: movingBonus,
                charity_amount: charityDonation,
            });
        }, 750); // 750ms debounce

        return () => clearTimeout(timer);
    }, [charityDonation, homeValue, movingBonus]);

    // Handle Connect Now button click
    const handleConnectClick = () => {
        sendGTMEvent({
            event: 'moving_bonus_calculator_cta_click',
            home_value: homeValue,
            bonus_amount: movingBonus
        });
        captureAnalyticsEvent('calculator_cta_clicked', {
            calculator_id: 'moving_bonus',
            cta_id: 'moving_bonus_find_agent',
            cta_intent: 'contact_agent',
            cta_position: 'calculator',
            destination_path: '/contact-agent',
            home_value_bucket: homeValueBucket(homeValue),
            bonus_amount: movingBonus,
        });
    };

    return (
        <div className="bg-white py-16 px-5">
            <div className="container mx-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Calculator Card - Matching Figma Design */}
                    <div className="bg-[#F5F5F5] rounded-xl shadow-lg p-8 lg:p-12 relative">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                            {/* House Icon */}
                            <div className="flex-shrink-0">
                                <Image
                                    src={imgHouse}
                                    alt=""
                                    className="w-16 lg:w-20"
                                    style={{ height: "auto" }}
                                    width={80}
                                    height={80}
                                />
                            </div>

                            {/* Main Content */}
                            <div className="flex-1">
                                {/* Header */}
                                <div className="mb-8">
                                    <h2 className="text-[#27306d] font-bold text-2xl lg:text-3xl mb-2 tahoma">
                                        Estimated <span className="font-normal">Veteran</span>PCS Bonus
                                    </h2>
                                    <p className="text-[#231f20] text-sm tahoma">
	                                        Adjust the slider to estimate your VeteranPCS bonus. We can confirm your options when we match you with an agent.
                                    </p>
                                </div>

                                {/* Slider */}
                                <div className="mb-8">
                                    <div className="relative">
                                        <input
                                            type="range"
                                            min={sliderMinValue}
                                            max={sliderMaxValue}
                                            value={Math.min(Math.max(homeValue, sliderMinValue), sliderMaxValue)}
	                                            onChange={handleSliderChange}
	                                            aria-label="Estimated home price"
                                            className={`w-full h-3 rounded-md appearance-none cursor-pointer outline-none ${styles.sliderThumb}`}
                                            style={{
                                                background: `linear-gradient(to right, #A81F23 0%, #A81F23 ${sliderPercentage}%, #8B8B8B ${sliderPercentage}%, #8B8B8B 100%)`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Bottom Section */}
                                <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:items-center">
                                    {/* Home Price Input */}
                                    <div>
                                        <label className="block text-[#231f20] text-sm mb-2 tahoma">
                                            Home Price
                                        </label>
                                        <input
                                            type="text"
                                            value={homeValue === 0 ? '' : formatCurrency(homeValue)}
                                            onChange={handleInputChange}
                                            placeholder="$0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-[#231f20] text-sm tahoma"
                                        />
                                    </div>

                                    {/* VeteranPCS Bonus Display */}
                                    <div className="text-center md:text-center">
                                        <p className="text-[#231f20] text-sm mb-1 tahoma">
                                            VeteranPCS Bonus
                                        </p>
                                        <p className="text-[#27306d] font-bold text-2xl tahoma">
                                            {formatCurrency(movingBonus)}
                                        </p>
                                    </div>

                                    {/* CTA Button */}
                                    <div className="text-center md:text-center">
                                        <Link href="/contact-agent" onClick={handleConnectClick}>
                                            <Button
                                                buttonText="Find An Agent"
                                                divClassName="py-0"
                                            />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm max-w-2xl mx-auto tahoma">
                            * Bonus amounts are estimates and may vary based on final purchase price and actual commission rates.
                        </p>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default MovingBonusCalculator;
