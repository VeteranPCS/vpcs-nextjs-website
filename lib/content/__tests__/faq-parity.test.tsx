import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import faqJson from '@/content/_data/site/frequently_asked_questions.json';
import { FAQ_ANSWERS } from '@/components/stories/FrequentlyAskedQuestions/faqContent';
import { requireDocArray, requirePortableText, requireString } from '@/lib/content/loader';
import { semanticsFromHtml, semanticsFromPortableText } from './portable-text-semantics';

// Parity gate for the hand-transcribed FAQ answers in
// components/stories/FrequentlyAskedQuestions/faqContent.tsx: each answer's
// rendered JSX must carry the same semantics as the Portable Text export in
// content/_data/site/frequently_asked_questions.json. A failure here means
// the JSX transcription drifted from the exported copy - fix the JSX, not the
// test.

const FAQS = requireDocArray('frequently_asked_questions.json', faqJson, 'frequently_asked_questions').map((doc) => ({
  _id: requireString('frequently_asked_questions.json', doc, '_id'),
  question: requireString('frequently_asked_questions.json', doc, 'question'),
  answer: requirePortableText('frequently_asked_questions.json', doc, 'answer'),
}));

describe('FAQ answers parity (faqContent.tsx vs frequently_asked_questions.json export)', () => {
  it('has exactly one transcribed answer per exported question', () => {
    expect(Object.keys(FAQ_ANSWERS).sort()).toEqual(FAQS.map((faq) => faq._id).sort());
  });

  for (const faq of FAQS) {
    it(`matches the exported Portable Text for "${faq.question}"`, () => {
      const answer = FAQ_ANSWERS[faq._id];
      expect(answer).toBeDefined();
      const html = renderToStaticMarkup(<>{answer}</>);
      expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(faq.answer));
    });
  }
});
