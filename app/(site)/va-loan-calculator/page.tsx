"use client";
import React, { useState, useEffect } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
} from "chart.js";
import Link from "next/link";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement
);

export default function VaLoanCalculatorPage() {
    // --------------------------
    // 1) State for form inputs
    // --------------------------
    const [homeValue, setHomeValue] = useState(250000);
    const [downPaymentPercent, setDownPaymentPercent] = useState(0);
    const [downPaymentAmount, setDownPaymentAmount] = useState(0);
    const [interestRate, setInterestRate] = useState(6.625);
    const [loanTerm, setLoanTerm] = useState(30); // in years
    const [loanType, setLoanType] = useState("purchase");
    const [militaryType, setMilitaryType] = useState("regular");
    const [isDisabledVet, setIsDisabledVet] = useState(false);
    const [usedVALoanBefore, setUsedVALoanBefore] = useState(false);

    // Advanced
    const [propertyTaxRate, setPropertyTaxRate] = useState(1.2);
    const [insuranceRate, setInsuranceRate] = useState(0.35);

    // --------------------------
    // 2) Derived values
    // --------------------------
    // Basic "VA Funding Fee" calculation. In reality, the fee depends on down
    // payment amount, usage, military type, etc. This is a *placeholder* logic.
    const computeVaFundingFee = () => {
        let feePercent = 2.3; // default for first-time regular military
        if (usedVALoanBefore) {
            feePercent = 3.6; // higher if VA loan was used before
        }
        if (downPaymentPercent >= 5 && downPaymentPercent < 10) {
            feePercent = 1.65; // just an example
        } else if (downPaymentPercent >= 10) {
            feePercent = 1.4;
        }
        // If 10%+ disabled, typically the funding fee may be waived
        if (isDisabledVet) {
            feePercent = 0;
        }
        // Return the fee in dollars
        const loanBase = homeValue - downPaymentAmount;
        return Math.round((feePercent / 100) * loanBase);
    };

    const fundingFee = computeVaFundingFee();

    // Calculate total financed amount
    const totalLoanAmount = Math.max(0, homeValue - downPaymentAmount) + fundingFee;

    // Convert interest rate (annual) to monthly decimal
    const monthlyInterestRate = interestRate / 100 / 12;
    // Convert loan term from years to months
    const numberOfPayments = loanTerm * 12;

    // Avoid division by zero
    const monthlyPI = monthlyInterestRate
        ? (totalLoanAmount *
            (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) /
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
        : totalLoanAmount / numberOfPayments;

    // monthly property taxes (example: 1.2% per year => 0.012 * homeValue / 12)
    const monthlyTaxes = (propertyTaxRate / 100) * homeValue / 12;

    // monthly insurance
    const monthlyInsurance = (insuranceRate / 100) * homeValue / 12;

    // monthly funding fee portion = (fundingFee financed into total) => effectively in the principal
    // The actual monthly portion of the funding fee is already included in your principal & interest
    // if you roll it into your loan. For clarity in the UI, we'll separate it:
    const monthlyFundingFeePortion = fundingFee ? (fundingFee / numberOfPayments) : 0;

    const monthlyPayment =
        monthlyPI + monthlyTaxes + monthlyInsurance; // the "Principal+Interest + Taxes + Insurance"

    // --------------------------
    // 3) Update down payment when percent changes
    // --------------------------
    useEffect(() => {
        const newDpAmount = Math.round((downPaymentPercent / 100) * homeValue);
        setDownPaymentAmount(newDpAmount);
    }, [downPaymentPercent, homeValue]);

    // Or if user changes the numeric down payment, update the percentage:
    const handleDownPaymentAmount = (val: string) => {
        // Remove commas before parsing
        const cleanedVal = val.replace(/,/g, '');
        const dpNum = parseInt(cleanedVal || "0", 10);
        // Ensure dpNum is not NaN and is non-negative
        const validDpNum = !isNaN(dpNum) && dpNum >= 0 ? dpNum : 0;

        setDownPaymentAmount(validDpNum);

        // Prevent division by zero or negative home value
        if (homeValue > 0) {
            const newPercent = ((validDpNum / homeValue) * 100).toFixed(3); // Use 3 decimal places
            setDownPaymentPercent(Number(newPercent));
        } else {
            setDownPaymentPercent(0);
        }
    };

    // --------------------------
    // 4) Simple amortization schedule
    // --------------------------
    // For demonstration, we'll generate an array of objects for each month
    // detailing principal portion, interest portion, and remaining balance.
    const generateAmortizationSchedule = () => {
        let balance = totalLoanAmount;
        const schedule = [];

        for (let i = 1; i <= numberOfPayments; i++) {
            const interestForMonth = balance * monthlyInterestRate;
            const principalForMonth = monthlyPI - interestForMonth;
            balance = Math.max(0, balance - principalForMonth);

            schedule.push({
                month: i,
                interest: interestForMonth,
                principal: principalForMonth,
                balance: balance,
            });

            if (balance <= 0) break;
        }
        return schedule;
    };

    const amortizationData = generateAmortizationSchedule();

    // --------------------------
    // 5) Chart data for Donut
    // --------------------------
    const donutData = {
        labels: ["Principal & Interest", "Taxes", "Insurance", "Funding Fee (Monthly Share)"],
        datasets: [
            {
                data: [
                    monthlyPI.toFixed(2),
                    monthlyTaxes.toFixed(2),
                    monthlyInsurance.toFixed(2),
                    monthlyFundingFeePortion.toFixed(2),
                ],
                // Let Chart.js auto-assign colors or add your own color array
                backgroundColor: [
                    "#1f77b4",
                    "#ff7f0e",
                    "#2ca02c",
                    "#d62728",
                ],
            },
        ],
    };

    // --------------------------
    // 6) Chart data for Payment Over Time (Line)
    // --------------------------
    // Example: total principal paid vs. total interest paid over time
    const lineLabels = amortizationData.map((d) => d.month);
    const totalPrincipalArr: number[] = [];
    const totalInterestArr: number[] = [];
    let runningPrincipal = 0;
    let runningInterest = 0;
    amortizationData.forEach((row) => {
        runningPrincipal += row.principal;
        runningInterest += row.interest;
        totalPrincipalArr.push(runningPrincipal);
        totalInterestArr.push(runningInterest);
    });

    const lineData = {
        labels: lineLabels,
        datasets: [
            {
                label: "Principal Paid (cumulative)",
                data: totalPrincipalArr,
                borderColor: "#2563eb", // Blue color
                backgroundColor: "rgba(37, 99, 235, 0.1)", // Optional: light blue fill
                borderWidth: 2, // Slightly thicker line
                pointRadius: 0, // Hide points for cleaner look
                tension: 0.1 // Add slight curve
            },
            {
                label: "Interest Paid (cumulative)",
                data: totalInterestArr,
                borderColor: "#A81F23", // Red color from button
                backgroundColor: "rgba(168, 31, 35, 0.1)", // Optional: light red fill
                borderWidth: 2, // Slightly thicker line
                pointRadius: 0, // Hide points for cleaner look
                tension: 0.1 // Add slight curve
            },
        ],
    };

    // --------------------------
    // 7) Handling tab selection
    // --------------------------
    const [activeTab, setActiveTab] = useState("breakdown"); // 'breakdown' | 'over-time' | 'amortization'
    const [currentPage, setCurrentPage] = useState(1); // State for pagination

    // Reset pagination when loan term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [numberOfPayments]);

    // Helper for formatting currency
    const toCurrency = (num: number) =>
        num
            ? num.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
            })
            : "$0";

    // --------------------------
    // Render
    // --------------------------
    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto bg-white mt-20 lg:mt-32">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-gray-900">VA Loan Calculator</h1>
            {/* ------------- Main Layout (Form + Results) ------------- */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">

                {/* ------------- Calculator Form (Left Side) ------------- */}
                <div className="flex-1 md:max-w-md lg:max-w-lg border border-gray-200 p-4 sm:p-6 rounded-lg shadow-sm bg-gray-50">
                    <h2 className="text-lg sm:text-xl font-semibold mb-5 md:mb-6 text-gray-800">Calculate your VA loan payment</h2>
                    <div className="space-y-4">
                        {/* Home Value */}
                        <div>
                            <label htmlFor="homeValue" className="block mb-1 text-sm font-medium text-gray-700">
                                Home Value:
                            </label>
                            <input
                                id="homeValue"
                                type="text"
                                inputMode="numeric"
                                value={homeValue.toLocaleString('en-US')}
                                onChange={(e) => {
                                    // Remove commas before setting state
                                    const num = parseInt(e.target.value.replace(/,/g, '') || '0', 10);
                                    setHomeValue(!isNaN(num) && num >= 0 ? num : 0);
                                }}
                                min={50000}
                                step={25000}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        {/* Down Payment Amount */}
                        <div>
                            <label htmlFor="downPaymentAmount" className="block mb-1 text-sm font-medium text-gray-700">
                                Down Payment:
                            </label>
                            <input
                                id="downPaymentAmount"
                                type="text"
                                inputMode="numeric"
                                value={downPaymentAmount.toLocaleString('en-US')}
                                onChange={(e) => handleDownPaymentAmount(e.target.value)}
                                min={0}
                                step={1000}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        {/* Down Payment Percent */}
                        <div>
                            <label htmlFor="downPaymentPercent" className="block mb-1 text-sm font-medium text-gray-700">
                                Down Payment Percent: ({downPaymentPercent.toLocaleString('en-US', { maximumFractionDigits: 3 })}%)
                            </label>
                            <input
                                id="downPaymentPercent"
                                type="range"
                                min={0}
                                max={40}
                                step={0.5}
                                value={downPaymentPercent}
                                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Interest Rate */}
                        <div>
                            <label htmlFor="interestRate" className="block mb-1 text-sm font-medium text-gray-700">
                                Interest Rate (%):
                            </label>
                            <input
                                id="interestRate"
                                type="number"
                                step={0.125}
                                min={0}
                                max={15}
                                value={interestRate}
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        {/* Loan Term */}
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Loan Term:</label>
                            <div className="flex flex-wrap gap-4 mt-1">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="loanTerm"
                                        value={30}
                                        checked={loanTerm === 30}
                                        onChange={() => setLoanTerm(30)}
                                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">30 years</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="loanTerm"
                                        value={15}
                                        checked={loanTerm === 15}
                                        onChange={() => setLoanTerm(15)}
                                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">15 years</span>
                                </label>
                            </div>
                        </div>

                        {/* Loan Type (simplified) */}
                        <div>
                            <label htmlFor="loanType" className="block mb-1 text-sm font-medium text-gray-700">
                                Loan Type:
                            </label>
                            <select
                                id="loanType"
                                value={loanType}
                                onChange={(e) => setLoanType(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                            >
                                <option value="purchase">VA Purchase Loan</option>
                                <option value="r-irrrl">VA IRRRL Refinance</option>
                                <option value="r-co">VA Cash-Out Refinance</option>
                            </select>
                        </div>

                        {/* Military Type */}
                        <div>
                            <label htmlFor="militaryType" className="block mb-1 text-sm font-medium text-gray-700">
                                Military Type:
                            </label>
                            <select
                                id="militaryType"
                                value={militaryType}
                                onChange={(e) => setMilitaryType(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                            >
                                <option value="regular">Regular Military</option>
                                <option value="reserves">Reserves/National Guard</option>
                                <option value="spouse">Surviving Spouse</option>
                            </select>
                        </div>

                        {/* VA Specifics */}
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">VA Specifics:</label>
                            <div className="space-y-2 mt-1">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDisabledVet}
                                        onChange={(e) => setIsDisabledVet(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">I am VA Disabled (10%+)</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={usedVALoanBefore}
                                        onChange={(e) => setUsedVALoanBefore(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">I have used a VA Loan before</span>
                                </label>
                            </div>
                        </div>

                        {/* Advanced settings */}
                        <details className="group">
                            <summary className="cursor-pointer list-none py-1">
                                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    Advanced Settings
                                </span>
                            </summary>
                            <div className="mt-3 border-t border-gray-200 pt-4 space-y-4">
                                <div>
                                    <label htmlFor="propertyTaxRate" className="block mb-1 text-sm font-medium text-gray-700">
                                        Property Tax Rate (% per year):
                                    </label>
                                    <input
                                        id="propertyTaxRate"
                                        type="number"
                                        step={0.125}
                                        min={0}
                                        max={10}
                                        value={propertyTaxRate}
                                        onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="insuranceRate" className="block mb-1 text-sm font-medium text-gray-700">
                                        Homeowners Insurance Rate (% per year):
                                    </label>
                                    <input
                                        id="insuranceRate"
                                        type="number"
                                        step={0.125}
                                        min={0}
                                        max={10}
                                        value={insuranceRate}
                                        onChange={(e) => setInsuranceRate(Number(e.target.value))}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </details>

                        <div className="mt-6">
                            <Link
                                href="/contact-lender"
                                className="w-full items-center justify-center bg-blue-600 inline-flex px-5 sm:px-6 py-2 sm:py-2.5 rounded-md text-center duration-300 transition-all hover:bg-blue-700 active:bg-blue-800 text-white text-sm sm:text-base font-medium leading-6 shadow-sm"
                            >
                                Get a Custom Quote
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ------------- Results / Tabs (Right Side) ------------- */}
                <div className="flex-1 border border-gray-200 p-4 sm:p-6 rounded-lg shadow-sm bg-white">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mb-6">
                        <ul className="flex flex-wrap -mb-px text-xs sm:text-sm font-medium text-center text-gray-500">
                            <li className="mr-2">
                                <button
                                    onClick={() => setActiveTab("breakdown")}
                                    className={`inline-block p-3 sm:p-4 rounded-t-lg border-b-2 ${activeTab === "breakdown"
                                        ? 'text-blue-600 border-blue-600 active'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                                >
                                    Payment Breakdown
                                </button>
                            </li>
                            <li className="mr-2">
                                <button
                                    onClick={() => setActiveTab("over-time")}
                                    className={`inline-block p-3 sm:p-4 rounded-t-lg border-b-2 ${activeTab === "over-time"
                                        ? 'text-blue-600 border-blue-600 active'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                                >
                                    Payments Over Time
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab("amortization")}
                                    className={`inline-block p-3 sm:p-4 rounded-t-lg border-b-2 ${activeTab === "amortization"
                                        ? 'text-blue-600 border-blue-600 active'
                                        : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                                >
                                    Amortization Schedule
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* ------ Tab Content Container ------ */}
                    <div>
                        {/* ------ Tab Content: Payment Breakdown ------ */}
                        {activeTab === "breakdown" && (
                            <section>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">Estimated Monthly Payment:</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">{toCurrency(monthlyPayment)}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center">
                                    <div className="max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto md:mx-0">
                                        <Doughnut data={donutData} options={{ maintainAspectRatio: true, responsive: true }} />
                                    </div>
                                    <div className="space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between">
                                            <span>Principal &amp; Interest:</span>
                                            <strong className="ml-2">{toCurrency(monthlyPI)}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Taxes:</span>
                                            <strong className="ml-2">{toCurrency(monthlyTaxes)}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Insurance:</span>
                                            <strong className="ml-2">{toCurrency(monthlyInsurance)}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>VA Funding Fee (monthly share):</span>
                                            <strong className="ml-2">{toCurrency(monthlyFundingFeePortion)}</strong>
                                        </div>
                                    </div>
                                </div>
                                <hr className="my-4 sm:my-6" />
                                <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Loan Totals:</h4>
                                <ul className="space-y-1 text-xs sm:text-sm">
                                    <li className="flex justify-between">
                                        <span>Purchase Price:</span> <strong>{toCurrency(homeValue)}</strong>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Down Payment:</span> <strong>{toCurrency(downPaymentAmount)}</strong>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>VA Funding Fee:</span> <strong>{toCurrency(fundingFee)}</strong>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Total Loan Amount:</span> <strong>{toCurrency(totalLoanAmount)}</strong>
                                    </li>
                                </ul>
                            </section>
                        )}

                        {/* ------ Tab Content: Payments Over Time (Line Chart) ------ */}
                        {activeTab === "over-time" && (
                            <section>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">How payments change over time</h3>
                                <p className="text-xs sm:text-sm text-gray-600 mb-4">
                                    This line chart shows the cumulative principal vs. cumulative interest paid
                                    as the loan progresses.
                                </p>
                                <div className="max-w-full">
                                    <Line data={lineData} options={{ maintainAspectRatio: true, responsive: true }} />
                                </div>
                            </section>
                        )}

                        {/* ------ Tab Content: Amortization Schedule ------ */}
                        {activeTab === "amortization" && (
                            <section>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Amortization Schedule</h3>
                                <p className="text-xs sm:text-sm text-gray-600 mb-4">
                                    Each month&apos;s breakdown of principal, interest, and remaining loan balance.
                                </p>

                                {/* Pagination Calculations */}
                                {(() => { // Use IIFE to keep calculations within JSX scope if needed
                                    const rowsPerPage = 12;
                                    const totalPages = Math.ceil(amortizationData.length / rowsPerPage);
                                    const startIndex = (currentPage - 1) * rowsPerPage;
                                    const endIndex = startIndex + rowsPerPage;
                                    const currentRows = amortizationData.slice(startIndex, endIndex);

                                    return (
                                        <>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs sm:text-sm text-left text-gray-600 border-collapse">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 sm:px-4 sm:py-3 border border-gray-200">Month</th>
                                                            <th className="px-3 py-2 sm:px-4 sm:py-3 border border-gray-200">Principal</th>
                                                            <th className="px-3 py-2 sm:px-4 sm:py-3 border border-gray-200">Interest</th>
                                                            <th className="px-3 py-2 sm:px-4 sm:py-3 border border-gray-200">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentRows.map((row, idx) => (
                                                            <tr key={idx + startIndex} className="bg-white border-b hover:bg-gray-50"> {/* Ensure key is unique across pages */}
                                                                <td className="px-3 py-2 sm:px-4 border border-gray-200">Month {row.month}</td>
                                                                <td className="px-3 py-2 sm:px-4 border border-gray-200">{toCurrency(row.principal)}</td>
                                                                <td className="px-3 py-2 sm:px-4 border border-gray-200">{toCurrency(row.interest)}</td>
                                                                <td className="px-3 py-2 sm:px-4 border border-gray-200">{toCurrency(row.balance)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination Controls */}
                                            {totalPages > 1 && (
                                                <div className="flex justify-between items-center mt-4">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Previous
                                                    </button>
                                                    <span className="text-sm text-gray-700">
                                                        Page {currentPage} of {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
