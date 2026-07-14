import 'server-only';

// Typed loaders for the Impact/Charity sections' repo-committed content
// (content/_data/site/additionalSuccessStories.json, impact_page.json,
// stories_poster.json), replacing the Sanity fetches in services/impactService.
// Validation runs at module load and throws, so a bad export fails the build
// instead of silently rendering a broken page (pattern: lib/content/about.ts).

import additionalSuccessStoriesJson from '@/content/_data/site/additionalSuccessStories.json';
import impactPageJson from '@/content/_data/site/impact_page.json';
import storiesPosterJson from '@/content/_data/site/stories_poster.json';
import {
  requireDocArray,
  requireImage,
  requirePortableText,
  requireString,
  type ContentImage,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type AdditionalSuccessStoryDoc = {
  _id: string;
  title: string;
  /** Capital-D field name kept from the Sanity schema; consumers render it as-is. */
  Description: PortableTextBlock[];
  image: ContentImage;
};

export type ImpactOurStoryDoc = {
  _id: string;
  header: string;
  buttonText: string;
  description: PortableTextBlock[];
  foreground_image: ContentImage;
};

export type StoriesPosterDoc = {
  _id: string;
  title: string;
  button_text: string;
  description: PortableTextBlock[];
  poster_1: ContentImage;
  poster_2: ContentImage;
};

function validateAdditionalSuccessStories(raw: unknown): readonly AdditionalSuccessStoryDoc[] {
  const file = 'additionalSuccessStories.json';
  return requireDocArray(file, raw, 'additionalSuccessStories').map((doc): AdditionalSuccessStoryDoc => ({
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    Description: requirePortableText(file, doc, 'Description'),
    image: requireImage(file, doc, 'image'),
  }));
}

function validateImpactOurStory(raw: unknown): ImpactOurStoryDoc {
  const file = 'impact_page.json';
  const doc = requireDocArray(file, raw, 'impact_page')[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one impact_page document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    header: requireString(file, doc, 'header'),
    buttonText: requireString(file, doc, 'buttonText'),
    description: requirePortableText(file, doc, 'description'),
    foreground_image: requireImage(file, doc, 'foreground_image'),
  };
}

function validateStoriesPoster(raw: unknown): StoriesPosterDoc {
  const file = 'stories_poster.json';
  const doc = requireDocArray(file, raw, 'stories_poster')[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one stories_poster document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    button_text: requireString(file, doc, 'button_text'),
    description: requirePortableText(file, doc, 'description'),
    poster_1: requireImage(file, doc, 'poster_1'),
    poster_2: requireImage(file, doc, 'poster_2'),
  };
}

export const ADDITIONAL_SUCCESS_STORIES = validateAdditionalSuccessStories(additionalSuccessStoriesJson);

export const IMPACT_OUR_STORY = validateImpactOurStory(impactPageJson);

export const STORIES_POSTER = validateStoriesPoster(storiesPosterJson);

// Only import __testables from tests.
export const __testables = { validateAdditionalSuccessStories, validateImpactOurStory, validateStoriesPoster };
