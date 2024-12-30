"use client"

interface CityButtonProps {
    city: string;
  }
const CityButton:  React.FC<CityButtonProps> = ({city}) => {
    return (
        <button
            className="text-[#ffffff] tahoma text-sm font-normal bg-[#7E1618] rounded-[16px] px-8 py-5 text-center"
            onClick={() => {
                const targetElement = document.getElementById(city.toLowerCase().split(' ').join('-'));
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth" });
                }
            }}
        >
            {city} Agents
        </button>
    );
};

export default CityButton;