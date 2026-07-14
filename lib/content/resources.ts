import 'server-only';

// Typed loaders for the PCS Resources page's repo-committed content
// (content/_data/site/life_resources.json, trusted_resources.json), replacing
// the Sanity fetches in services/resourcesService. Validation runs at module
// load and throws, so a bad export fails the build instead of silently
// rendering a broken page (pattern: lib/content/about.ts).

import lifeResourcesJson from '@/content/_data/site/life_resources.json';
import trustedResourcesJson from '@/content/_data/site/trusted_resources.json';
import {
  requireDocArray,
  requireImage,
  requireString,
  type ContentImage,
} from '@/lib/content/loader';

export type LifeResourceDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  name: string;
  description: string;
  url: string;
  logo: ContentImage;
};

export type TrustedResourceDoc = {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  name: string;
  /** Some trusted resources have no site to link to; the card renders unlinked. */
  url?: string;
  logo: ContentImage;
};

function validateLifeResources(raw: unknown): readonly LifeResourceDoc[] {
  const file = 'life_resources.json';
  return requireDocArray(file, raw, 'life_resources').map((doc): LifeResourceDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    name: requireString(file, doc, 'name'),
    description: requireString(file, doc, 'description'),
    url: requireString(file, doc, 'url'),
    logo: requireImage(file, doc, 'logo'),
  }));
}

function validateTrustedResources(raw: unknown): readonly TrustedResourceDoc[] {
  const file = 'trusted_resources.json';
  return requireDocArray(file, raw, 'trusted_resources').map((doc): TrustedResourceDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: requireString(file, doc, '_type'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    name: requireString(file, doc, 'name'),
    url: doc.url === undefined ? undefined : requireString(file, doc, 'url'),
    logo: requireImage(file, doc, 'logo'),
  }));
}

export const LIFE_RESOURCES = validateLifeResources(lifeResourcesJson);

export const TRUSTED_RESOURCES = validateTrustedResources(trustedResourcesJson);

// Only import __testables from tests.
export const __testables = { validateLifeResources, validateTrustedResources };
