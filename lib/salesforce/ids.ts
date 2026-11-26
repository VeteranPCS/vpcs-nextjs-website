import productionMetadata from '@/config/salesforce/production.json';

// Legacy builder aliases use the established production wire values. Runtime
// transports resolve these aliases to IDs in the active Salesforce manifest.
export const SF_ORG_ID = productionMetadata.orgId;
export const SF_RECORD_TYPE = Object.freeze(productionMetadata.recordTypes);
export const SF_LEAD_OWNER = Object.freeze(productionMetadata.leadOwners);
export const SF_WEB_TO_LEAD_FIELD_IDS = Object.freeze(productionMetadata.fieldIds);
