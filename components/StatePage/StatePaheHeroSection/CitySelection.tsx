"use client"

import { sanitizeCityName } from "@/utils/sanitizeCityName";

interface CitySelectionProps {
    cityList: string[]; // Define the type of cityList as an array of strings
}

const CitySelection = ({ cityList }: CitySelectionProps) => {
    return (
        <select
            className="w-full max-w-xs px-4 py-2 bg-white border h-[45px] rounded-md shadow-sm focus:outline-none focus:ring-2 mb-2 focus:ring-[#ffffff] focus:border-[#ffffff]"
            aria-label="Select an Area"
            onChange={(city) => {
                const targetElement = document.getElementById(sanitizeCityName(city.target.value));
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth" });
                }
            }}
        >
            <option value="" disabled selected>
                Select an Area
            </option>
            {cityList.map((city) => (
                <option key={city} value={city}>
                    {city}
                </option>
            ))}
        </select>
    )
}

export default CitySelection;