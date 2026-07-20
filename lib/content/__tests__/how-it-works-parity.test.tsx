import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// lib/content/how-it-works is server-only; stub the marker package so the
// loader can run under Vitest's Node environment (pattern: states.test.ts).
vi.mock('server-only', () => ({}));

import {
  FAQ_JSONLD,
  HOW_IT_WORKS_CONTENT,
  MOVE_IN_BONUS_CONTENT,
} from '@/components/HowItWork/HowItWorksDetails/howItWorksContent';
import { HOW_IT_WORKS_SECTIONS, MOVE_IN_BONUS } from '@/lib/content/how-it-works';
import type { PortableTextBlock } from '@/lib/content/loader';
import { semanticsFromHtml, semanticsFromPortableText } from './portable-text-semantics';

// Parity gate for the hand-transcribed How It Works section bodies in
// components/HowItWork/HowItWorksDetails/howItWorksContent.tsx: each body's
// rendered JSX must carry the same semantics (blocks, list containers, links,
// strong/em) as the Portable Text export in
// content/_data/site/how_veterence_pcs_works.json / moveInBonus.json. A
// failure here means the JSX transcription drifted from the exported copy -
// fix the JSX (or deliberately update both sides), not the test.

// The hero document (slug how-veteranpcs-works) is deliberately excluded from
// the contract: HowItWorkHeroSection renders it from the loader directly, so
// only the six body documents are transcribed.
const HERO_ID = '845ffc52-f46f-4aad-8c7e-b1b3571c698f';

const SECTION_BY_ID = new Map(HOW_IT_WORKS_SECTIONS.map((doc) => [doc._id, doc]));

function joinedHeaderText(header: PortableTextBlock[]): string {
  return header
    .map((block) => block.children.map((child) => child.text).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('How It Works parity (howItWorksContent.tsx vs how_veterence_pcs_works.json export)', () => {
  it('transcribes exactly the six body documents; the JSON adds only the hero', () => {
    const transcribedIds = Object.keys(HOW_IT_WORKS_CONTENT).sort();
    expect(transcribedIds).toHaveLength(6);
    const exportedIds = HOW_IT_WORKS_SECTIONS.map((doc) => doc._id).sort();
    expect(exportedIds).toEqual([...transcribedIds, HERO_ID].sort());
    expect(SECTION_BY_ID.get(HERO_ID)?.header_slug.current).toBe('how-veteranpcs-works');
  });

  for (const entry of Object.values(HOW_IT_WORKS_CONTENT)) {
    describe(entry.slug, () => {
      it('matches the exported document slug and joined component_header text', () => {
        const doc = SECTION_BY_ID.get(entry.id);
        expect(doc).toBeDefined();
        if (!doc) return;
        expect(entry.slug).toBe(doc.header_slug.current);
        expect(entry.title).toBe(joinedHeaderText(doc.component_header));
      });

      it('matches the exported Portable Text semantics', () => {
        const doc = SECTION_BY_ID.get(entry.id);
        expect(doc).toBeDefined();
        if (!doc) return;
        const html = renderToStaticMarkup(<>{entry.body}</>);
        expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(doc.description));
      });
    });
  }
});

describe('Move-In Bonus parity (MOVE_IN_BONUS_CONTENT vs moveInBonus.json export)', () => {
  // The bonus table is NOT transcribed: it renders from MOVE_IN_BONUS.bonusTable
  // loader data (and is covered by the calculator invariant test in
  // components/PcsResources/MovingBonusCalculator/__tests__), so only the
  // description and requirements Portable Text is parity-gated here.
  it('description matches the exported Portable Text semantics', () => {
    const html = renderToStaticMarkup(<>{MOVE_IN_BONUS_CONTENT.description}</>);
    expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(MOVE_IN_BONUS.description));
  });

  it('requirements match the exported Portable Text semantics', () => {
    const html = renderToStaticMarkup(<>{MOVE_IN_BONUS_CONTENT.requirements}</>);
    expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(MOVE_IN_BONUS.requirements));
  });
});

function decodeEntities(text: string): string {
  return text
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Tag-stripped, whitespace-normalized text of a rendered ReactNode. */
function renderedText(node: React.ReactNode): string {
  return decodeEntities(renderToStaticMarkup(<>{node}</>).replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

// Every FAQ_JSONLD answer must exist verbatim (as one contiguous block) in the
// server-rendered section copy, so the JSON-LD never claims copy the page does
// not show. Searched surface: all six transcribed bodies plus the Move-In
// Bonus description and requirements.
const RENDERED_COPY: ReadonlyArray<{ label: string; text: string }> = [
  ...Object.values(HOW_IT_WORKS_CONTENT).map((entry) => ({
    label: entry.slug,
    text: renderedText(entry.body),
  })),
  { label: 'moveInBonus description', text: renderedText(MOVE_IN_BONUS_CONTENT.description) },
  { label: 'moveInBonus requirements', text: renderedText(MOVE_IN_BONUS_CONTENT.requirements) },
];

describe('FAQ_JSONLD consistency (howItWorksContent.tsx)', () => {
  it('has non-empty, unique questions', () => {
    const questions = FAQ_JSONLD.map((pair) => pair.question.trim());
    for (const question of questions) {
      expect(question).not.toBe('');
    }
    expect(new Set(questions).size).toBe(questions.length);
  });

  for (const pair of FAQ_JSONLD) {
    describe(`"${pair.question}"`, () => {
      it('answer appears verbatim in the rendered section copy', () => {
        const answer = pair.answer.replace(/\s+/g, ' ').trim();
        expect(answer).not.toBe('');
        const matches = RENDERED_COPY.filter((section) => section.text.includes(answer));
        expect(
          matches.length,
          `answer not found contiguously in any rendered section: "${answer}"`,
        ).toBeGreaterThan(0);
      });

      it('answer contains no em-dash and no "15%"', () => {
        expect(pair.answer).not.toMatch(/—/);
        expect(pair.answer).not.toContain('15%');
      });
    });
  }
});
