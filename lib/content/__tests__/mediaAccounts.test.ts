import { existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// lib/content/mediaAccounts is server-only; stub the marker package so the
// loader can run under Vitest's node environment (same approach as states.test.ts).
vi.mock('server-only', () => ({}));

import mediaAccountsJson from '@/content/_data/site/media_account.json';
import { MEDIA_ACCOUNTS, __testables } from '@/lib/content/mediaAccounts';

const { validateMediaAccounts } = __testables;

// A minimal well-formed doc for the failure-case tests.
const validDoc = {
  _id: 'doc-tiktok',
  _type: 'media_account',
  _createdAt: '2024-12-10T04:48:43Z',
  _updatedAt: '2025-01-10T06:51:25Z',
  icon: 'tiktok.svg',
  link: 'https://www.tiktok.com/@veteranpcs',
  name: 'TikTok',
  slug: { _type: 'slug', current: 'tiktok' },
};

describe('validateMediaAccounts', () => {
  it('accepts the committed export and keeps every document in export order', () => {
    const docs = validateMediaAccounts(mediaAccountsJson);
    expect(docs.length).toBe((mediaAccountsJson as unknown[]).length);
    expect(docs.length).toBeGreaterThan(0);
    // The Sanity query had no order(); document order must match the export.
    expect(docs.map((doc) => doc._id)).toEqual(
      (mediaAccountsJson as { _id: string }[]).map((doc) => doc._id),
    );
  });

  it('throws on a missing name', () => {
    const { name: _dropped, ...broken } = validDoc;
    expect(() => validateMediaAccounts([broken])).toThrow(/name/);
  });

  it('throws on a missing icon', () => {
    const { icon: _dropped, ...broken } = validDoc;
    expect(() => validateMediaAccounts([broken])).toThrow(/icon/);
  });

  it('throws on an icon that is not a bare filename', () => {
    expect(() => validateMediaAccounts([{ ...validDoc, icon: '/icon/tiktok.svg' }])).toThrow(
      /bare filename/,
    );
  });

  it('throws on a missing link', () => {
    const { link: _dropped, ...broken } = validDoc;
    expect(() => validateMediaAccounts([broken])).toThrow(/link/);
  });

  it('throws on a missing slug.current', () => {
    expect(() => validateMediaAccounts([{ ...validDoc, slug: {} }])).toThrow(/slug/);
  });

  it('throws on a wrong _type', () => {
    expect(() => validateMediaAccounts([{ ...validDoc, _type: 'member_info' }])).toThrow(/_type/);
  });
});

describe('MEDIA_ACCOUNTS', () => {
  // Consumers (KeepInTouch, ContactForm) render `/icon/${icon}`; this is the
  // build-time guarantee every referenced icon actually exists under
  // public/icon/ (pattern: states.test.ts state_map disk check).
  it('every icon resolves to a real file under public/icon/, without traversal', () => {
    const iconDir = resolve(process.cwd(), 'public', 'icon');
    for (const doc of MEDIA_ACCOUNTS) {
      const resolved = resolve(iconDir, doc.icon);
      expect(
        resolved.startsWith(iconDir + sep),
        `${doc.icon} must stay inside public/icon/`,
      ).toBe(true);
      expect(existsSync(resolved), `${doc.icon} missing on disk`).toBe(true);
      expect(statSync(resolved).size, `${doc.icon} is empty`).toBeGreaterThan(0);
    }
  });

  it('every link is an absolute https URL', () => {
    for (const doc of MEDIA_ACCOUNTS) {
      expect(doc.link, `${doc.name} link`).toMatch(/^https:\/\//);
    }
  });
});
