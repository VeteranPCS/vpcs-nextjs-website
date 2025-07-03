# BAH Calculator - Complete Next.js 14 Migration Guide

## 🎯 Project Overview
This guide transfers a working BAH (Basic Allowance for Housing) Calculator from Node.js/Express to Next.js 14. The calculator scrapes real-time data from `defensetravel.dod.mil` using an optimized direct POST method.

## ✅ Key Technical Discoveries (CRITICAL TO PRESERVE)

### Core Breakthrough
- **Original approach failed**: GET requests return redirect pages, not data
- **Working solution**: Direct POST to `/neorates/report/index.php` with form data
- **Performance gain**: 50% fewer network requests by skipping redirects

### Exact Working Configuration
- **Endpoint**: `https://www.defensetravel.dod.mil/neorates/report/index.php`
- **Method**: POST
- **Form Data**: `{ report: 'bah', YEAR: '25', Zipcode: '98115', Rank: '5' }`
- **Target Container**: `#ImportDiv2`
- **Amount Cells**: `td.trn-cola.text-center:contains("$")`

### Tested Working Examples ✅
- Seattle, WA (98115) E-5: $3,051/$2,574
- Norfolk, VA (23511) O-1: $2,508/$2,322  
- San Diego, CA (92134) E-1: $3,663/$2,748

---

## 📋 STEP-BY-STEP MIGRATION INSTRUCTIONS

### Step 1: Setup Next.js Dependencies
```bash
# In your Next.js project root
npm install cheerio
```

### Step 2: Create Core Extraction Library
**File: `lib/bah-scraper.js`**

```javascript
import https from 'https';
import * as cheerio from 'cheerio';

// CRITICAL: This rank mapping must be exact
export const RANK_MAPPING = {
    '1': 'E-1', '2': 'E-2', '3': 'E-3', '4': 'E-4', '5': 'E-5',
    '6': 'E-6', '7': 'E-7', '8': 'E-8', '9': 'E-9',
    '10': 'W-1', '11': 'W-2', '12': 'W-3', '13': 'W-4', '14': 'W-5',
    '15': 'O1E', '16': 'O2E', '17': 'O3E',
    '18': 'O-1', '19': 'O-2', '20': 'O-3', '21': 'O-4', '22': 'O-5',
    '23': 'O-6', '24': 'O-7/O-7+'
};

// HTTPS request helper
function fetchPage(url, postData = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: postData ? 'POST' : 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };

        if (postData) {
            const formData = new URLSearchParams(postData).toString();
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.headers['Content-Length'] = Buffer.byteLength(formData);
        }

        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                if (response.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            });
        });

        request.on('error', reject);

        if (postData) {
            const formData = new URLSearchParams(postData).toString();
            request.write(formData);
        }

        request.end();
    });
}

// Data extraction from HTML document
async function extractDataFromDocument($, year, zipCode, rankId, rankName) {
    const importDiv = $('#ImportDiv2');
    
    if (importDiv.length === 0) {
        throw new Error('Could not find BAH data container');
    }

    // Extract Military Housing Area
    const mhaDiv = importDiv.find('div:contains("MILITARY HOUSING AREA:")');
    const mhaText = mhaDiv.text();
    const mhaMatch = mhaText.match(/MILITARY HOUSING AREA:\s*(.+)/);
    const mha = mhaMatch ? mhaMatch[1].trim() : 'Unknown';

    // Extract Year
    const yearDiv = importDiv.find('div:contains("CY:")');
    const yearText = yearDiv.text();
    const yearMatch = yearText.match(/CY:\s*(.+)/);
    const extractedYear = yearMatch ? yearMatch[1].trim().replace(/\s/g, '') : 'Unknown';

    // Extract ZIP
    const zipDiv = importDiv.find('div:contains("ZIP CODE:")');
    const zipText = zipDiv.text();
    const zipMatch = zipText.match(/ZIP CODE:\s*(.+)/);
    const extractedZip = zipMatch ? zipMatch[1].trim().replace(/\s/g, '') : 'Unknown';

    // Extract BAH amounts
    const table = importDiv.find('table');
    if (table.length === 0) {
        throw new Error('No table found within BAH data container');
    }

    const amountCells = table.find('td.trn-cola.text-center:contains("$")');
    
    if (amountCells.length < 2) {
        throw new Error('Could not find BAH amount cells');
    }

    const withDepsText = $(amountCells[0]).text();
    const withoutDepsText = $(amountCells[1]).text();

    const withDependents = parseFloat(withDepsText.replace(/[$,\s]/g, ''));
    const withoutDependents = parseFloat(withoutDepsText.replace(/[$,\s]/g, ''));

    const isValid = withDependents > 0 && withoutDependents > 0 && withDependents > withoutDependents;

    if (!isValid) {
        throw new Error('Invalid BAH amounts extracted');
    }

    return {
        year: extractedYear,
        zipCode: extractedZip,
        rank: rankName,
        mha,
        withDependents,
        withoutDependents,
        difference: withDependents - withoutDependents,
        isValid
    };
}

// Main extraction function
export async function extractBAHData(year, zipCode, rankId) {
    const rankName = RANK_MAPPING[rankId];
    
    if (!rankName) {
        throw new Error('Invalid rank ID');
    }

    console.log(`Extracting BAH data: Year=${year}, ZIP=${zipCode}, Rank=${rankName} (ID=${rankId})`);

    // CRITICAL: Direct POST data structure
    const postData = {
        report: 'bah',
        YEAR: year,
        Zipcode: zipCode,
        Rank: rankId.toString()
    };

    // CRITICAL: Direct POST URL
    const postUrl = 'https://www.defensetravel.dod.mil/neorates/report/index.php';
    const html = await fetchPage(postUrl, postData);

    const $ = cheerio.load(html);
    return await extractDataFromDocument($, year, zipCode, rankId, rankName);
}
```

### Step 3: Create Next.js API Route
**File: `app/api/bah/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { extractBAHData, RANK_MAPPING } from '@/lib/bah-scraper';

export async function POST(request) {
    try {
        const { year, zipCode, rank } = await request.json();

        // Validate input
        if (!year || !zipCode || !rank) {
            return NextResponse.json({ 
                success: false,
                error: 'Missing required fields: year, zipCode, and rank are required' 
            }, { status: 400 });
        }

        if (!/^\d{5}$/.test(zipCode)) {
            return NextResponse.json({ 
                success: false,
                error: 'ZIP code must be exactly 5 digits' 
            }, { status: 400 });
        }

        if (!RANK_MAPPING[rank]) {
            return NextResponse.json({ 
                success: false,
                error: 'Invalid rank ID' 
            }, { status: 400 });
        }

        console.log(`BAH API request: year=${year}, zipCode=${zipCode}, rank=${rank}`);

        // Extract BAH data
        const result = await extractBAHData(year, zipCode, rank);

        console.log(`BAH extraction successful:`, result);

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('BAH extraction error:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
```

## 🧪 TESTING INSTRUCTIONS

### Test with these exact values to verify it works:
1. **Seattle Test**: ZIP: 98115, Year: 2025, Rank: E-5
   - Expected: ~$3,051/$2,574
2. **Norfolk Test**: ZIP: 23511, Year: 2025, Rank: O-1  
   - Expected: ~$2,508/$2,322
3. **San Diego Test**: ZIP: 92134, Year: 2025, Rank: E-1
   - Expected: ~$3,663/$2,748

## 🚨 CRITICAL SUCCESS FACTORS

1. **DO NOT CHANGE** the POST endpoint URL
2. **DO NOT CHANGE** the form data structure 
3. **DO NOT CHANGE** the CSS selectors
4. **DO NOT CHANGE** the RANK_MAPPING object
5. **Keep the exact headers** in the HTTPS request

## 📝 FINAL CHECKLIST

- [ ] Install `cheerio` dependency
- [ ] Create `lib/bah-scraper.js` with exact code above
- [ ] Create `app/api/bah/route.js` with exact code above  
- [ ] Create React component for frontend
- [ ] Test with the 3 verified examples
- [ ] Verify currency formatting shows commas
- [ ] Confirm error handling works for invalid inputs

### Step 4: Create React Component
**File: `app/components/BAHCalculator.jsx`**

```jsx
'use client';

import { useState } from 'react';

export default function BAHCalculator() {
    const [formData, setFormData] = useState({
        zipCode: '',
        year: '',
        rank: ''
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Currency formatter
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const handleSubmit = async (e) => {
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

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to calculate BAH. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
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
                    furnished Government housing, is eligible for BAH, based on the member's rank, 
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
                        onChange={(e) => {
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
```

### Step 5: Use Component in Your App
**In any page file (e.g., `app/bah/page.js`):**

```jsx
import BAHCalculator from '@/app/components/BAHCalculator';

export default function BAHPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <BAHCalculator />
        </div>
    );
}
```

---

## 📋 COMPLETE EXECUTION CHECKLIST

### Phase 1: Setup
1. [ ] Open your Next.js 14 project
2. [ ] Run `npm install cheerio`
3. [ ] Ensure you have Tailwind CSS configured (or adapt the styles)

### Phase 2: Backend Implementation
4. [ ] Create `lib/bah-scraper.js` and copy the exact code from Step 2
5. [ ] Create `app/api/bah/route.js` and copy the exact code from Step 3
6. [ ] Verify file paths and imports are correct

### Phase 3: Frontend Implementation  
7. [ ] Create `app/components/BAHCalculator.jsx` and copy the exact code from Step 4
8. [ ] Create a page to use the component (Step 5)
9. [ ] Test the component renders without errors

### Phase 4: Verification Tests
10. [ ] Test Seattle: ZIP 98115, Year 2025, Rank E-5 → Should return ~$3,051/$2,574
11. [ ] Test Norfolk: ZIP 23511, Year 2025, Rank O-1 → Should return ~$2,508/$2,322
12. [ ] Test San Diego: ZIP 92134, Year 2025, Rank E-1 → Should return ~$3,663/$2,748
13. [ ] Verify currency formatting shows commas (e.g., $3,051.00)
14. [ ] Test error handling with invalid ZIP codes

### Phase 5: Integration
15. [ ] Style component to match your app's design system
16. [ ] Add any additional error logging or analytics
17. [ ] Deploy and test in production environment

---

## 🎯 SUCCESS INDICATORS

**When working correctly, you should see:**
- Server logs: `BAH API request: year=25, zipCode=98115, rank=5`
- Server logs: `BAH extraction successful: { withDependents: 3051, ... }`
- Frontend displays: "$3,051.00" with proper comma formatting
- Loading states and error handling work smoothly

**If you see errors, check:**
- Import paths are correct (`@/lib/bah-scraper`)
- Cheerio is installed (`npm list cheerio`)
- API route is accessible at `/api/bah`
- Console for any JavaScript errors

---

## 🚀 ONE-LINE SUMMARY FOR CLAUDE

**When starting work in your Next.js project, tell Claude:**

> "I have a working Node.js BAH calculator that scrapes defensetravel.dod.mil using direct POST to /neorates/report/index.php. It extracts data from #ImportDiv2 container using Cheerio. I need to convert this to Next.js 14 with an API route and React component. I have a complete migration guide with all the working code."

Then share this `NEXTJS_MIGRATION_GUIDE.md` file to preserve all context!

**This migration preserves 100% of the working logic while adapting it to Next.js 14 App Router structure! 🎉**
