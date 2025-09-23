/**
 * Sanitizes a city name to create a valid HTML ID or URL fragment
 * Removes special characters and replaces spaces with hyphens
 * 
 * @param city - The city name to sanitize
 * @returns A sanitized string safe for use as HTML ID or URL fragment
 * 
 * @example
 * sanitizeCityName("St. Louis") // returns "st-louis"
 * sanitizeCityName("O'Fallon") // returns "ofallon"
 * sanitizeCityName("Winston-Salem") // returns "winston-salem"
 */
export function sanitizeCityName(city: string): string {
    return city
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove all special characters except letters, numbers, and spaces
        .split(" ")
        .filter(word => word.length > 0) // Remove empty strings from split
        .join("-");
}
