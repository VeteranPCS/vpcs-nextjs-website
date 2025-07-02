'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { BAHData } from '@/lib/bah-scraper';

interface FormData {
    zipCode: string;
    year: string;
    rank: string;
}

interface APIResponse {
    success: boolean;
    data?: BAHData;
    error?: string;
}

export default function BAHCalculator() {
    const [formData, setFormData] = useState<FormData>({
        zipCode: '',
        year: '',
        rank: ''
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
                body: JSON.stringify(formData)
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

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">BAH Calculator</h1>
                <p className="text-gray-600">
                    Calculate Basic Allowance for Housing (BAH) based on your rank,
                    duty station ZIP code, and dependency status.
                </p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <p className="text-sm text-gray-700 mb-2">
                    A member assigned to permanent duty within the 50 United States, who is not
                    furnished Government housing, is eligible for BAH, based on the member&apos;s rank,
                    dependency status, and permanent duty station zip code.
                </p>
                <a
                    href="https://tools.usps.com/go/ZipLookupAction!input.action"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                >
                    Look up duty station ZIP code [usps.com]
                </a>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            // Only allow numbers, max 5 digits
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                            setFormData(prev => ({ ...prev, zipCode: value }));
                        }}
                        placeholder="Enter 5-digit ZIP code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                        Year <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select Year</option>
                        <option value="25">2025</option>
                        <option value="24">2024</option>
                        <option value="23">2023</option>
                        <option value="22t">2022 Increased Rates (Effective 10/01/2022)</option>
                        <option value="22">2022</option>
                        <option value="21">2021</option>
                        <option value="20">2020</option>
                        <option value="19">2019</option>
                        <option value="18">2018</option>
                        <option value="17">2017</option>
                        <option value="16">2016</option>
                        <option value="15">2015</option>
                        <option value="14">2014</option>
                        <option value="13">2013</option>
                        <option value="12">2012</option>
                        <option value="11">2011</option>
                        <option value="10">2010</option>
                        <option value="09">2009</option>
                        <option value="08">2008</option>
                        <option value="07">2007</option>
                        <option value="06">2006</option>
                        <option value="05">2005</option>
                        <option value="04">2004</option>
                        <option value="03">2003</option>
                        <option value="02">2002</option>
                        <option value="01">2001</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="rank" className="block text-sm font-medium text-gray-700 mb-2">
                        Pay Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="rank"
                        name="rank"
                        value={formData.rank}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        <option value="">Select Pay Grade</option>
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

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Calculating...' : 'Calculate BAH'}
                </button>
            </form>

            {loading && (
                <div className="mt-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Calculating BAH rates...</p>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">Error: {error}</p>
                </div>
            )}

            {result && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">BAH Calculation Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Military Housing Area</div>
                            <div className="font-semibold">{result.mha}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Pay Grade</div>
                            <div className="font-semibold">{result.rank}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">ZIP Code</div>
                            <div className="font-semibold">{result.zipCode}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Year</div>
                            <div className="font-semibold">20{result.year}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">With Dependents</div>
                            <div className="font-semibold text-green-700">{formatCurrency(result.withDependents)}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Without Dependents</div>
                            <div className="font-semibold text-green-700">{formatCurrency(result.withoutDependents)}</div>
                        </div>
                        <div className="bg-white p-3 rounded border md:col-span-2">
                            <div className="text-sm text-gray-600">Difference</div>
                            <div className="font-semibold text-green-700">{formatCurrency(result.difference)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}