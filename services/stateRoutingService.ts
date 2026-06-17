/**
 * State-based OpenPhone routing service
 * Maps states to appropriate admin phone numbers for contact form notifications
 */

import { normalizeStateSlug } from '@/lib/states';

export interface AdminContact {
    name: string;
    phoneNumber: string;
}

// Admin contact information
export const ADMIN_CONTACTS = {
    BETH: {
        name: 'Beth',
        phoneNumber: process.env.BETH_PHONE_NUMBER || '+17192495359',
    },
    JESSICA: {
        name: 'Jessica',
        phoneNumber: process.env.JESSICA_PHONE_NUMBER || '+17197825065',
    },
    STEPHANIE: {
        name: 'Stephanie',
        phoneNumber: process.env.STEPHANIE_PHONE_NUMBER || '+17192494757',
    },
    TARA: {
        name: 'Tara',
        phoneNumber: process.env.TARA_PHONE_NUMBER || '+17192497898',
    }
} as const;

export type AdminKey = keyof typeof ADMIN_CONTACTS;

export interface AdminRouting extends AdminContact {
    adminKey: AdminKey;
}

// State-to-admin mapping based on provided chart
const STATE_TO_ADMIN_MAP: Record<string, AdminKey> = {
    // Beth's states
    'alaska': 'BETH',
    'arizona': 'BETH',
    'california': 'BETH',
    'colorado': 'BETH',
    'hawaii': 'BETH',
    'idaho': 'BETH',
    'iowa': 'BETH',
    'kansas': 'BETH',
    'missouri': 'BETH',
    'montana': 'BETH',
    'nebraska': 'BETH',
    'nevada': 'BETH',
    'new-mexico': 'BETH',
    'north-dakota': 'BETH',
    'oregon': 'BETH',
    'south-dakota': 'BETH',
    'utah': 'BETH',
    'washington': 'BETH',
    'wyoming': 'BETH',

    // Jessica's states
    'alabama': 'JESSICA',
    'florida': 'JESSICA',
    'georgia': 'JESSICA',
    'north-carolina': 'JESSICA',
    'south-carolina': 'JESSICA',

    // Stephanie's states
    'connecticut': 'STEPHANIE',
    'delaware': 'STEPHANIE',
    'illinois': 'STEPHANIE',
    'indiana': 'STEPHANIE',
    'maine': 'STEPHANIE',
    'maryland': 'STEPHANIE',
    'massachusetts': 'STEPHANIE',
    'michigan': 'STEPHANIE',
    'minnesota': 'STEPHANIE',
    'new-hampshire': 'STEPHANIE',
    'new-jersey': 'STEPHANIE',
    'new-york': 'STEPHANIE',
    'ohio': 'STEPHANIE',
    'pennsylvania': 'STEPHANIE',
    'puerto-rico': 'STEPHANIE',
    'rhode-island': 'STEPHANIE',
    'vermont': 'STEPHANIE',
    'virginia': 'STEPHANIE',
    'washington-dc': 'STEPHANIE',
    'west-virginia': 'STEPHANIE',
    'wisconsin': 'STEPHANIE',

    // Tara's states
    'arkansas': 'TARA',
    'kentucky': 'TARA',
    'louisiana': 'TARA',
    'mississippi': 'TARA',
    'oklahoma': 'TARA',
    'tennessee': 'TARA',
    'texas': 'TARA',
};

export function getAdminRoutingForState(state?: string): AdminRouting | null {
    const normalizedState = normalizeStateSlug(state) ?? state?.toLowerCase().trim();
    if (!normalizedState) return null;

    const adminKey = STATE_TO_ADMIN_MAP[normalizedState];
    if (!adminKey) return null;

    const adminContact = ADMIN_CONTACTS[adminKey];
    return {
        adminKey,
        name: adminContact.name,
        phoneNumber: adminContact.phoneNumber,
    };
}

/**
 * Get the appropriate admin phone number for a given state
 * @param state - State in lowercase with hyphens (e.g., "new-hampshire")
 * @returns Admin contact information
 */
export function getAdminContactForState(state?: string): AdminContact {
    // Fallback to default if no state provided
    if (!state) {
        console.warn('No state provided for OpenPhone routing, using fallback number');
        return {
            name: 'Default',
            phoneNumber: process.env.OPEN_PHONE_FROM_NUMBER || '719-249-5359',
        };
    }

    const adminRouting = getAdminRoutingForState(state);
    if (!adminRouting) {
        console.warn(`No admin mapping found for state: ${state}, using fallback number`);
        return {
            name: 'Default',
            phoneNumber: process.env.OPEN_PHONE_FROM_NUMBER || '719-249-5359',
        };
    }

    console.log(`OpenPhone routing: ${state} -> ${adminRouting.name} (${adminRouting.phoneNumber})`);

    return {
        name: adminRouting.name,
        phoneNumber: adminRouting.phoneNumber,
    };
}

/**
 * Get admin phone number for a state (simplified interface)
 * @param state - State in lowercase with hyphens
 * @returns Phone number string
 */
export function getAdminPhoneNumberForState(state?: string): string {
    return getAdminContactForState(state).phoneNumber;
}

/**
 * Get all states managed by a specific admin
 * @param adminKey - Admin identifier
 * @returns Array of state names
 */
export function getStatesByAdmin(adminKey: AdminKey): string[] {
    return Object.entries(STATE_TO_ADMIN_MAP)
        .filter(([, admin]) => admin === adminKey)
        .map(([state]) => state);
}
