import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import memberInfoJson from '@/content/_data/site/member_info.json';
import { TEAM_BIOS } from '@/components/About/teamBios';
import { requireDocArray, requirePortableText, requireString } from '@/lib/content/loader';
import { semanticsFromHtml, semanticsFromPortableText } from './portable-text-semantics';

// Parity gate for the hand-transcribed bios in components/About/teamBios.tsx:
// each bio's rendered JSX must carry the same semantics as the Portable Text
// export in content/_data/site/member_info.json. A failure here means the JSX
// transcription drifted from the exported copy - fix the JSX, not the test.

const MEMBERS = requireDocArray('member_info.json', memberInfoJson, 'member_info').map((doc) => ({
  _id: requireString('member_info.json', doc, '_id'),
  name: requireString('member_info.json', doc, 'name'),
  description: requirePortableText('member_info.json', doc, 'description'),
}));

describe('About team bios parity (teamBios.tsx vs member_info.json export)', () => {
  it('has exactly one transcribed bio per exported member', () => {
    expect(Object.keys(TEAM_BIOS).sort()).toEqual(MEMBERS.map((member) => member._id).sort());
  });

  for (const member of MEMBERS) {
    it(`matches the exported Portable Text for ${member.name}`, () => {
      const bio = TEAM_BIOS[member._id];
      expect(bio).toBeDefined();
      const html = renderToStaticMarkup(<>{bio}</>);
      expect(semanticsFromHtml(html)).toEqual(semanticsFromPortableText(member.description));
    });
  }
});
