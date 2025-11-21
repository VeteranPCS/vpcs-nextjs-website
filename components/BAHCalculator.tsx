'use client';

import { useState, FormEvent, ChangeEvent, useEffect, useRef } from 'react';
import { BAHData } from '@/lib/bah-scraper';
import Link from 'next/link';
import { sendGTMEvent } from "@next/third-parties/google";

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
    const lastRequestRef = useRef<string>('');

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
            const response = await fetch('/api/v1/bah', {
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

                // Send GTM event for successful BAH calculation
                sendGTMEvent({
                    event: 'bah_calculator_use',
                    bah_zip_code: formData.zipCode,
                    bah_paygrade: getRankDisplayName(formData.rank)
                });
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

    // Auto-submit when all required fields are filled (excluding dependents as it doesn't affect API call)
    useEffect(() => {
        if (formData.zipCode && formData.rank && !loading) {
            // Create a unique request key to prevent duplicate requests (excluding dependents)
            const requestKey = `${formData.zipCode}-${formData.rank}-${formData.year}`;

            // Don't make the same request twice
            if (requestKey === lastRequestRef.current) {
                return;
            }

            // Auto-submit after a short delay to prevent excessive API calls
            const timer = setTimeout(async () => {
                // Check again if this is still the latest request
                if (requestKey !== `${formData.zipCode}-${formData.rank}-${formData.year}`) {
                    return;
                }

                lastRequestRef.current = requestKey;

                try {
                    setLoading(true);
                    setError(null);
                    setResult(null);

                    const response = await fetch('/api/v1/bah', {
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

                        // Send GTM event for successful BAH calculation
                        sendGTMEvent({
                            event: 'bah_calculator_use',
                            bah_zip_code: formData.zipCode,
                            bah_paygrade: getRankDisplayName(formData.rank)
                        });
                    } else {
                        setError(data.error || 'Unknown error occurred');
                    }
                } catch (err) {
                    setError('Failed to calculate BAH. Please try again.');
                } finally {
                    setLoading(false);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [formData.zipCode, formData.rank, formData.year, loading]);

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
        <div id="bah-calculator" className="w-full max-w-6xl mx-auto my-8 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                {/* Left Column - Calculator Form */}
                <div className="flex-1 p-6 md:p-10 lg:p-12">
                    {/* Header with Icon */}
                    <div className="flex items-start mb-6 md:mb-8">
                        <div className="mr-4 flex-shrink-0">
                            {/* House + Calculator Icon */}
                            <div className="relative">
                                <svg width="60" height="60" viewBox="0 0 60 60" className="text-blue-900">
                                    {/* House */}
                                    <path d="M30 8L12 21v24h12V30h12v15h12V21L30 8z" fill="currentColor" />
                                    {/* Calculator */}
                                    <rect x="35" y="32" width="18" height="22" rx="2" fill="currentColor" />
                                    <rect x="37" y="34" width="14" height="3" fill="white" />
                                    <circle cx="39" cy="41" r="1.5" fill="white" />
                                    <circle cx="44" cy="41" r="1.5" fill="white" />
                                    <circle cx="49" cy="41" r="1.5" fill="white" />
                                    <circle cx="39" cy="46" r="1.5" fill="white" />
                                    <circle cx="44" cy="46" r="1.5" fill="white" />
                                    <circle cx="49" cy="46" r="1.5" fill="white" />
                                    <circle cx="39" cy="51" r="1.5" fill="white" />
                                    <circle cx="44" cy="51" r="1.5" fill="white" />
                                    <circle cx="49" cy="51" r="1.5" fill="white" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">BAH Calculator</h1>
                            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                                Use the BAH calculator below to find your 2025 BAH rates. Enter your
                                pay grade, dependent status and duty station ZIP code to see
                                your monthly and annual BAH amount.
                            </p>
                        </div>
                    </div>


                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                            {/* Paygrade */}
                            <div className="flex-1">
                                <label htmlFor="rank" className="block text-sm md:text-base font-medium text-gray-700 mb-3">
                                    Paygrade
                                </label>
                                <select
                                    id="rank"
                                    name="rank"
                                    value={formData.rank}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 md:py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    required
                                >
                                    {!formData.rank && <option value="">--Select--</option>}
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
                            <div className="flex-1">
                                <label className="block text-sm md:text-base font-medium text-gray-700 mb-3">
                                    Dependents
                                </label>
                                <button
                                    type="button"
                                    onClick={toggleDependents}
                                    className={`w-full px-4 py-3 md:py-4 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${formData.dependents
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {formData.dependents ? 'With dependents' : 'No dependents'}
                                </button>
                            </div>

                            {/* ZIP Code */}
                            <div className="flex-1">
                                <label htmlFor="zipCode" className="block text-sm md:text-base font-medium text-gray-700 mb-3">
                                    Duty Station ZIP Code
                                </label>
                                <input
                                    type="text"
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleZipCodeChange}
                                    placeholder="12345"
                                    className="w-full px-4 py-3 md:py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700">Error: {error}</p>
                        </div>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="flex-1 bg-red-800 p-6 md:p-10 lg:p-12 text-white">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-lg">Calculating BAH rates...</p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="h-full flex flex-col">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1">{result.mha}</h2>
                                <p className="text-sm opacity-90">
                                    {getRankDisplayName(formData.rank)} {formData.dependents ? 'With' : 'Without'} Dependents at {result.zipCode}
                                </p>
                                <div className="w-full h-px bg-white opacity-30 mt-4"></div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <p className="text-sm opacity-90 mb-1">Monthly Allowance</p>
                                    <p className="text-4xl font-bold leading-none">
                                        {formatCurrency(formData.dependents ? result.withDependents : result.withoutDependents)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm opacity-90 mb-1">Yearly Allowance</p>
                                    <p className="text-2xl font-bold leading-none">
                                        {formatCurrency((formData.dependents ? result.withDependents : result.withoutDependents) * 12)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Link href="/contact-lender" className="w-full bg-blue-800 text-white py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors font-semibold text-sm">
                                    Questions about VA Loan?
                                </Link>
                            </div>
                        </div>
                    )}

                    {!result && !loading && (
                        <div className="flex items-center justify-center">
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