import { existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// lib/content/states is server-only; stub the marker package so the loader can
// run under Vitest's node environment (same approach as app/__tests__/sitemap.test.ts).
vi.mock('server-only', () => ({}));

import stateListJson from '@/content/_data/site/state_list.json';
import { STATE_LIST, getStateBySlug, __testables } from '@/lib/content/states';

const { validateStateList } = __testables;

// A minimal well-formed doc for the failure-case tests.
const validDoc = {
  _id: 'doc-tx',
  _type: 'state_list',
  _createdAt: '2025-03-15T15:30:15Z',
  _updatedAt: '2026-07-10T20:13:40Z',
  short_name: 'TX',
  state_name: 'Texas',
  state_slug: { _type: 'slug', current: 'texas' },
  state_map: { alt: 'Texas', path: '/images/states/texas.webp', width: 750, height: 750 },
};

describe('validateStateList', () => {
  it('accepts the committed export and keeps every document', () => {
    const docs = validateStateList(stateListJson);
    expect(docs.length).toBe((stateListJson as unknown[]).length);
    expect(docs.length).toBeGreaterThan(0);
  });

  it('throws on a missing state_name', () => {
    const { state_name: _dropped, ...broken } = validDoc;
    expect(() => validateStateList([broken])).toThrow(/state_name/);
  });

  it('throws on a missing state_slug.current', () => {
    expect(() => validateStateList([{ ...validDoc, state_slug: {} }])).toThrow(/state_slug/);
  });

  it('throws on an invalid state_map image', () => {
    expect(() =>
      validateStateList([{ ...validDoc, state_map: { alt: 'Texas', path: 'not-a-public-path' } }]),
    ).toThrow(/state_map/);
  });

  it('throws on a duplicate short_name instead of silently deduping', () => {
    const dup = {
      ...validDoc,
      _id: 'doc-tx-2',
      state_slug: { _type: 'slug', current: 'texas-2' },
    };
    expect(() => validateStateList([validDoc, dup])).toThrow(/duplicate short_name/);
  });

  it('throws on a duplicate state_slug', () => {
    const dup = { ...validDoc, _id: 'doc-tx-2', short_name: 'T2' };
    expect(() => validateStateList([validDoc, dup])).toThrow(/duplicate state_slug/);
  });
});

describe('STATE_LIST / getStateBySlug', () => {
  it('has unique short_names and slugs across the committed export', () => {
    const shortNames = new Set(STATE_LIST.map((doc) => doc.short_name));
    const slugs = new Set(STATE_LIST.map((doc) => doc.state_slug.current));
    expect(shortNames.size).toBe(STATE_LIST.length);
    expect(slugs.size).toBe(STATE_LIST.length);
  });

  it('resolves a known slug', () => {
    const texas = getStateBySlug('texas');
    const texasSource = stateListJson.find((doc) => doc.short_name === 'TX');
    expect(texas?.short_name).toBe('TX');
    expect(texas?.state_name).toBe('Texas');
    expect(texas?.state_map.path).toBe(texasSource?.state_map.path);
  });

  it('returns null for an unknown slug', () => {
    expect(getStateBySlug('not-a-state')).toBeNull();
  });

  // The loader validates shape, not the filesystem (it runs in the Next.js
  // server runtime, where fs checks per import would be wasted work). This
  // test is the build-time guarantee that every referenced state map actually
  // exists under public/ — a typo'd path or incomplete export fails CI here
  // instead of shipping broken hero images and OG metadata.
  it('every state_map.path resolves to a real file under public/, without traversal', () => {
    const publicDir = resolve(process.cwd(), 'public');
    for (const doc of STATE_LIST) {
      const { alt, path, width, height } = doc.state_map;
      expect(alt, `${doc.state_slug.current} alt`).not.toBe('');
      expect(width, `${doc.state_slug.current} width`).toBeGreaterThan(0);
      expect(height, `${doc.state_slug.current} height`).toBeGreaterThan(0);
      const resolved = resolve(publicDir, `.${path}`);
      expect(
        resolved.startsWith(publicDir + sep),
        `${path} must stay inside public/`,
      ).toBe(true);
      expect(existsSync(resolved), `${path} missing on disk`).toBe(true);
      expect(statSync(resolved).size, `${path} is empty`).toBeGreaterThan(0);
    }
  });
});
