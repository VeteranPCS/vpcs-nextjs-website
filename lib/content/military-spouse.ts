import 'server-only';

// Typed loaders for the Military Spouse page's repo-committed content
// (content/_data/site/military_spouse_employment.json, moving_your_life.json,
// military_spouse_approved.json, approved_company_list.json), replacing the
// Sanity fetches in services/militarySpouseService. Validation runs at module
// load and throws, so a bad export fails the build instead of silently
// rendering a broken page (pattern: lib/content/about.ts).

import militarySpouseEmploymentJson from '@/content/_data/site/military_spouse_employment.json';
import movingYourLifeJson from '@/content/_data/site/moving_your_life.json';
import militarySpouseApprovedJson from '@/content/_data/site/military_spouse_approved.json';
import approvedCompanyListJson from '@/content/_data/site/approved_company_list.json';
import {
  requireDocArray,
  requireImage,
  requirePortableText,
  requireString,
  type ContentImage,
  type PortableTextBlock,
} from '@/lib/content/loader';

/** Shared shape of military_spouse_employment and moving_your_life docs. */
export type MilitarySpousePartnerDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  name: string;
  description: string;
  logo: ContentImage;
  url: string;
};

export type MilitarySpouseApprovedDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  component_title: string;
  header: string;
  description: PortableTextBlock[];
  image: ContentImage;
};

export type ApprovedCompanyDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  name: string;
  image: ContentImage;
};

function validatePartners(
  file: string,
  raw: unknown,
  expectedType: string,
): readonly MilitarySpousePartnerDoc[] {
  return requireDocArray(file, raw, expectedType).map((doc): MilitarySpousePartnerDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    name: requireString(file, doc, 'name'),
    description: requireString(file, doc, 'description'),
    logo: requireImage(file, doc, 'logo'),
    url: requireString(file, doc, 'url'),
  }));
}

function validateMilitarySpouseApproved(raw: unknown): MilitarySpouseApprovedDoc {
  const file = 'military_spouse_approved.json';
  const docs = requireDocArray(file, raw, 'military_spouse_approved');
  const doc = docs[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one military_spouse_approved document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    component_title: requireString(file, doc, 'component_title'),
    header: requireString(file, doc, 'header'),
    description: requirePortableText(file, doc, 'description'),
    image: requireImage(file, doc, 'image'),
  };
}

function validateApprovedCompanies(raw: unknown): readonly ApprovedCompanyDoc[] {
  const file = 'approved_company_list.json';
  return requireDocArray(file, raw, 'approved_company_list').map((doc): ApprovedCompanyDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    name: requireString(file, doc, 'name'),
    image: requireImage(file, doc, 'image'),
  }));
}

export const MILITARY_SPOUSE_EMPLOYMENT = validatePartners(
  'military_spouse_employment.json',
  militarySpouseEmploymentJson,
  'military_spouse_employment',
);

export const MOVING_YOUR_LIFE = validatePartners(
  'moving_your_life.json',
  movingYourLifeJson,
  'moving_your_life',
);

export const MILITARY_SPOUSE_APPROVED = validateMilitarySpouseApproved(militarySpouseApprovedJson);

export const APPROVED_COMPANIES = validateApprovedCompanies(approvedCompanyListJson);

// Only import __testables from tests.
export const __testables = { validatePartners, validateMilitarySpouseApproved, validateApprovedCompanies };
