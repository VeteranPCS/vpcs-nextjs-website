import 'server-only';

// Typed loaders for the cross-page "common" content
// (content/_data/site/frequently_asked_questions.json, video_review.json),
// replacing the Sanity fetches in services/commonServices. Validation runs at
// module load and throws, so a bad export fails the build
// (pattern: lib/content/about.ts).

import frequentlyAskedQuestionsJson from '@/content/_data/site/frequently_asked_questions.json';
import videoReviewJson from '@/content/_data/site/video_review.json';
import {
  requireDocArray,
  requirePortableText,
  requireString,
  type PortableTextBlock,
} from '@/lib/content/loader';

export type FrequentlyAskedQuestionDoc = {
  _id: string;
  question: string;
  /**
   * Portable Text export of the answer; rendered copy lives in
   * components/stories/FrequentlyAskedQuestions/faqContent.tsx.
   */
  answer: PortableTextBlock[];
};

export type VideoReviewDoc = {
  _id: string;
  title: string;
  videoUrl: string;
};

function validateFrequentlyAskedQuestions(raw: unknown): readonly FrequentlyAskedQuestionDoc[] {
  const file = 'frequently_asked_questions.json';
  return requireDocArray(file, raw, 'frequently_asked_questions').map((doc): FrequentlyAskedQuestionDoc => ({
    _id: requireString(file, doc, '_id'),
    question: requireString(file, doc, 'question'),
    answer: requirePortableText(file, doc, 'answer'),
  }));
}

function validateVideoReview(raw: unknown): VideoReviewDoc {
  const file = 'video_review.json';
  const doc = requireDocArray(file, raw, 'video_review')[0];
  if (!doc) {
    throw new Error(`${file}: expected at least one video_review document`);
  }
  return {
    _id: requireString(file, doc, '_id'),
    title: requireString(file, doc, 'title'),
    videoUrl: requireString(file, doc, 'videoUrl'),
  };
}

export const FREQUENTLY_ASKED_QUESTIONS = validateFrequentlyAskedQuestions(frequentlyAskedQuestionsJson);

export const VIDEO_REVIEW = validateVideoReview(videoReviewJson);

// Only import __testables from tests.
export const __testables = { validateFrequentlyAskedQuestions, validateVideoReview };
