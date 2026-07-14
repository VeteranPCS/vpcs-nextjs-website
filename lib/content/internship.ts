import 'server-only';

// Typed loaders for the Internship page's repo-committed content
// (content/_data/site/internship_action.json, internship_benefits.json,
// internship_offer.json), replacing the Sanity fetches in
// services/internshipPageService. Validation runs at module load and throws,
// so a bad export fails the build instead of silently rendering a broken page
// (pattern: lib/content/about.ts).

import internshipActionJson from '@/content/_data/site/internship_action.json';
import internshipBenefitsJson from '@/content/_data/site/internship_benefits.json';
import internshipOfferJson from '@/content/_data/site/internship_offer.json';
import {
  requireDocArray,
  requireImage,
  requirePortableText,
  requireString,
  type ContentImage,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type InternshipActionDoc = {
  _id: string;
  title: string;
  description: string;
  action_image: ContentImage;
};

export type InternshipBenefitsDoc = {
  _id: string;
  title: string;
  description: PortableTextBlock[];
  logo: ContentImage;
};

export type InternshipOfferDoc = {
  _id: string;
  title: string;
  details: string;
  button_text: string;
};

function validateInternshipActions(raw: unknown): readonly InternshipActionDoc[] {
  const file = 'internship_action.json';
  return requireDocArray(file, raw, 'internship_action').map((doc): InternshipActionDoc => ({
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    description: requireString(file, doc, 'description'),
    action_image: requireImage(file, doc, 'action_image'),
  }));
}

function validateInternshipBenefits(raw: unknown): InternshipBenefitsDoc {
  const file = 'internship_benefits.json';
  const docs = requireDocArray(file, raw, 'internship_benefits');
  const doc = docs[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one internship_benefits document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    description: requirePortableText(file, doc, 'description'),
    logo: requireImage(file, doc, 'logo'),
  };
}

function validateInternshipOffer(raw: unknown): InternshipOfferDoc {
  const file = 'internship_offer.json';
  const docs = requireDocArray(file, raw, 'internship_offer');
  const doc = docs[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one internship_offer document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    details: requireString(file, doc, 'details'),
    button_text: requireString(file, doc, 'button_text'),
  };
}

export const INTERNSHIP_ACTIONS = validateInternshipActions(internshipActionJson);

export const INTERNSHIP_BENEFITS = validateInternshipBenefits(internshipBenefitsJson);

export const INTERNSHIP_OFFER = validateInternshipOffer(internshipOfferJson);

// Only import __testables from tests.
export const __testables = { validateInternshipActions, validateInternshipBenefits, validateInternshipOffer };
