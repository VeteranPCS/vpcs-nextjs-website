import 'server-only';

// Typed loaders for the How It Works section's repo-committed content
// (content/_data/site/how_veterence_pcs_works.json, moveInBonus.json),
// replacing the Sanity fetches in services/howItWorksService. Validation runs
// at module load and throws, so a bad export fails the build instead of
// silently rendering a broken page (pattern: lib/content/about.ts).

import howVeterencePcsWorksJson from '@/content/_data/site/how_veterence_pcs_works.json';
import moveInBonusJson from '@/content/_data/site/moveInBonus.json';
import {
  requireDocArray,
  requirePortableText,
  requireString,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type HowItWorksSlug = {
  _type: string;
  current: string;
};

export type HowItWorksSectionDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  component_header: PortableTextBlock[];
  description: PortableTextBlock[];
  header_slug: HowItWorksSlug;
};

export type MoveInBonusTableRow = {
  _key: string;
  priceRange: string;
  moveInBonus: string;
  charityDonation: string;
};

export type MoveInBonusDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  title: string;
  description: PortableTextBlock[];
  requirements: PortableTextBlock[];
  bonusTable: MoveInBonusTableRow[];
};

// header_slugs the /how-it-works components fetch; all must exist.
const REQUIRED_SECTION_SLUGS = [
  'how-veteranpcs-works',
  'how-the-veteranpcs-service-works',
  'who-is-eligible-for-the-move-in-bonus',
  'how-it-works-for-agents',
  'how-it-works-for-mortgage-loan-officers',
  'what-makes-us-different',
  'what-charities-do-you-support',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireSlug(
  file: string,
  doc: Record<string, unknown>,
  field: string,
): HowItWorksSlug {
  const value = doc[field];
  if (!isRecord(value) || typeof value._type !== 'string' || typeof value.current !== 'string' || value.current.length === 0) {
    throw new Error(`${file}: document ${JSON.stringify(doc._id)} is missing slug field "${field}"`);
  }
  return { _type: value._type, current: value.current };
}

function validateHowItWorksSections(raw: unknown): readonly HowItWorksSectionDoc[] {
  const file = 'how_veterence_pcs_works.json';
  const sections = requireDocArray(file, raw, 'how_veterence_pcs_works').map((doc): HowItWorksSectionDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    component_header: requirePortableText(file, doc, 'component_header'),
    description: requirePortableText(file, doc, 'description'),
    header_slug: requireSlug(file, doc, 'header_slug'),
  }));
  for (const slug of REQUIRED_SECTION_SLUGS) {
    if (!sections.some((section) => section.header_slug.current === slug)) {
      throw new Error(`${file}: missing required header_slug "${slug}"`);
    }
  }
  return sections;
}

function validateBonusTable(
  file: string,
  doc: Record<string, unknown>,
  field: string,
): MoveInBonusTableRow[] {
  const value = doc[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file}: document ${JSON.stringify(doc._id)} is missing table field "${field}"`);
  }
  return value.map((row, index): MoveInBonusTableRow => {
    if (
      !isRecord(row) ||
      typeof row._key !== 'string' ||
      typeof row.priceRange !== 'string' ||
      typeof row.moveInBonus !== 'string' ||
      typeof row.charityDonation !== 'string'
    ) {
      throw new Error(`${file}: document ${JSON.stringify(doc._id)} has an invalid row at "${field}"[${index}]`);
    }
    return {
      _key: row._key,
      priceRange: row.priceRange,
      moveInBonus: row.moveInBonus,
      charityDonation: row.charityDonation,
    };
  });
}

function validateMoveInBonus(raw: unknown): MoveInBonusDoc {
  const file = 'moveInBonus.json';
  const docs = requireDocArray(file, raw, 'moveInBonus');
  const doc = docs[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one moveInBonus document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    title: requireString(file, doc, 'title'),
    description: requirePortableText(file, doc, 'description'),
    requirements: requirePortableText(file, doc, 'requirements'),
    bonusTable: validateBonusTable(file, doc, 'bonusTable'),
  };
}

export const HOW_IT_WORKS_SECTIONS = validateHowItWorksSections(howVeterencePcsWorksJson);

const HOW_IT_WORKS_SECTION_BY_SLUG: ReadonlyMap<string, HowItWorksSectionDoc> = new Map(
  HOW_IT_WORKS_SECTIONS.map((section) => [section.header_slug.current, section]),
);

export function getHowItWorksSection(slug: string): HowItWorksSectionDoc | null {
  return HOW_IT_WORKS_SECTION_BY_SLUG.get(slug) ?? null;
}

export const MOVE_IN_BONUS = validateMoveInBonus(moveInBonusJson);

// Only import __testables from tests.
export const __testables = { validateHowItWorksSections, validateMoveInBonus };
