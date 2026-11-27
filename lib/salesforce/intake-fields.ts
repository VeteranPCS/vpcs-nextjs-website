import mappings from '@/config/salesforce/intake.json';
import type { getSalesforceConfig } from './server-config';

export function getIntakeFields(config: ReturnType<typeof getSalesforceConfig>) {
    if (config.profile === 'mock') return { honeypot: '00N000000000901', submissionHash: '00N000000000902' };
    const mapping = mappings[config.profile];
    if (!mapping.verified || config.orgId.slice(0, 15) !== mapping.orgId || mapping.honeypot === mapping.submissionHash ||
        !/^00N[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(mapping.honeypot) ||
        !/^00N[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(mapping.submissionHash)) {
        throw new Error('Verified Salesforce admission field mappings are required');
    }
    return { honeypot: mapping.honeypot, submissionHash: mapping.submissionHash };
}
