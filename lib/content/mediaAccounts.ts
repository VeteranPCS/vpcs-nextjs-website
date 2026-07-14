import 'server-only';

// Typed loader for the media_account repo-committed content
// (content/_data/site/media_account.json), replacing the Sanity fetch in
// services/mediaAccountService. Validation runs at module load and throws, so
// a bad export fails the build instead of silently rendering broken social
// links (pattern: lib/content/about.ts).
//
// Note: `icon` is a plain filename (consumers render `/icon/${icon}` from
// public/icon/), not a Sanity image object — no image conversion here.

import mediaAccountsJson from '@/content/_data/site/media_account.json';
import { requireDocArray, requireString } from '@/lib/content/loader';

export type MediaAccountSlug = { _type: 'slug'; current: string };

export type MediaAccountDoc = {
  _id: string;
  _type: 'media_account';
  _createdAt: string;
  _updatedAt: string;
  name: string;
  /** Icon filename under public/icon/, e.g. "tiktok.svg". */
  icon: string;
  /** Absolute URL of the social profile. */
  link: string;
  slug: MediaAccountSlug;
};

function requireSlug(fileLabel: string, doc: Record<string, unknown>): MediaAccountSlug {
  const value = doc.slug;
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { current?: unknown }).current !== 'string' ||
    (value as { current: string }).current.length === 0
  ) {
    throw new Error(`${fileLabel}: document ${JSON.stringify(doc._id)} is missing slug.current`);
  }
  return { _type: 'slug', current: (value as { current: string }).current };
}

function validateMediaAccounts(raw: unknown): readonly MediaAccountDoc[] {
  const file = 'media_account.json';
  // The Sanity query had no order(); the export keeps Sanity's natural
  // (_id-ascending) return order, so document order here is preserved as-is.
  return requireDocArray(file, raw, 'media_account').map((doc): MediaAccountDoc => {
    const icon = requireString(file, doc, 'icon');
    if (icon.includes('/')) {
      throw new Error(`${file}: document ${JSON.stringify(doc._id)} icon must be a bare filename, got ${JSON.stringify(icon)}`);
    }
    return {
      _id: requireString(file, doc, '_id'),
      _type: 'media_account',
      _createdAt: requireString(file, doc, '_createdAt'),
      _updatedAt: requireString(file, doc, '_updatedAt'),
      name: requireString(file, doc, 'name'),
      icon,
      link: requireString(file, doc, 'link'),
      slug: requireSlug(file, doc),
    };
  });
}

export const MEDIA_ACCOUNTS = validateMediaAccounts(mediaAccountsJson);

// Only import __testables from tests.
export const __testables = { validateMediaAccounts };
