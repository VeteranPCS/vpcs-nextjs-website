import 'server-only';

import { getAdminRoutingForState, type AdminKey } from '@/services/stateRoutingService';
import { getSalesforceConfig } from '@/lib/salesforce/server-config';

const OWNER_NAMES: Record<AdminKey, string> = {
    BETH: 'Beth Soldner',
    JESSICA: 'Jessica Brown',
    STEPHANIE: 'Stephanie Guree',
    TARA: 'Tara Gould',
};

export type SalesforceLeadOwner = {
    adminKey: AdminKey;
    adminName: string;
    ownerId: string;
    ownerName: string;
};

export function getLeadOwnerForState(state?: string): SalesforceLeadOwner {
    const adminRouting = getAdminRoutingForState(state);
    const ownerId = getSalesforceConfig().leadOwners[adminRouting.adminKey];
    if (!ownerId) {
        throw new Error(`No Salesforce Lead OwnerId configured for admin: ${adminRouting.adminKey}`);
    }

    return {
        adminKey: adminRouting.adminKey,
        adminName: adminRouting.name,
        ownerId,
        ownerName: OWNER_NAMES[adminRouting.adminKey],
    };
}
