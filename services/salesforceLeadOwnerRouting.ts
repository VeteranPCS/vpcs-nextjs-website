import 'server-only';

import { getAdminRoutingForState, type AdminKey } from '@/services/stateRoutingService';

type SalesforceLeadOwnerConfig = {
    ownerId: string;
    ownerName: string;
};

const SALESFORCE_LEAD_OWNERS_BY_ADMIN: Record<AdminKey, SalesforceLeadOwnerConfig> = {
    BETH: {
        ownerId: '0054x000005GsUvAAK',
        ownerName: 'Beth Soldner',
    },
    JESSICA: {
        ownerId: '005Rg000004hWojIAE',
        ownerName: 'Jessica Brown',
    },
    STEPHANIE: {
        ownerId: '0054x0000082vHgAAI',
        ownerName: 'Stephanie Guree',
    },
    TARA: {
        ownerId: '005Rg00000BAN0DIAX',
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
