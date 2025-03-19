export default function formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters and country code if present
    const cleaned = phoneNumber.replace(/\D/g, '');
    const digits = cleaned.slice(-10); // Get last 10 digits

    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}