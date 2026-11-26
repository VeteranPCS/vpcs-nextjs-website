import customerAdmins from '@/config/routing/customer-admins.json';
import { normalizeStateCode, stateSlugFromAbbr } from '@/lib/states';

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

const { territories } = customerAdmins;
const TERRITORY_ADMINS = ['BETH', 'STEPHANIE'] as const;
const ADMIN_BY_STATE = new Map(TERRITORY_ADMINS.flatMap((admin) =>
    territories[admin].map((code) => [code, admin] as const)));
const defaultAdmin = customerAdmins.defaultAdmin;
if (defaultAdmin !== 'BETH' && defaultAdmin !== 'STEPHANIE') {
    throw new Error('Invalid default admin in customer routing policy');
}
const DEFAULT_ADMIN: (typeof TERRITORY_ADMINS)[number] = defaultAdmin;

export function getAdminRoutingForState(state?: string): AdminRouting {
    const stateCode = normalizeStateCode(state);
    const adminKey = ADMIN_BY_STATE.get(stateCode ?? '') ?? DEFAULT_ADMIN;
    return { adminKey, ...ADMIN_CONTACTS[adminKey] };
}

export function getAdminContactForState(state?: string): AdminContact {
    const { name, phoneNumber } = getAdminRoutingForState(state);
    console.log('OpenPhone state routing resolved');
    return { name, phoneNumber };
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
    if (adminKey !== 'BETH' && adminKey !== 'STEPHANIE') return [];

    return territories[adminKey].map(stateSlugFromAbbr).filter((slug) => slug !== null);
}
