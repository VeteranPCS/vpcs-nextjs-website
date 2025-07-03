'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { BAHData } from '@/lib/bah-scraper';

interface FormData {
    zipCode: string;
    year: string;
    rank: string;
    dependents: boolean;
}

interface APIResponse {
    success: boolean;
    data?: BAHData;
    error?: string;
}

export default function BAHCalculator() {
    const [formData, setFormData] = useState<FormData>({
        zipCode: '',
        year: '25', // Default to 2025
        rank: '',
        dependents: false
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<BAHData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Currency formatter
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/bah', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    zipCode: formData.zipCode,
                    year: formData.year,
                    rank: formData.rank
                })
            });

            const data: APIResponse = await response.json();

            if (data.success && data.data) {
                setResult(data.data);
            } else {
                setError(data.error || 'Unknown error occurred');
            }
        } catch (err) {
            setError('Failed to calculate BAH. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleZipCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
        // Only allow numbers, max 5 digits
        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
        setFormData(prev => ({ ...prev, zipCode: value }));
    };

    const toggleDependents = (): void => {
        setFormData(prev => ({ ...prev, dependents: !prev.dependents }));
    };

    const getRankDisplayName = (rankValue: string): string => {
        const rankMap: { [key: string]: string } = {
            '1': 'E-1', '2': 'E-2', '3': 'E-3', '4': 'E-4', '5': 'E-5',
            '6': 'E-6', '7': 'E-7', '8': 'E-8', '9': 'E-9',
            '10': 'W-1', '11': 'W-2', '12': 'W-3', '13': 'W-4', '14': 'W-5',
            '15': 'O1E', '16': 'O2E', '17': 'O3E',
            '18': 'O-1', '19': 'O-2', '20': 'O-3', '21': 'O-4', '22': 'O-5', '23': 'O-6', '24': 'O-7/O-7+'
        };
        return rankMap[rankValue] || rankValue;
    };

    return (
        <div className="w-full max-w-6xl mx-auto my-8 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                {/* Left Column - Calculator Form */}
                <div className="flex-1 p-6 lg:p-12">
                    {/* Header with Icon */}
                    <div className="flex items-start mb-8">
                        <div className="mr-6 flex-shrink-0">
                            {/* House + Calculator Icon */}
                            <div className="relative">
                                <svg width="80" height="80" viewBox="0 0 80 80" className="text-blue-900">
                                    {/* House */}
                                    <path d="M40 10L16 28v32h16V40h16v20h16V28L40 10z" fill="currentColor" />
                                    <path d="M40 10L16 28v32h16V40h16v20h16V28L40 10z" stroke="currentColor" strokeWidth="2" fill="none" />
                                    {/* Calculator */}
                                    <rect x="50" y="45" width="24" height="30" rx="3" fill="currentColor" />
                                    <rect x="52" y="47" width="20" height="4" fill="white" />
                                    <circle cx="55" cy="55" r="2" fill="white" />
                                    <circle cx="61" cy="55" r="2" fill="white" />
                                    <circle cx="67" cy="55" r="2" fill="white" />
                                    <circle cx="55" cy="61" r="2" fill="white" />
                                    <circle cx="61" cy="61" r="2" fill="white" />
                                    <circle cx="67" cy="61" r="2" fill="white" />
                                    <circle cx="55" cy="67" r="2" fill="white" />
                                    <circle cx="61" cy="67" r="2" fill="white" />
                                    <circle cx="67" cy="67" r="2" fill="white" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl lg:text-4xl font-bold text-blue-900 mb-3">BAH Calculator</h1>
                            <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
                                Use the BAH calculator below to find your 2025 BAH rates. Enter your
                                pay grade, dependent status and duty station (Zip code or city) to see
                                your monthly and annual BAH amount.
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                        <p className="text-gray-700 mb-2 leading-relaxed text-sm">
                            A member assigned to permanent duty within the 50 United States, who is not
                            furnished Government housing, is eligible for BAH, based on the member&apos;s rank,
                            dependency status, and permanent duty station zip code.
                        </p>
                        <a
                            href="https://tools.usps.com/go/ZipLookupAction!input.action"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium underline text-sm"
                        >
                            Look up duty station ZIP code [usps.com]
                        </a>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Paygrade */}
                            <div>
                                <label htmlFor="rank" className="block text-sm font-medium text-gray-700 mb-2">
                                    Paygrade
                                </label>
                                <select
                                    id="rank"
                                    name="rank"
                                    value={formData.rank}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    required
                                >
                                    <option value="">E-4</option>
                                    <option value="1">E-1</option>
                                    <option value="2">E-2</option>
                                    <option value="3">E-3</option>
                                    <option value="4">E-4</option>
                                    <option value="5">E-5</option>
                                    <option value="6">E-6</option>
                                    <option value="7">E-7</option>
                                    <option value="8">E-8</option>
                                    <option value="9">E-9</option>
                                    <option value="10">W-1</option>
                                    <option value="11">W-2</option>
                                    <option value="12">W-3</option>
                                    <option value="13">W-4</option>
                                    <option value="14">W-5</option>
                                    <option value="15">O1E</option>
                                    <option value="16">O2E</option>
                                    <option value="17">O3E</option>
                                    <option value="18">O-1</option>
                                    <option value="19">O-2</option>
                                    <option value="20">O-3</option>
                                    <option value="21">O-4</option>
                                    <option value="22">O-5</option>
                                    <option value="23">O-6</option>
                                    <option value="24">O-7/O-7+</option>
                                </select>
                            </div>

                            {/* Dependents */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dependents
                                </label>
                                <button
                                    type="button"
                                    onClick={toggleDependents}
                                    className={`w-full px-3 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${formData.dependents
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    I have dependents
                                </button>
                            </div>

                            {/* ZIP Code */}
                            <div>
                                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                                    Duty Station ZIP Code or City
                                </label>
                                <input
                                    type="text"
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleZipCodeChange}
                                    placeholder="Columbia, MO"
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
                            >
                                {loading ? 'Calculating...' : 'Calculate BAH'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700">Error: {error}</p>
                        </div>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="flex-1 bg-red-800 p-6 lg:p-12 text-white min-h-[400px] lg:min-h-[500px]">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-lg">Calculating BAH rates...</p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="h-full flex flex-col">
                            <div className="mb-8">
                                <h2 className="text-2xl lg:text-3xl font-bold mb-3">{result.mha}</h2>
                                <p className="text-base lg:text-lg opacity-90">
                                    {getRankDisplayName(result.rank)} {formData.dependents ? 'With' : 'Without'} Dependents at {result.zipCode}
                                </p>
                                <div className="w-full h-px bg-white opacity-30 mt-4"></div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div>
                                    <p className="text-base opacity-90 mb-2">Monthly Allowance</p>
                                    <p className="text-3xl lg:text-4xl font-bold leading-none">
                                        {formatCurrency(formData.dependents ? result.withDependents : result.withoutDependents)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-base opacity-90 mb-2">Yearly Allowance</p>
                                    <p className="text-2xl lg:text-3xl font-bold leading-none">
                                        {formatCurrency((formData.dependents ? result.withDependents : result.withoutDependents) * 12)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button className="w-full bg-blue-800 text-white py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors font-semibold text-base">
                                    Questions about VA Loan?
                                </button>
                            </div>
                        </div>
                    )}

                    {!result && !loading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <h3 className="text-xl lg:text-2xl font-bold mb-4">Calculate Your BAH</h3>
                                <p className="text-base opacity-90 leading-relaxed">
                                    Enter your information in the form to see your Basic Allowance for Housing rates.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}