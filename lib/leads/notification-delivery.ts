import 'server-only';

import { isProductionSalesforceRuntime } from '@/lib/salesforce/environment.mjs';

export function getNotificationDeliveryMode(): 'live' | 'capture' | 'blocked' {
    const configuredMode = process.env.VPCS_DELIVERY_MODE;
    if (isProductionSalesforceRuntime()) {
        return configuredMode === 'live' ? 'live' : configuredMode === 'capture' ? 'capture' : 'blocked';
    }
    // The dedicated WebDev SMS transport owns real test delivery. Normal notifications stay captured.
    return !configuredMode || configuredMode === 'capture' ||
        (configuredMode === 'allowlisted' && process.env.VPCS_SALESFORCE_PROFILE === 'webdev') ? 'capture' : 'blocked';
}
