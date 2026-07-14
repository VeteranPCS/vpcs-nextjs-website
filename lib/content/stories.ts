import 'server-only';

// Typed loader for the Stories section's repo-committed content
// (content/_data/site/video_success_stories.json), replacing the Sanity fetch
// in services/storiesService. Validation runs at module load and throws, so a
// bad export fails the build (pattern: lib/content/about.ts).

import videoSuccessStoriesJson from '@/content/_data/site/video_success_stories.json';
import {
  requireDocArray,
  requirePortableText,
  requireString,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type VideoSuccessStoryDoc = {
  _id: string;
  _type: 'video_success_stories';
  _createdAt: string;
  _updatedAt: string;
  title: string;
  videoUrl: string;
  description: PortableTextBlock[];
};

function validateVideoSuccessStories(raw: unknown): readonly VideoSuccessStoryDoc[] {
  const file = 'video_success_stories.json';
  return requireDocArray(file, raw, 'video_success_stories').map((doc): VideoSuccessStoryDoc => ({
    _id: requireString(file, doc, '_id'),
    _type: 'video_success_stories',
    _createdAt: requireString(file, doc, '_createdAt'),
    _updatedAt: requireString(file, doc, '_updatedAt'),
    title: requireString(file, doc, 'title'),
    videoUrl: requireString(file, doc, 'videoUrl'),
    description: requirePortableText(file, doc, 'description'),
  }));
}

export const VIDEO_SUCCESS_STORIES = validateVideoSuccessStories(videoSuccessStoriesJson);

// Only import __testables from tests.
export const __testables = { validateVideoSuccessStories };
