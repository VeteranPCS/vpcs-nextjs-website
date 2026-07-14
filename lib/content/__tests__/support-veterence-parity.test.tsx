import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import supportJson from '@/content/_data/site/support_veterence.json';
import { SUPPORT_VETERENCE_CONTENT } from '@/components/homepage/supportVeterenceContent';
import { requireDocArray, requirePortableText, requireString } from '@/lib/content/loader';
import { semanticsFromHtml, semanticsFromPortableText, type Semantics } from './portable-text-semantics';

// Parity gate for the hand-transcribed support blurbs in
// components/homepage/supportVeterenceContent.tsx: each live document's
// rendered JSX must carry the same semantics as the Portable Text export in
// content/_data/site/support_veterence.json. A failure here means the JSX
// transcription drifted from the exported copy - fix the JSX, not the test.

// The export carries a fourth document ("support-veterans-and-their-families")
// that no page references via component_slug; it deliberately has no
// transcription and is excluded from the per-document checks below.
const ORPHAN_SLUG = 'support-veterans-and-their-families';

const FILE = 'support_veterence.json';

const DOCS = requireDocArray(FILE, supportJson, 'support_veterence').map((doc) => {
  const slug = doc.slug as { current?: unknown } | undefined;
  if (typeof slug?.current !== 'string') {
    throw new Error(`${FILE}: document ${JSON.stringify(doc._id)} is missing slug.current`);
  }
  return {
    _id: requireString(FILE, doc, '_id'),
    slug: slug.current,
    description: requirePortableText(FILE, doc, 'description'),
    points: requirePortableText(FILE, doc, 'points'),
  };
});

const LIVE_DOCS = DOCS.filter((doc) => doc.slug !== ORPHAN_SLUG);

// The legacy inline renderer (FamilySupport/SupportContent) ignored
// `listItem`, so bullet point blocks render as plain <p> paragraphs; map the
// expected block kinds accordingly before comparing.
function asLegacyRendered(semantics: Semantics): Semantics {
  return {
    ...semantics,
    blocks: semantics.blocks.map((block) => (block.kind === 'li' ? { ...block, kind: 'p' } : block)),
  };
}

describe('support blurbs parity (supportVeterenceContent.tsx vs support_veterence.json export)', () => {
  it('has exactly one transcription per live document and none for the orphan', () => {
    expect(LIVE_DOCS).toHaveLength(3);
    expect(Object.keys(SUPPORT_VETERENCE_CONTENT).sort()).toEqual(
      LIVE_DOCS.map((doc) => doc._id).sort(),
    );
  });

  for (const doc of LIVE_DOCS) {
    it(`matches the exported description for "${doc.slug}"`, () => {
      const content = SUPPORT_VETERENCE_CONTENT[doc._id];
      expect(content).toBeDefined();
      const html = renderToStaticMarkup(<>{content?.description}</>);
      expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(doc.description));
    });

    it(`matches the exported points for "${doc.slug}"`, () => {
      const content = SUPPORT_VETERENCE_CONTENT[doc._id];
      expect(content).toBeDefined();
      expect(content?.points).toHaveLength(doc.points.length);
      doc.points.forEach((pointBlock, index) => {
        const html = renderToStaticMarkup(<>{content?.points[index]}</>);
        expect(semanticsFromHtml(html)).toEqual(
          asLegacyRendered(semanticsFromPortableText([pointBlock])),
        );
      });
    });
  }
});
