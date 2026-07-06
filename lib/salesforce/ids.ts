// lib/salesforce/ids.ts
// Central registry of hard-coded Salesforce ids. Never inline these elsewhere
// (enforced by the no-restricted-syntax rule in eslint.config.mjs). The 00N...
// Web-to-Lead field ids are intentionally NOT centralized here (remediation 1.1 scope).

/** Salesforce Org ID — the `oid` field in every Web-to-Lead POST. */
export const SF_ORG_ID = '00D4x000003yaV2';

export const SF_RECORD_TYPE = {
  /** Lead · "Customer" — 18-char form, used in SOQL `RecordTypeId = ...`. */
  CUSTOMER_LEAD: '0124x000000Z5yDAAS',
  /**
   * Lead · "Customer" — 15-char truncation the Web-to-Lead POST bodies send.
   * Salesforce treats 15- and 18-char ids as equal, but the POST wire value
   * must stay 15-char to remain byte-identical (pinned by characterization tests).
   */
  CUSTOMER_LEAD_15: '0124x000000Z5yD',
  /** Opportunity · "Customer" — impact aggregate query. */
  CUSTOMER_OPPORTUNITY: '0124x000000Z7G3AAK',
  /** Lead · "Agent Listing Request" — get-listed-agents. */
  AGENT_LISTING_LEAD: '0124x000000Z5yI',
  /** Lead · "Lender Listing Request" — get-listed-lenders. */
  LENDER_LISTING_LEAD: '0124x000000ZGGU',
  /** Lead · "Internship Application". */
  INTERNSHIP_LEAD: '0124x000000ZGKv',
} as const;

/** Lead-owner (SF User) ids, keyed by admin routing key. Names live in salesforceLeadOwnerRouting.ts. */
export const SF_LEAD_OWNER = {
  BETH: '0054x000005GsUvAAK',
  JESSICA: '005Rg000004hWojIAE',
  STEPHANIE: '0054x0000082vHgAAI',
  TARA: '005Rg00000BAN0DIAX',
} as const;
