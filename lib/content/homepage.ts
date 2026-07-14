import 'server-only';

// Typed loaders for the homepage//spanish surfaces' repo-committed content
// (content/_data/site/support_veterence.json, users.json,
// real_state_agents.json), replacing the Sanity fetches in
// services/veterenceSupportService, services/userService, and
// services/agentService.fetchLogosList. Validation runs at module load and
// throws, so a bad export fails the build instead of silently rendering a
// broken page (pattern: lib/content/about.ts).

import realStateAgentsJson from '@/content/_data/site/real_state_agents.json';
import supportVeterenceJson from '@/content/_data/site/support_veterence.json';
import usersJson from '@/content/_data/site/users.json';
import {
  requireDocArray,
  requireImage,
  requirePortableText,
  requireString,
  type ContentImage,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type SupportVeterenceDoc = {
  _id: string;
  slug: string;
  title: string;
  button_text: string;
  /** Portable Text export; rendered copy lives in components/homepage/supportVeterenceContent.tsx. */
  description: PortableTextBlock[];
  /** Portable Text export; rendered copy lives in components/homepage/supportVeterenceContent.tsx. */
  points: PortableTextBlock[];
  icon: ContentImage;
  image: ContentImage;
};

export type UserDoc = {
  _id: string;
  title: string;
  userImage: ContentImage;
};

export type RealStateAgentDoc = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  title: string;
  url: string;
  publishedAt: string;
  mainImage: ContentImage;
};

// component_slug values the pages pass to FamilySupport/VeteranCommunity; all
// three must exist. The export also carries a fourth, orphaned document
// ("support-veterans-and-their-families") that no page references.
const REQUIRED_SUPPORT_SLUGS = [
  'support-our-veteran-community',
  'support-our-veteran-community-spanish',
  'freedom-service-dogs',
] as const;

function requireSlug(fileLabel: string, doc: Record<string, unknown>): string {
  const value = doc.slug;
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { current?: unknown }).current !== 'string'
  ) {
    throw new Error(`${fileLabel}: document ${JSON.stringify(doc._id)} is missing slug.current`);
  }
  return (value as { current: string }).current;
}

function validateSupportVeterence(raw: unknown): readonly SupportVeterenceDoc[] {
  const file = 'support_veterence.json';
  const docs = requireDocArray(file, raw, 'support_veterence').map((doc): SupportVeterenceDoc => ({
    _id: requireString(file, doc, '_id'),
    slug: requireSlug(file, doc),
    title: requireString(file, doc, 'title'),
    button_text: requireString(file, doc, 'button_text'),
    description: requirePortableText(file, doc, 'description'),
    points: requirePortableText(file, doc, 'points'),
    icon: requireImage(file, doc, 'icon'),
    image: requireImage(file, doc, 'image'),
  }));
  for (const slug of REQUIRED_SUPPORT_SLUGS) {
    if (!docs.some((doc) => doc.slug === slug)) {
      throw new Error(`${file}: missing required slug "${slug}"`);
    }
  }
  return docs;
}

function validateUsers(raw: unknown): readonly UserDoc[] {
  const file = 'users.json';
  return requireDocArray(file, raw, 'users').map((doc): UserDoc => ({
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    userImage: requireImage(file, doc, 'userImage'),
  }));
}

function validateRealStateAgents(raw: unknown): readonly RealStateAgentDoc[] {
  const file = 'real_state_agents.json';
  return requireDocArray(file, raw, 'real_state_agents').map((doc): RealStateAgentDoc => ({
    _id: requireString(file, doc, '_id'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    title: requireString(file, doc, 'title'),
    url: requireString(file, doc, 'url'),
    publishedAt: requireString(file, doc, 'publishedAt'),
    mainImage: requireImage(file, doc, 'mainImage'),
  }));
}

export const SUPPORT_VETERENCE = validateSupportVeterence(supportVeterenceJson);

const SUPPORT_VETERENCE_BY_SLUG: ReadonlyMap<string, SupportVeterenceDoc> = new Map(
  SUPPORT_VETERENCE.map((doc) => [doc.slug, doc]),
);

export function getSupportVeterence(slug: string): SupportVeterenceDoc | null {
  return SUPPORT_VETERENCE_BY_SLUG.get(slug) ?? null;
}

export const USERS = validateUsers(usersJson);

export const REAL_STATE_AGENTS = validateRealStateAgents(realStateAgentsJson);

// Only import __testables from tests.
export const __testables = { validateSupportVeterence, validateUsers, validateRealStateAgents };
