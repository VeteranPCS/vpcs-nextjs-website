import 'server-only';

import { SALESFORCE_API_VERSION, SALESFORCE_BASE_URL } from '@/constants/api';
import { RequestType, salesForceAPI } from '@/services/api';
import { getSalesforceToken } from '@/services/salesForceTokenService';
import { getLeadOwnerForState, type SalesforceLeadOwner } from '@/services/salesforceLeadOwnerRouting';
import { logError, logInfo } from '@/services/loggingService';
import { escapeSoqlLiteral } from '@/services/soql';

const CUSTOMER_LEAD_RECORD_TYPE_ID = '0124x000000Z5yDAAS';
const WEB_FORM_URL_MAX_LENGTH = 255;
const LEAD_LOOKUP_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 0 : 12_000;
const LEAD_LOOKUP_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 750;
const OWNER_CONFIRM_TIMEOUT_MS = process.env.NODE_ENV === 'test' ? 0 : 10_000;
const OWNER_CONFIRM_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 750;

type LeadSource = 'Contact Agent' | 'Contact Lender';

type SalesforceLeadRecord = {
    Id: string;
    OwnerId?: string | null;
    Owner?: {
        Name?: string | null;
    } | null;
};

type RouteSalesforceLeadOwnerParams = {
    submissionId: string;
    submissionStartedAt: Date;
    leadSource: LeadSource;
    destinationStateCode: string;
    destinationStateSlug: string;
    owner?: SalesforceLeadOwner;
    email?: string | null;
    selectedAgentId?: string | null;
    selectedLenderId?: string | null;
};

export type SalesforceLeadOwnerRouteResult = {
    leadId: string;
    ownerId: string;
    ownerName?: string | null;
    adminName: string;
};

export function appendLeadOwnerSubmissionMarker(webFormUrl: string, submissionId: string): string {
    const markerName = 'sid';
    const encodedSubmissionId = encodeURIComponent(submissionId);

    try {
        const url = new URL(webFormUrl);
        url.searchParams.set(markerName, submissionId);

        const markedUrl = url.toString();
        if (markedUrl.length <= WEB_FORM_URL_MAX_LENGTH) return markedUrl;

        const compactUrl = `${url.origin}${url.pathname}?${markerName}=${encodedSubmissionId}`;
        if (compactUrl.length <= WEB_FORM_URL_MAX_LENGTH) return compactUrl;

        return markedUrl.slice(0, WEB_FORM_URL_MAX_LENGTH);
    } catch {
        const separator = webFormUrl.includes('?') ? '&' : '?';
        const markedUrl = `${webFormUrl}${separator}${markerName}=${encodedSubmissionId}`;
        return markedUrl.length <= WEB_FORM_URL_MAX_LENGTH
            ? markedUrl
            : markedUrl.slice(0, WEB_FORM_URL_MAX_LENGTH);
    }
}

export async function routeSalesforceLeadOwner(
    params: RouteSalesforceLeadOwnerParams,
): Promise<SalesforceLeadOwnerRouteResult> {
    const owner = params.owner ?? getLeadOwnerForState(params.destinationStateSlug);
    const lead = await findCreatedLead(params);

    if (lead.OwnerId === owner.ownerId) {
        logInfo('Salesforce Lead owner already matched routing target', {
            submissionId: params.submissionId,
            leadId: lead.Id,
            destinationStateCode: params.destinationStateCode,
            destinationStateSlug: params.destinationStateSlug,
            adminName: owner.adminName,
            ownerId: owner.ownerId,
            ownerName: lead.Owner?.Name ?? owner.ownerName,
        });
    } else {
        await patchLeadOwner(lead.Id, owner, params.submissionId);
    }

    const confirmedLead = await waitForLeadOwnerConfirmation(lead.Id, owner, params.submissionId);

    logInfo('Salesforce Lead owner routing confirmed', {
        submissionId: params.submissionId,
        leadId: lead.Id,
        destinationStateCode: params.destinationStateCode,
        destinationStateSlug: params.destinationStateSlug,
        adminName: owner.adminName,
        ownerId: owner.ownerId,
        ownerName: confirmedLead.Owner?.Name ?? owner.ownerName,
    });

    return {
        leadId: lead.Id,
        ownerId: owner.ownerId,
        ownerName: confirmedLead.Owner?.Name ?? owner.ownerName,
        adminName: owner.adminName,
    };
}

async function findCreatedLead(params: RouteSalesforceLeadOwnerParams): Promise<SalesforceLeadRecord> {
    const deadline = Date.now() + LEAD_LOOKUP_TIMEOUT_MS;
    let lastNoMatchLookupType = 'submission marker or fallback criteria';

    while (Date.now() <= deadline) {
        const markerLead = await findLeadBySubmissionMarker(params.submissionId);
        if (markerLead) return markerLead;
        lastNoMatchLookupType = 'submission marker';

        const fallbackLead = await findLeadByFallbackCriteria(params);
        if (fallbackLead) return fallbackLead;
        lastNoMatchLookupType = 'fallback criteria';

        await delay(LEAD_LOOKUP_INTERVAL_MS);
    }

    logError('Salesforce Lead owner lookup found no matching Lead', {
        submissionId: params.submissionId,
        lookupType: lastNoMatchLookupType,
        timeoutMs: LEAD_LOOKUP_TIMEOUT_MS,
    });
    throw new Error(`Unable to locate unique Salesforce Lead for submission ${params.submissionId}`);
}

async function findLeadBySubmissionMarker(submissionId: string): Promise<SalesforceLeadRecord | null> {
    const safeMarker = escapeSoqlLiteral(`sid=${submissionId}`);
    const soql = `
        SELECT Id, OwnerId, Owner.Name
        FROM Lead
        WHERE WebFormURL__c LIKE '%${safeMarker}%'
        ORDER BY CreatedDate DESC
        LIMIT 2
    `.replace(/\s+/g, ' ').trim();

    return findUniqueLead(soql, 'submission marker', submissionId);
}

async function findLeadByFallbackCriteria(
    params: RouteSalesforceLeadOwnerParams,
): Promise<SalesforceLeadRecord | null> {
    const safeEmail = params.email?.trim();
    if (!safeEmail) return null;

    const conditions = [
        `Email = '${escapeSoqlLiteral(safeEmail)}'`,
        `LeadSource = '${escapeSoqlLiteral(params.leadSource)}'`,
        `RecordTypeId = '${CUSTOMER_LEAD_RECORD_TYPE_ID}'`,
        `Destination_State__c = '${escapeSoqlLiteral(params.destinationStateCode)}'`,
        `CreatedDate >= ${formatSoqlDateTime(params.submissionStartedAt)}`,
    ];

    if (params.selectedAgentId) {
        conditions.push(`WebFormAgentId__c = '${escapeSoqlLiteral(params.selectedAgentId)}'`);
    }

    if (params.selectedLenderId) {
        conditions.push(`WebFormLenderId__c = '${escapeSoqlLiteral(params.selectedLenderId)}'`);
    }

    const soql = `
        SELECT Id, OwnerId, Owner.Name
        FROM Lead
        WHERE ${conditions.join(' AND ')}
        ORDER BY CreatedDate DESC
        LIMIT 2
    `.replace(/\s+/g, ' ').trim();

    return findUniqueLead(soql, 'fallback criteria', params.submissionId);
}

async function findUniqueLead(
    soql: string,
    lookupType: string,
    submissionId: string,
): Promise<SalesforceLeadRecord | null> {
    const records = await runSalesforceQuery<SalesforceLeadRecord>(soql);

    if (records.length === 0) {
        return null;
    }

    if (records.length > 1) {
        throw new Error(`Ambiguous Salesforce Lead lookup for submission ${submissionId} using ${lookupType}`);
    }

    return records[0];
}

async function fetchLeadOwner(leadId: string): Promise<SalesforceLeadRecord> {
    const safeLeadId = escapeSoqlLiteral(leadId);
    const soql = `
        SELECT Id, OwnerId, Owner.Name
        FROM Lead
        WHERE Id = '${safeLeadId}'
        LIMIT 1
    `.replace(/\s+/g, ' ').trim();

    const records = await runSalesforceQuery<SalesforceLeadRecord>(soql);
    const lead = records[0];
    if (!lead) throw new Error(`Unable to requery Salesforce Lead owner for ${leadId}`);
    return lead;
}

async function waitForLeadOwnerConfirmation(
    leadId: string,
    owner: SalesforceLeadOwner,
    submissionId: string,
): Promise<SalesforceLeadRecord> {
    const deadline = Date.now() + OWNER_CONFIRM_TIMEOUT_MS;
    let lastLead: SalesforceLeadRecord | null = null;

    while (Date.now() <= deadline) {
        lastLead = await fetchLeadOwner(leadId);
        if (lastLead.OwnerId === owner.ownerId) return lastLead;
        await delay(OWNER_CONFIRM_INTERVAL_MS);
    }

    throw new Error(
        `Salesforce Lead OwnerId confirmation mismatch for ${leadId}: expected ${owner.ownerId}, received ${lastLead?.OwnerId || '(missing)'}`,
    );
}

async function patchLeadOwner(
    leadId: string,
    owner: SalesforceLeadOwner,
    submissionId: string,
): Promise<void> {
    const response = await runSalesforceRequestWithRefresh({
        endpoint: salesforceEndpoint(`/sobjects/Lead/${encodeURIComponent(leadId)}`),
        type: RequestType.PATCH,
        data: { OwnerId: owner.ownerId },
        customHeader: {
            'Sforce-Auto-Assign': 'FALSE',
        },
    });

    if (response?.status !== 204 && response?.status !== 200) {
        logError('Salesforce Lead owner PATCH failed', {
            submissionId,
            leadId,
            ownerId: owner.ownerId,
            status: response?.status,
            responseData: response?.data,
        });
        throw new Error(`Salesforce Lead owner PATCH failed with status ${response?.status || 'unknown'}`);
    }
}

async function runSalesforceQuery<T>(soql: string): Promise<T[]> {
    const response = await runSalesforceRequestWithRefresh({
        endpoint: salesforceEndpoint(`/query?q=${encodeURIComponent(soql)}`),
        type: RequestType.GET,
    });

    if (response?.status !== 200) {
        throw new Error(`Salesforce Lead owner query failed with status ${response?.status || 'unknown'}`);
    }

    return response.data?.records ?? [];
}

async function runSalesforceRequestWithRefresh(params: {
    endpoint: string;
    type: RequestType;
    data?: unknown;
    customHeader?: Record<string, string>;
}) {
    let response = await salesForceAPI(params);

    if (response?.status === 401) {
        await getSalesforceToken();
        response = await salesForceAPI(params);
    }

    return response;
}

function salesforceEndpoint(path: string): string {
    if (!SALESFORCE_BASE_URL || !SALESFORCE_API_VERSION) {
        throw new Error('Salesforce base URL or API version is not configured');
    }

    return `${SALESFORCE_BASE_URL}/services/data/${SALESFORCE_API_VERSION}${path}`;
}

function formatSoqlDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
