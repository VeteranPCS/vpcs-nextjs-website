"use client";
import React, { useState } from "react";
import Link from "next/link";
import "@/app/globals.css";
import Image from "next/image";
import styles from "./MovingBonusCalculator.module.css";
import Button from "@/components/common/Button";

// Figma assets
const imgHouse = "/icon/home-calculator-icon.webp";

const MovingBonusCalculator = () => {
    const [homeValue, setHomeValue] = useState(300000); // Default to $300k
    const sliderMinValue = 50000; // $50k - slider starts moving after this
    const sliderMaxValue = 1000000; // $1M - slider maxes out at this
    const absoluteMaxValue = 10000000; // $10M - maximum input allowed

    // Calculate moving bonus based on requirements
    // 15% of agent's commission (~3% of home value)
    const calculateMovingBonus = (value: number) => {
        const agentCommission = value * 0.03; // 3% agent commission
        const bonus = agentCommission * 0.15; // 15% of agent commission

        // Apply min/max constraints
        if (bonus < 200) return 200;
        if (bonus > 4000) return 4000;
        return Math.round(bonus);
    };

    const movingBonus = calculateMovingBonus(homeValue);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
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
                                    alt="House Icon"
                                    className="h-16 lg:w-20 w-auto"
                                    width={80}
                                    height={80}
                                />
                            </div>

                            {/* Main Content */}
                            <div className="flex-1">
                                {/* Header */}
                                <div className="mb-8">
                                    <h2 className="text-[#27306d] font-bold text-2xl lg:text-3xl mb-2 font-['Tahoma,sans-serif']">
                                        Estimated <span className="font-normal">Veteran</span>PCS Bonus
                                    </h2>
                                    <p className="text-[#231f20] text-sm font-['Tahoma,sans-serif']">
                                        Adjust the slider to see your estimated Move-In-Bonus! Are you a Veteran? See if you qualify today!
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
                                        <label className="block text-[#231f20] text-sm mb-2 font-['Tahoma,sans-serif']">
                                            Home Price
                                        </label>
                                        <input
                                            type="text"
                                            value={homeValue === 0 ? '' : formatCurrency(homeValue)}
                                            onChange={handleInputChange}
                                            placeholder="$0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-[#231f20] text-sm font-['Tahoma,sans-serif']"
                                        />
                                    </div>

                                    {/* Move-In-Bonus Display */}
                                    <div className="text-center md:text-center">
                                        <p className="text-[#231f20] text-sm mb-1 font-['Tahoma,sans-serif']">
                                            Move-In-Bonus
                                        </p>
                                        <p className="text-[#27306d] font-bold text-2xl font-['Tahoma,sans-serif']">
                                            {formatCurrency(movingBonus)}
                                        </p>
                                    </div>

                                    {/* Connect Button */}
                                    <div className="text-center md:text-center">
                                        <Link href="/contact-agent">
                                            <Button
                                                buttonText="Connect Now"
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
                        <p className="text-gray-500 text-sm max-w-2xl mx-auto font-['Tahoma,sans-serif']">
                            * Bonus amounts are estimates and may vary based on final purchase price and actual commission rates.
                        </p>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default MovingBonusCalculator; 