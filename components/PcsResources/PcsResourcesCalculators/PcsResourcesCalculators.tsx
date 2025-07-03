import React from "react";
import "@/app/globals.css";
import Image from "next/image";
import Link from "next/link";

const PcsResourcesCalculators = () => {
  return (
    <div className="bg-[#F5F5F5] py-16 px-5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-12 items-start">
          {/* Left Column - Title and Description */}
          <div className="lg:pr-8">
            <h2 className="text-[#003486] poppins text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Calculators
            </h2>
            <p className="text-[#003486] roboto text-lg lg:text-xl font-normal leading-relaxed">
              Military community helping our military community move.
            </p>
          </div>

          {/* Right Column - Calculator Cards */}
          <div className="grid md:grid-cols-2 sm:grid-cols-1 gap-8">
            {/* BAH Calculator */}
            <Link
              href="/pcs-resources#bah-calculator"
              target=""
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 block"
            >
              <div className="mb-6 flex justify-center">
                <Image
                  width={80}
                  height={80}
                  src="/icon/home-calculator-icon.webp"
                  alt="BAH Calculator"
                  className="h-20 w-auto"
                />
              </div>
              <h3 className="text-[#003486] poppins text-xl lg:text-2xl font-semibold mb-4">
                BAH Calculator
              </h3>
              <p className="text-[#333333] roboto text-sm lg:text-base font-normal mb-6 leading-relaxed">
                Calculate your Basic Allowance for Housing (BAH) for your next duty station.
              </p>
              <span className="text-[#A81F23] roboto text-sm lg:text-base font-medium hover:text-[#8B2D2D] transition-colors duration-300">
                Learn more
              </span>
            </Link>

            {/* Mortgage Calculator */}
            <Link
              href="/va-loan-calculator"
              className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300 block"
            >
              <div className="mb-6 flex justify-center">
                <Image
                  width={80}
                  height={80}
                  src="/icon/home-dollar.webp"
                  alt="Mortgage Calculator"
                  className="h-20 w-auto"
                />
              </div>
              <h3 className="text-[#003486] poppins text-xl lg:text-2xl font-semibold mb-4">
                Mortgage Calculator
              </h3>
              <p className="text-[#333333] roboto text-sm lg:text-base font-normal mb-6 leading-relaxed">
                Calculate your VA loan eligibility and estimated monthly payment.
              </p>
              <span className="text-[#A81F23] roboto text-sm lg:text-base font-medium hover:text-[#8B2D2D] transition-colors duration-300">
                Learn more
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesCalculators;
