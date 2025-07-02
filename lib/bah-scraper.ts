import https from 'https';
import * as cheerio from 'cheerio';

// TypeScript interfaces
export interface BAHData {
    year: string;
    zipCode: string;
    rank: string;
    mha: string;
    withDependents: number;
    withoutDependents: number;
    difference: number;
    isValid: boolean;
}

export interface PostData extends Record<string, string> {
    report: string;
    YEAR: string;
    Zipcode: string;
    Rank: string;
}

// CRITICAL: This rank mapping must be exact
export const RANK_MAPPING: Record<string, string> = {
    '1': 'E-1', '2': 'E-2', '3': 'E-3', '4': 'E-4', '5': 'E-5',
    '6': 'E-6', '7': 'E-7', '8': 'E-8', '9': 'E-9',
    '10': 'W-1', '11': 'W-2', '12': 'W-3', '13': 'W-4', '14': 'W-5',
    '15': 'O1E', '16': 'O2E', '17': 'O3E',
    '18': 'O-1', '19': 'O-2', '20': 'O-3', '21': 'O-4', '22': 'O-5',
    '23': 'O-6', '24': 'O-7/O-7+'
};

// HTTPS request helper
function fetchPage(url: string, postData: PostData | null = null): Promise<string> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options: https.RequestOptions = {
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
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(formData).toString()
            };
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
async function extractDataFromDocument(
    $: cheerio.CheerioAPI, 
    year: string, 
    zipCode: string, 
    rankId: string, 
    rankName: string
): Promise<BAHData> {
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
export async function extractBAHData(year: string, zipCode: string, rankId: string): Promise<BAHData> {
    const rankName = RANK_MAPPING[rankId];
    
    if (!rankName) {
        throw new Error('Invalid rank ID');
    }

    console.log(`Extracting BAH data: Year=${year}, ZIP=${zipCode}, Rank=${rankName} (ID=${rankId})`);

    // CRITICAL: Direct POST data structure
    const postData: PostData = {
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