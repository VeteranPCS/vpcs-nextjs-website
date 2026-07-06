import 'server-only';

import { getAdminRoutingForState, type AdminKey } from '@/services/stateRoutingService';
import { SF_LEAD_OWNER } from '@/lib/salesforce/ids';

type SalesforceLeadOwnerConfig = {
    ownerId: string;
    ownerName: string;
};

const SALESFORCE_LEAD_OWNERS_BY_ADMIN: Record<AdminKey, SalesforceLeadOwnerConfig> = {
    BETH: {
        ownerId: SF_LEAD_OWNER.BETH,
        ownerName: 'Beth Soldner',
    },
    JESSICA: {
        ownerId: SF_LEAD_OWNER.JESSICA,
        ownerName: 'Jessica Brown',
    },
    STEPHANIE: {
        ownerId: SF_LEAD_OWNER.STEPHANIE,
        ownerName: 'Stephanie Guree',
    },
    TARA: {
        ownerId: SF_LEAD_OWNER.TARA,
        ownerName: 'Tara Gould',
    },
};

export type SalesforceLeadOwner = {
    adminKey: AdminKey;
    adminName: string;
    ownerId: string;
    ownerName: string;
};

export function getLeadOwnerForState(state?: string): SalesforceLeadOwner {
    const adminRouting = getAdminRoutingForState(state);
    if (!adminRouting) {
        throw new Error(`No admin routing found for Salesforce Lead owner state: ${state || '(missing)'}`);
    }

    const owner = SALESFORCE_LEAD_OWNERS_BY_ADMIN[adminRouting.adminKey];
    if (!owner?.ownerId) {
        throw new Error(`No Salesforce Lead OwnerId configured for admin: ${adminRouting.adminKey}`);
    }

    return {
        adminKey: adminRouting.adminKey,
        adminName: adminRouting.name,
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
    };
}
