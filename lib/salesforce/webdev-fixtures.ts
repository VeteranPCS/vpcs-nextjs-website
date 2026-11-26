import 'server-only';

import fixtures from '@/config/salesforce/webdev-fixtures.json';
import type { SalesforceEnvironment } from './environment.mjs';

export function isWebdevPartnerFixture(
    target: Pick<SalesforceEnvironment, 'profile' | 'orgId'>,
    role: keyof typeof fixtures.accountIds,
    id: string,
): boolean {
    return target.profile === 'webdev'
        && (target.orgId === fixtures.orgId || target.orgId === fixtures.orgId.slice(0, 15))
        && fixtures.accountIds[role].some(fixtureId => id === fixtureId || id === fixtureId.slice(0, 15));
}
