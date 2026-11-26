import 'server-only';

import { isProductionSalesforceRuntime } from '@/lib/salesforce/environment.mjs';

export function getNotificationDeliveryMode(): 'live' | 'capture' | 'blocked' {
    const configuredMode = process.env.VPCS_DELIVERY_MODE;
    if (isProductionSalesforceRuntime()) {
        return configuredMode === 'live' ? 'live' : configuredMode === 'capture' ? 'capture' : 'blocked';
    }
    // Slack stays captured in WebDev, including during allowlisted Salesforce delivery.
    return !configuredMode || configuredMode === 'capture' ||
        (configuredMode === 'allowlisted' && process.env.VPCS_SALESFORCE_PROFILE === 'webdev') ? 'capture' : 'blocked';
}
