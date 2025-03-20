export function formatPhoneNumberForDisplay(phoneNumber: string): string {
    // Remove any non-digit characters and country code if present
    const cleaned = phoneNumber.replace(/\D/g, '');
    const digits = cleaned.slice(-10); // Get last 10 digits

    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhoneNumberE164(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If the number already has a country code (11 digits starting with 1)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // If it's a 10-digit number, assume US/Canada and add +1
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    // If it doesn't match our expected formats, return the original
    // This could be enhanced with more country code logic if needed
    return phoneNumber;
}

// Default export for backward compatibility
export default formatPhoneNumberForDisplay;