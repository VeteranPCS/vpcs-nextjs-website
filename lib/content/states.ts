import 'server-only';

// Typed loader for the state_list repo-committed content
// (content/_data/site/state_list.json), replacing the Sanity fetches in
// services/stateService (fetchStateList / fetchStateDetails / fetchStateImage).
// Validation runs at module load and throws, so a bad export fails the build
// instead of silently rendering a broken page (pattern: lib/content/about.ts).

import stateListJson from '@/content/_data/site/state_list.json';
import {
  requireDocArray,
  requireImage,
  requireString,
  type ContentImage,
} from '@/lib/content/loader';

export type StateSlug = { _type: 'slug'; current: string };

export type StateListDoc = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  short_name: string;
  state_name: string;
  state_slug: StateSlug;
  /** State map image; path points at the committed file in public/images/states/. */
  state_map: ContentImage;
};

function requireStateSlug(fileLabel: string, doc: Record<string, unknown>): StateSlug {
  const value = doc.state_slug;
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { current?: unknown }).current !== 'string' ||
    (value as { current: string }).current.length === 0
  ) {
    throw new Error(`${fileLabel}: document ${JSON.stringify(doc._id)} is missing state_slug.current`);
  }
  return { _type: 'slug', current: (value as { current: string }).current };
}

function validateStateList(raw: unknown): readonly StateListDoc[] {
  const file = 'state_list.json';
  const docs = requireDocArray(file, raw, 'state_list').map((doc): StateListDoc => ({
    _id: requireString(file, doc, '_id'),
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    short_name: requireString(file, doc, 'short_name'),
    state_name: requireString(file, doc, 'state_name'),
    state_slug: requireStateSlug(file, doc),
    state_map: requireImage(file, doc, 'state_map'),
  }));
  // The Sanity-era fetchStateList silently deduped rows by short_name; with the
  // data frozen in the repo, a duplicate is a bad export — fail the build instead.
  for (const field of ['short_name', 'state_slug'] as const) {
    const seen = new Set<string>();
    for (const doc of docs) {
      const value = field === 'short_name' ? doc.short_name : doc.state_slug.current;
      if (seen.has(value)) {
        throw new Error(`${file}: duplicate ${field} ${JSON.stringify(value)}`);
      }
      seen.add(value);
    }
  }
  return docs;
}

export const STATE_LIST = validateStateList(stateListJson);

const STATE_BY_SLUG: ReadonlyMap<string, StateListDoc> = new Map(
  STATE_LIST.map((doc) => [doc.state_slug.current, doc]),
);

export function getStateBySlug(slug: string): StateListDoc | null {
  return STATE_BY_SLUG.get(slug) ?? null;
}

// Only import __testables from tests.
export const __testables = { validateStateList };
